# idart Conversion Backend

This backend tracks website conversions and stores contact leads.

## What it does

- Captures `page_view` and `cta_click` events from all pages.
- Stores contact form submissions as leads.
- Exposes conversion metrics API.
- Includes an analytics dashboard at `/analytics`.

## Run locally

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. Open:
   - Site: [http://localhost:3000/idart-landing.html](http://localhost:3000/idart-landing.html)
   - Dashboard: [http://localhost:3000/analytics](http://localhost:3000/analytics)

If port `3000` is already used:

- `PORT=3011 npm start`

## Analytics login (ID + password)

Analytics routes are protected:

- `/analytics`
- `GET /api/leads`
- `GET /api/conversions`

Default credentials:

- ID: `admin`
- Password: `spid#`

Set your own credentials when starting:

- `ANALYTICS_USER=yourid ANALYTICS_PASS=yourpassword npm start`
- Example with fixed port: `PORT=3003 ANALYTICS_USER=idartadmin ANALYTICS_PASS=StrongPass@123 npm start`

## APIs

- `POST /api/track`
  - Body: `{ eventType, page, source, visitorId, meta }`
- `POST /api/leads`
  - Body: `{ name, phone, email, company, service, message, page, visitorId }`
- `GET /api/leads?limit=20`
- `GET /api/conversions?range=24h|7d|30d`
- `GET /health`

## Data storage

- `data/events.json`
- `data/leads.json`

No database setup is required for now.
