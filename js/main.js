/* =============================================
   DS AVOCATS — MAIN JS
   ============================================= */

(function () {
  'use strict';

  // ── HEADER SCROLL ──────────────────────────────
  const header = document.getElementById('header');

  function onScroll() {
    if (window.scrollY > 80) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
    toggleBackToTop();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ── BURGER MENU ────────────────────────────────
  const burger = document.getElementById('burger');
  const nav    = document.getElementById('nav');

  burger.addEventListener('click', function () {
    nav.classList.toggle('open');
    this.classList.toggle('active');
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';

    const spans = this.querySelectorAll('span');
    if (this.classList.contains('active')) {
      spans[0].style.transform = 'translateY(7px) rotate(45deg)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  });

  // Close nav on link click
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
      const spans = burger.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    });
  });

  // ── SMOOTH SCROLL ──────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = header.offsetHeight + 20;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ── BACK TO TOP ────────────────────────────────
  const backToTop = document.getElementById('backToTop');

  function toggleBackToTop() {
    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  // ── INTERSECTION OBSERVER (AOS) ────────────────
  const aosElements = document.querySelectorAll('[data-aos]');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('aos-animate');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    aosElements.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 0.1 + 's';
      observer.observe(el);
    });
  } else {
    aosElements.forEach(function (el) {
      el.classList.add('aos-animate');
    });
  }

  // ── COUNTER ANIMATION ──────────────────────────
  function animateCounter(el, target, duration) {
    let start = 0;
    const step = Math.ceil(duration / target);
    const timer = setInterval(function () {
      start += Math.ceil(target / (duration / 30));
      if (start >= target) {
        start = target;
        clearInterval(timer);
      }
      el.textContent = start;
    }, 30);
  }

  const statsSection = document.querySelector('.stats');
  let statsAnimated = false;

  if (statsSection && 'IntersectionObserver' in window) {
    const statsObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !statsAnimated) {
        statsAnimated = true;
        document.querySelectorAll('.stat-item__number').forEach(function (el) {
          animateCounter(el, parseInt(el.dataset.target, 10), 1500);
        });
        statsObserver.disconnect();
      }
    }, { threshold: 0.5 });

    statsObserver.observe(statsSection);
  }

  // ── TESTIMONIALS SLIDER ────────────────────────
  const temoignages = document.querySelectorAll('.temoignage');
  const dots        = document.querySelectorAll('.dot');
  let current = 0;
  let autoplay;

  function showSlide(index) {
    temoignages.forEach(function (t) { t.classList.remove('active'); });
    dots.forEach(function (d) { d.classList.remove('active'); });
    temoignages[index].classList.add('active');
    dots[index].classList.add('active');
    current = index;
  }

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      clearInterval(autoplay);
      showSlide(parseInt(this.dataset.index, 10));
      startAutoplay();
    });
  });

  function startAutoplay() {
    autoplay = setInterval(function () {
      showSlide((current + 1) % temoignages.length);
    }, 5000);
  }

  if (temoignages.length > 0) {
    startAutoplay();
  }

  // ── CONTACT FORM ───────────────────────────────
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn = this.querySelector('button[type="submit"]');
      const original = btn.textContent;

      btn.textContent = 'Envoi en cours…';
      btn.disabled = true;

      setTimeout(function () {
        btn.textContent = '✓ Message envoyé !';
        btn.style.background = '#2d6a4f';
        setTimeout(function () {
          btn.textContent = original;
          btn.style.background = '';
          btn.disabled = false;
          contactForm.reset();
        }, 3000);
      }, 1200);
    });
  }

  // ── PARALLAX HERO ──────────────────────────────
  const heroContent = document.querySelector('.hero__content');
  const heroShapes  = document.querySelector('.hero__shapes');

  window.addEventListener('scroll', function () {
    const scrolled = window.scrollY;
    if (heroContent && scrolled < window.innerHeight) {
      heroContent.style.transform = 'translateY(' + scrolled * 0.25 + 'px)';
      heroContent.style.opacity   = 1 - scrolled / (window.innerHeight * 0.7);
    }
    if (heroShapes && scrolled < window.innerHeight) {
      heroShapes.style.transform = 'translateY(' + scrolled * 0.15 + 'px)';
    }
  }, { passive: true });

})();
