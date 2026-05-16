async function loadComponents() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');

  const prefix = ''; 

  // Load Header
  if (headerPlaceholder) {
    try {
      const res = await fetch(prefix + 'header.html');
      const html = await res.text();
      headerPlaceholder.innerHTML = html;
      
      const path = window.location.pathname;
      const currentPage = path.split('/').pop() || 'idart-landing.html';
      
      const navLinks = headerPlaceholder.querySelectorAll('.nav-links a');
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === 'idart-landing.html' && href === '/')) {
          link.classList.add('active');
        }
      });

      // Mobile Menu Toggle
      const mobileToggle = headerPlaceholder.querySelector('#mobile-menu-toggle');
      const mobileNav = headerPlaceholder.querySelector('.nav-links');
      
      if (mobileToggle && mobileNav) {
        mobileToggle.addEventListener('click', () => {
          mobileToggle.classList.toggle('open');
          mobileNav.classList.toggle('open');
          document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : 'auto';
        });

        // Close menu on link click
        navLinks.forEach(link => {
          link.addEventListener('click', () => {
            mobileToggle.classList.remove('open');
            mobileNav.classList.remove('open');
            document.body.style.overflow = 'auto';
          });
        });
      }

      // Sticky Header Logic
      const topbar = headerPlaceholder.querySelector('.topbar');
      if (topbar) {
        window.addEventListener('scroll', () => {
          if (window.scrollY > 50) {
            topbar.classList.add('scrolled');
          } else {
            topbar.classList.remove('scrolled');
          }
        });
      }
    } catch (err) {
      console.error('Failed to load header:', err);
    }
  }

  // Load Footer
  if (footerPlaceholder) {
    try {
      const res = await fetch(prefix + 'footer.html');
      const html = await res.text();
      footerPlaceholder.innerHTML = html;

      // Back to Top Logic
      const btt = document.getElementById('backToTop');
      if (btt) {
        window.addEventListener('scroll', () => {
          if (window.scrollY > 500) {
            btt.classList.add('visible');
          } else {
            btt.classList.remove('visible');
          }
        });
        btt.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    } catch (err) {
      console.error('Failed to load footer:', err);
    }
  }

  // Initialize Scroll Reveal Animations
  initScrollReveal();

  // Smooth Page Entry
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 50);
}

function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-up');
  
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.05, // Trigger earlier (5% visible)
    rootMargin: "0px 0px -20px 0px" // More natural trigger point
  });

  revealElements.forEach(el => revealObserver.observe(el));
}

// Run as soon as DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadComponents);
} else {
  loadComponents();
}
