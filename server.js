const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ANALYTICS_USER = process.env.ANALYTICS_USER || "admin";
const ANALYTICS_PASS = process.env.ANALYTICS_PASS || "spid#";
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(ROOT));

app.get("/", (_, res) => {
  res.sendFile(path.join(ROOT, "idart-landing.html"));
});

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, "[]", "utf8");
  if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]", "utf8");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getRangeStart(range) {
  const now = Date.now();
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return new Date(now - 7 * 24 * 60 * 60 * 1000);
}

function groupByDay(items) {
  const grouped = {};
  items.forEach((item) => {
    const day = item.createdAt.slice(0, 10);
    grouped[day] = (grouped[day] || 0) + 1;
  });
  return Object.entries(grouped)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, count]) => ({ date, count }));
}

function analyticsAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="idart Analytics"');
    return res.status(401).send("Authentication required");
  }

  const encoded = authHeader.split(" ")[1];
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const [user, pass] = decoded.split(":");

  if (user === ANALYTICS_USER && pass === ANALYTICS_PASS) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="idart Analytics"');
  return res.status(401).send("Invalid credentials");
}

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "idart-conversion-backend", time: nowIso() });
});

app.post("/api/track", (req, res) => {
  const { eventType, page, source, visitorId, meta } = req.body || {};
  if (!eventType) return res.status(400).json({ error: "eventType is required" });

  const events = readJson(EVENTS_FILE);
  const record = {
    id: uid("evt"),
    eventType,
    page: page || "unknown",
    source: source || "direct",
    visitorId: visitorId || "anonymous",
    meta: meta || {},
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
    createdAt: nowIso()
  };

  events.push(record);
  writeJson(EVENTS_FILE, events);
  res.status(201).json({ ok: true, id: record.id });
});

app.post("/api/leads", (req, res) => {
  const { name, phone, email, company, service, message, page, visitorId } = req.body || {};
  if (!name || !phone || !email || !service) {
    return res.status(400).json({ error: "name, phone, email, service are required" });
  }

  const leads = readJson(LEADS_FILE);
  const lead = {
    id: uid("lead"),
    name,
    phone,
    email,
    company: company || "",
    service,
    message: message || "",
    page: page || "idart-contact.html",
    visitorId: visitorId || "anonymous",
    status: "new",
    createdAt: nowIso()
  };

  leads.push(lead);
  writeJson(LEADS_FILE, leads);

  const events = readJson(EVENTS_FILE);
  events.push({
    id: uid("evt"),
    eventType: "lead_submitted",
    page: lead.page,
    source: "contact_form",
    visitorId: lead.visitorId,
    meta: { leadId: lead.id, service: lead.service },
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
    userAgent: req.headers["user-agent"] || "",
    createdAt: nowIso()
  });
  writeJson(EVENTS_FILE, events);

  res.status(201).json({ ok: true, leadId: lead.id });
});

app.get("/api/leads", analyticsAuth, (req, res) => {
  const leads = readJson(LEADS_FILE);
  const limit = Number(req.query.limit || 100);
  const sorted = leads.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
  res.json({ total: leads.length, leads: sorted });
});

app.get("/api/conversions", analyticsAuth, (req, res) => {
  const range = req.query.range || "7d";
  const startDate = getRangeStart(range);

  const events = readJson(EVENTS_FILE).filter((e) => new Date(e.createdAt) >= startDate);
  const leads = readJson(LEADS_FILE).filter((l) => new Date(l.createdAt) >= startDate);

  const pageViews = events.filter((e) => e.eventType === "page_view");
  const ctaClicks = events.filter((e) => e.eventType === "cta_click");
  const leadSubmittedEvents = events.filter((e) => e.eventType === "lead_submitted");

  const uniqueVisitors = new Set(events.map((e) => e.visitorId)).size;
  const conversionRate = pageViews.length
    ? Number(((leadSubmittedEvents.length / pageViews.length) * 100).toFixed(2))
    : 0;

  const eventsByType = {};
  events.forEach((event) => {
    eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
  });

  res.json({
    range,
    totals: {
      uniqueVisitors,
      pageViews: pageViews.length,
      ctaClicks: ctaClicks.length,
      leads: leads.length,
      conversionRate
    },
    trend: {
      pageViews: groupByDay(pageViews),
      leads: groupByDay(leads),
      ctaClicks: groupByDay(ctaClicks)
    },
    eventsByType
  });
});

app.get("/analytics", (_, res) => {
  res.sendFile(path.join(ROOT, "conversions-dashboard.html"));
});

ensureDataFiles();
function startServer(preferredPort, maxAttempts = 10) {
  let attempt = 0;
  let currentPort = preferredPort;

  const tryListen = () => {
    const server = app.listen(currentPort, () => {
      console.log(`Conversion backend running: http://localhost:${currentPort}`);
      if (currentPort !== preferredPort) {
        console.log(`Preferred port ${preferredPort} was busy, using ${currentPort} instead.`);
      }
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE" && attempt < maxAttempts) {
        attempt += 1;
        currentPort += 1;
        console.warn(`Port busy, retrying on ${currentPort}...`);
        tryListen();
        return;
      }
      console.error("Failed to start server:", error.message);
      process.exit(1);
    });
  };

  tryListen();
}

startServer(PORT);
