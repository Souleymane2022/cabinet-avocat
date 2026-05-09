/* ==============================================
   NASSOUR MAHAMAT & ASSOCIÉS — MAIN JS
   Cabinet d'Avocats · N'Djamena, Tchad
   ============================================== */

(function () {
  'use strict';

  // ── GSAP REGISTER ──────────────────────────────
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ── PRELOADER ──────────────────────────────────
  const preloader = document.getElementById('preloader');

  window.addEventListener('load', function () {
    setTimeout(function () {
      preloader.classList.add('hidden');
      document.body.classList.remove('loading');
      initAnimations();
    }, 2200);
  });

  // ── CUSTOM CURSOR ──────────────────────────────
  const cursor     = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursorRing');

  if (cursor && cursorRing) {
    let mouseX = 0, mouseY = 0;
    let ringX  = 0, ringY  = 0;

    window.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top  = mouseY + 'px';
    });

    function animateCursor() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top  = ringY + 'px';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.querySelectorAll('a, button, .exp-card, .avocat-big-card, .team-card').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        cursor.classList.add('hovered');
        cursorRing.classList.add('hovered');
      });
      el.addEventListener('mouseleave', function () {
        cursor.classList.remove('hovered');
        cursorRing.classList.remove('hovered');
      });
    });
  }

  // ── HERO SWIPER ────────────────────────────────
  let heroSwiper;

  if (typeof Swiper !== 'undefined') {
    heroSwiper = new Swiper('.hero-swiper', {
      loop:   true,
      speed:  1200,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      autoplay: {
        delay:            5000,
        disableOnInteraction: false,
      },
      on: {
        slideChange: function () {
          updateHeroUI(this.realIndex);
        }
      }
    });

    // Testimonials Swiper
    new Swiper('.temoignages-swiper', {
      loop:         true,
      speed:        800,
      slidesPerView: 1,
      spaceBetween: 24,
      autoplay: { delay: 6000, disableOnInteraction: false },
      pagination: { el: '.swiper-pagination', clickable: true },
      breakpoints: {
        768:  { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      }
    });
  }

  // Hero UI (indicators + counter)
  function updateHeroUI(index) {
    document.querySelectorAll('.hero__indicator').forEach(function (ind, i) {
      ind.classList.toggle('active', i === index);
    });
    const numEl = document.getElementById('slideNum');
    const prog  = document.getElementById('slideProgress');
    if (numEl) numEl.textContent = String(index + 1).padStart(2, '0');
    if (prog)  prog.style.width  = ((index + 1) / 4 * 100) + '%';
  }

  // Indicators click
  document.querySelectorAll('.hero__indicator').forEach(function (ind, i) {
    ind.addEventListener('click', function () {
      if (heroSwiper) heroSwiper.slideToLoop(i);
    });
  });

  // ── TYPED.JS ───────────────────────────────────
  if (typeof Typed !== 'undefined' && document.getElementById('typedText')) {
    new Typed('#typedText', {
      strings: [
        'l\'excellence juridique',
        'la défense de vos droits',
        'l\'expertise OHADA',
        'votre avenir au Tchad',
        'l\'intégrité et la rigueur'
      ],
      typeSpeed:  65,
      backSpeed:  35,
      backDelay:  2500,
      startDelay: 500,
      loop:       true,
      showCursor: true,
    });
  }

  // ── HEADER ─────────────────────────────────────
  const header = document.getElementById('header');

  function onScroll() {
    header.classList.toggle('header--scrolled', window.scrollY > 80);
    toggleBackTop();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ── BURGER ─────────────────────────────────────
  const burger = document.getElementById('burger');
  const nav    = document.getElementById('nav');

  burger.addEventListener('click', function () {
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    const [s0, s1, s2] = this.querySelectorAll('span');
    if (isOpen) {
      s0.style.transform = 'translateY(6.5px) rotate(45deg)';
      s1.style.opacity   = '0';
      s2.style.transform = 'translateY(-6.5px) rotate(-45deg)';
    } else {
      s0.style.transform = s1.style.opacity = s2.style.transform = '';
    }
  });

  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
      document.body.style.overflow = '';
      burger.querySelectorAll('span').forEach(function (s) {
        s.style.transform = s.style.opacity = '';
      });
    });
  });

  // ── SMOOTH SCROLL ──────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = header.offsetHeight + 20;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    });
  });

  // ── BACK TO TOP ────────────────────────────────
  const backTop = document.getElementById('backTop');
  function toggleBackTop() {
    backTop.classList.toggle('visible', window.scrollY > 500);
  }

  // ── PARTICLES (canvas) ─────────────────────────
  function initParticles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    let W        = canvas.width  = window.innerWidth;
    let H        = canvas.height = window.innerHeight;

    const PARTICLES = [];
    const COUNT = Math.min(Math.floor(W * H / 12000), 60);

    for (let i = 0; i < COUNT; i++) {
      PARTICLES.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        r:  Math.random() * 1.8 + 0.4,
        vx: (Math.random() - .5) * .3,
        vy: (Math.random() - .5) * .3,
        a:  Math.random(),
        da: (Math.random() - .5) * .005,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      PARTICLES.forEach(function (p) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.a  += p.da;
        if (p.a <= 0 || p.a >= 1) p.da *= -1;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,146,42,' + (p.a * 0.6) + ')';
        ctx.fill();
      });

      // Lines between close particles
      for (let i = 0; i < PARTICLES.length; i++) {
        for (let j = i + 1; j < PARTICLES.length; j++) {
          const dx   = PARTICLES[i].x - PARTICLES[j].x;
          const dy   = PARTICLES[i].y - PARTICLES[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(PARTICLES[i].x, PARTICLES[i].y);
            ctx.lineTo(PARTICLES[j].x, PARTICLES[j].y);
            ctx.strokeStyle = 'rgba(200,146,42,' + (0.08 * (1 - dist / 120)) + ')';
            ctx.lineWidth   = .5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener('resize', function () {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    });
  }

  // ── COUNTER ANIMATION ──────────────────────────
  function animateCounters() {
    document.querySelectorAll('.counter').forEach(function (el) {
      const target = parseInt(el.dataset.target, 10);
      const dur    = 2000;
      const start  = performance.now();

      function update(now) {
        const t   = Math.min((now - start) / dur, 1);
        const val = Math.floor(easeOut(t) * target);
        el.textContent = val;
        if (t < 1) requestAnimationFrame(update);
        else el.textContent = target;
      }
      requestAnimationFrame(update);
    });
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // ── SCROLL REVEAL ──────────────────────────────
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger');

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    els.forEach(function (el) { observer.observe(el); });

    // Counter trigger
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
      let done = false;
      const statsObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting && !done) {
          done = true;
          animateCounters();
          statsObs.disconnect();
        }
      }, { threshold: .4 });
      statsObs.observe(statsSection);
    }
  }

  // ── ADD REVEAL CLASSES ─────────────────────────
  function addRevealClasses() {
    const selectors = {
      '.avocat-big-card':    'reveal',
      '.exp-card':           'reveal',
      '.team-card':          'reveal',
      '.realisation-item':   'reveal',
      '.actu-card':          'reveal',
      '.stat-item':          'reveal',
      '.pillar':             'reveal',
      '.zone':               'reveal',
      '.about__content':     'reveal-right',
      '.about__images':      'reveal-left',
      '.contact__left':      'reveal-left',
      '.contact__right':     'reveal-right',
    };

    Object.entries(selectors).forEach(function ([sel, cls]) {
      document.querySelectorAll(sel).forEach(function (el, i) {
        el.classList.add(cls);
        el.style.transitionDelay = (i % 4) * .08 + 's';
      });
    });

    document.querySelectorAll('.avocats-vedette__grid, .expertises__grid, .equipe__grid, .realisations__grid').forEach(function (el) {
      el.classList.add('stagger');
    });
  }

  // ── GSAP ANIMATIONS ────────────────────────────
  function initGSAP() {
    if (typeof gsap === 'undefined') return;

    // Hero entrance
    const tl = gsap.timeline({ delay: 2.3 });
    tl.from('.hero__badge',    { y: 30, opacity: 0, duration: .8, ease: 'power3.out' })
      .from('.hero__title',    { y: 50, opacity: 0, duration: .9, ease: 'power3.out' }, '-=.4')
      .from('.hero__subtitle', { y: 30, opacity: 0, duration: .7, ease: 'power3.out' }, '-=.5')
      .from('.hero__actions',  { y: 30, opacity: 0, duration: .6, ease: 'power3.out' }, '-=.4')
      .from('.hero__indicators', { y: 20, opacity: 0, duration: .5, ease: 'power3.out' }, '-=.3')
      .from('.hero__scroll-cue, .hero__slide-counter', { opacity: 0, duration: .5 }, '-=.2');

    // Parallax on hero content
    gsap.to('.hero__content', {
      y: 120,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });

    // Section headers
    document.querySelectorAll('.section-header').forEach(function (el) {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      });
    });

    // Gold line animation for about section
    gsap.from('.about__gold-line', {
      scaleX: 0,
      transformOrigin: 'left',
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.about__gold-line', start: 'top 85%' }
    });

    // Video section parallax
    gsap.to('.video-section__bg', {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: {
        trigger: '.video-section',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      }
    });
  }

  // ── VIDEO MODAL ────────────────────────────────
  const videoModal    = document.getElementById('videoModal');
  const videoPlayBtn  = document.getElementById('videoPlayBtn');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose    = document.getElementById('modalClose');

  if (videoPlayBtn && videoModal) {
    videoPlayBtn.addEventListener('click', function () {
      videoModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    [modalBackdrop, modalClose].forEach(function (el) {
      el && el.addEventListener('click', function () {
        videoModal.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && videoModal.classList.contains('open')) {
        videoModal.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  // ── CONTACT FORM ───────────────────────────────
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const btn      = document.getElementById('submitBtn');
      const span     = btn.querySelector('span');
      const original = span.textContent;

      span.textContent = 'Envoi en cours…';
      btn.disabled     = true;
      btn.style.opacity = '.7';

      setTimeout(function () {
        span.textContent  = '✓ Message envoyé avec succès !';
        btn.style.background = '#2d6a4f';
        btn.style.borderColor = '#2d6a4f';
        btn.style.opacity = '1';
        form.reset();

        setTimeout(function () {
          span.textContent     = original;
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.disabled         = false;
        }, 4000);
      }, 1400);
    });
  }

  // ── TILT EFFECT ON CARDS ───────────────────────
  function initTilt() {
    document.querySelectorAll('.avocat-big-card, .team-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        const rect   = card.getBoundingClientRect();
        const x      = e.clientX - rect.left - rect.width  / 2;
        const y      = e.clientY - rect.top  - rect.height / 2;
        const rotX   = (-y / rect.height * 8).toFixed(2);
        const rotY   = ( x / rect.width  * 8).toFixed(2);
        card.style.transform     = 'perspective(1000px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateY(-8px)';
        card.style.transition    = 'transform .1s ease';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform  = '';
        card.style.transition = 'transform .5s ease';
      });
    });
  }

  // ── HEADER LOGO GLOW ──────────────────────────
  function initLogoGlow() {
    const mono = document.querySelector('.header__logo .logo-monogram');
    if (!mono) return;
    let frame = 0;
    setInterval(function () {
      frame++;
      const glow = Math.sin(frame * 0.05) * 0.5 + 0.5;
      mono.style.boxShadow = '0 0 ' + (10 + glow * 15) + 'px rgba(200,146,42,' + (0.3 + glow * 0.3) + ')';
    }, 50);
  }

  // ── INIT ALL ───────────────────────────────────
  function initAnimations() {
    initParticles();
    addRevealClasses();
    initScrollReveal();
    initGSAP();
    initTilt();
    initLogoGlow();
  }

  // Fallback if load event already fired
  if (document.readyState === 'complete') {
    setTimeout(function () {
      preloader.classList.add('hidden');
      document.body.classList.remove('loading');
      initAnimations();
    }, 100);
  }

})();
