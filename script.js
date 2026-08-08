// No Choice Beauty Studio · interactions. Progressive enhancement only:
// every feature degrades to working native behavior without JS.
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 880;

  /* ---------- smooth scrolling: Lenis on desktop, native everywhere else ---------- */
  var lenis = null;
  if (!reduceMotion && desktop && typeof Lenis !== 'undefined') {
    document.documentElement.style.scrollBehavior = 'auto';
    lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }
  function scrollToEl(el) {
    if (lenis) { lenis.scrollTo(el, { offset: -88 }); }
    else { el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
  }

  /* ---------- menu tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  function select(tab) {
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
    panels.forEach(function (p) { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length]
               : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
      if (next) { next.focus(); select(next); }
    });
  });
  function onHash() {
    var m = location.hash.match(/^#menu-(\w+)/);
    if (!m) { return; }
    var tab = document.getElementById('tab-' + m[1]);
    if (tab) { select(tab); }
  }
  if (tabs.length) { select(tabs[0]); }
  window.addEventListener('hashchange', onHash);
  onHash();

  /* same-page anchors glide with the same physics as the page */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) { return; }
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '#' || href.length < 2) { return; }
    var t = document.getElementById(href.slice(1));
    if (!t) { return; }
    e.preventDefault();
    if (history.pushState) { history.pushState(null, '', href); }
    onHash();
    scrollToEl(t);
  });

  /* ---------- mobile nav ---------- */
  var burger = document.querySelector('.nav-burger');
  var links = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.classList.toggle('is-open', open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
      document.body.classList.toggle('menu-open', open);
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        burger.classList.remove('is-open');
        document.documentElement.style.overflow = '';
        document.body.classList.remove('menu-open');
      }
    });
  }

  /* ---------- reveals: staggered per batch, delays cleaned up after ---------- */
  var rvs = Array.prototype.slice.call(document.querySelectorAll('.rv'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries
        .filter(function (en) { return en.isIntersecting; })
        .sort(function (a, b) {
          return (a.boundingClientRect.top - b.boundingClientRect.top) ||
                 (a.boundingClientRect.left - b.boundingClientRect.left);
        })
        .forEach(function (en, i) {
          var el = en.target;
          el.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
          el.classList.add('in');
          io.unobserve(el);
          var clear = function () { el.style.transitionDelay = ''; };
          el.addEventListener('transitionend', clear, { once: true });
          setTimeout(clear, 1400);
        });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    rvs.forEach(function (el) { io.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- footer year ---------- */
  var y = document.getElementById('yr');
  if (y) { y.textContent = new Date().getFullYear(); }

  /* ---------- hero: auto-upgrade to video when /assets/hero.mp4 exists ---------- */
  var hero = document.getElementById('hero-media');
  if (hero && !reduceMotion) {
    var heroSrc = window.matchMedia('(max-width: 880px)').matches ? '/assets/hero-mobile.mp4' : '/assets/hero.mp4';
    fetch(heroSrc, { method: 'HEAD' }).then(function (r) {
      if (!r.ok) { return; }
      var img = hero.querySelector('img');
      var v = document.createElement('video');
      v.src = heroSrc;
      v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute('aria-hidden', 'true');
      if (img) { v.poster = img.currentSrc || img.src; hero.insertBefore(v, img); img.remove(); }
      else { hero.insertBefore(v, hero.firstChild); }
      v.play().catch(function () {});
    }).catch(function () {});
  }

  /* ---------- hero parallax: content drifts and fades as you scroll away.
     Applied only to elements with no CSS transitions, so nothing fights. ---------- */
  if (hero && desktop && !reduceMotion) {
    var inner = hero.querySelector('.hero-full-inner');
    var pTick = false;
    var drift = function () {
      var sy = window.scrollY;
      if (inner && sy <= window.innerHeight) {
        inner.style.transform = 'translate3d(0,' + (sy * 0.16).toFixed(1) + 'px,0)';
        inner.style.opacity = Math.max(0, 1 - sy / (window.innerHeight * 0.85)).toFixed(3);
      }
      pTick = false;
    };
    window.addEventListener('scroll', function () {
      if (!pTick) { pTick = true; requestAnimationFrame(drift); }
    }, { passive: true });
  }

  /* ---------- booking chooser ---------- */
  var modal = document.getElementById('book-modal');
  if (modal && modal.showModal) {
    document.querySelectorAll('.js-book').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        modal.showModal();
        document.documentElement.style.overflow = 'hidden';
        if (lenis) { lenis.stop(); }
      });
    });
    modal.addEventListener('close', function () {
      document.documentElement.style.overflow = '';
      if (lenis) { lenis.start(); }
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) { modal.close(); } });
    var c = modal.querySelector('.bm-close');
    if (c) { c.addEventListener('click', function () { modal.close(); }); }
  }
})();


// Locations dropdown: hover on desktop (CSS), click/tap toggle everywhere.
(function () {
  var drops = document.querySelectorAll('.has-drop > .drop-btn');
  drops.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = btn.parentNode;
      var open = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.has-drop.open').forEach(function (li) {
      if (!li.contains(e.target)) {
        li.classList.remove('open');
        var b = li.querySelector('.drop-btn');
        if (b) { b.setAttribute('aria-expanded', 'false'); }
      }
    });
  });
})();


// Gallery carousel: arrows on desktop, native swipe on touch.
(function () {
  document.querySelectorAll('.carousel').forEach(function (car) {
    var track = car.querySelector('.car-track');
    if (!track) { return; }
    function go(dir) {
      track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
    }
    var prev = car.querySelector('.car-btn.prev');
    var next = car.querySelector('.car-btn.next');
    if (prev) { prev.addEventListener('click', function () { go(-1); }); }
    if (next) { next.addEventListener('click', function () { go(1); }); }
  });
})();


// Nav compresses once the page is in motion.
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) { return; }
  var on = false;
  function check() {
    var s = window.scrollY > 8;
    if (s !== on) { on = s; nav.classList.toggle('is-scrolled', s); }
  }
  window.addEventListener('scroll', check, { passive: true });
  check();
})();



// Hero glow pauses once the hero has left the viewport (saves weak GPUs).
(function () {
  var hero = document.getElementById('hero-media');
  if (!hero) { return; }
  var idle = false;
  function check() {
    var s = window.scrollY > window.innerHeight * 1.05;
    if (s !== idle) { idle = s; hero.classList.toggle('idle', s); }
  }
  window.addEventListener('scroll', check, { passive: true });
  check();
})();

// Carousel progress hairline.
(function () {
  document.querySelectorAll('.carousel').forEach(function (car) {
    var track = car.querySelector('.car-track');
    var bar = car.querySelector('.car-progress i');
    if (!track || !bar) { return; }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      bar.style.transform = 'scaleX(' + (max > 0 ? track.scrollLeft / max : 0) + ')';
    }
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();


// Specular sheen: interactive cards catch the light under the pointer (fine pointers only).
(function () {
  if (!window.matchMedia('(pointer: fine)').matches) { return; }
  document.querySelectorAll('.cat .slot, .cat .frame, .stu-media .frame, .loc, .rev, .bm-city, .car-slide .frame, .work-grid .frame').forEach(function (el) {
    el.classList.add('sheen');
  });
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest ? e.target.closest('.sheen') : null;
    if (!el) { return; }
    var r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, { passive: true });
})();


// Newsletter / SMS sign-up modal.
//
// LEGAL: the checkbox below is TCPA "express written consent". It must stay
// unchecked by default, must stay optional (never a condition of booking or
// buying), and the disclosure text must stay visible next to it. We store the
// exact wording the visitor agreed to, plus a timestamp, so the consent is
// provable later. Submissions go to Netlify Forms (form name "newsletter");
// the static copy Netlify parses at deploy time lives at the end of index.html.
(function () {
  'use strict';

  var KEY = 'nc-news-v1';
  var DELAY = 6000;          // show this long after load...
  var SCROLL_AT = 0.45;      // ...or once this far down the page, whichever first

  if (!window.HTMLDialogElement) { return; }
  if (location.pathname.indexOf('/privacy/') === 0) { return; }
  try { if (localStorage.getItem(KEY)) { return; } } catch (e) { return; }

  // Shown text and stored text are the same sentence; only the links differ.
  var CONSENT_TEXT = 'I agree to receive recurring automated marketing text messages ' +
    '(promotions and studio news) from No Choice Beauty Studio at the number provided. ' +
    'Consent is not a condition of any purchase. Message frequency varies, up to about 4 per month. ' +
    'Message and data rates may apply. Reply STOP to cancel, HELP for help. ' +
    'Privacy and SMS terms: nochoicebeauty.com/privacy/';
  var CONSENT_HTML = 'I agree to receive recurring automated marketing text messages ' +
    '(promotions and studio news) from No Choice Beauty Studio at the number provided. ' +
    '<b>Consent is not a condition of any purchase.</b> Message frequency varies, up to about 4 per month. ' +
    'Message and data rates may apply. Reply STOP to cancel, HELP for help. See our ' +
    '<a href="/privacy/">privacy and SMS terms</a>.';

  var dlg = document.createElement('dialog');
  dlg.className = 'book-modal news-modal';
  dlg.id = 'news-modal';
  dlg.setAttribute('aria-label', 'Get promos and studio news by text');
  dlg.innerHTML =
    '<div class="bm-in">' +
      '<div class="bm-head">' +
        '<p class="mono-sm">No Choice &middot; Stay in the loop</p>' +
        '<button class="bm-close" type="button" aria-label="Close">Close</button>' +
      '</div>' +
      '<div class="news-body">' +
        // the space after <br> matters: phones hide the break, and without it
        // the two halves collide into "news,straight"
        '<h2 class="news-h">Promos and studio news,<br> straight to your phone.</h2>' +
        '<p class="bm-sub">First look at offers, new services and openings. Nothing else, and you can stop whenever you like.</p>' +
        '<form class="news-form" novalidate>' +
          '<label class="news-field">' +
            '<span class="news-lab">Mobile number</span>' +
            '<input type="tel" name="phone" inputmode="tel" autocomplete="tel" placeholder="(555) 555-5555">' +
          '</label>' +
          '<label class="news-field">' +
            '<span class="news-lab">Email <em>optional</em></span>' +
            '<input type="email" name="email" autocomplete="email" placeholder="you@email.com">' +
          '</label>' +
          '<label class="news-consent">' +
            '<input type="checkbox" name="consent" value="yes">' +
            '<span>' + CONSENT_HTML + '</span>' +
          '</label>' +
          '<p class="news-err" role="alert" hidden></p>' +
          '<button class="btn news-submit" type="submit">Sign me up <span class="arr">&rarr;</span></button>' +
          '<input class="news-hp" type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '</form>' +
        '<p class="bm-foot">Must be 18 or older. We never sell your number.</p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dlg);

  var form = dlg.querySelector('.news-form');
  var err = dlg.querySelector('.news-err');
  var phone = form.elements.phone;
  var email = form.elements.email;
  var consent = form.elements.consent;
  var submit = dlg.querySelector('.news-submit');

  function remember(state) { try { localStorage.setItem(KEY, state); } catch (e) {} }
  function fail(msg, field) {
    err.textContent = msg;
    err.hidden = false;
    if (field) { field.focus(); }
  }

  // 10 digits, or 11 starting with 1. Stored as E.164 so a provider can use it as-is.
  function normalize(v) {
    var d = String(v).replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') { d = d.slice(1); }
    return d.length === 10 ? '+1' + d : null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;

    var tel = normalize(phone.value);
    if (!tel) { return fail('Please enter a 10-digit US mobile number.', phone); }
    if (email.value && email.value.indexOf('@') < 1) { return fail('That email address does not look right.', email); }
    if (!consent.checked) { return fail('Please tick the box to agree to receive texts.', consent); }

    submit.disabled = true;
    submit.textContent = 'Sending...';

    var body = new URLSearchParams({
      'form-name': 'newsletter',
      phone: tel,
      email: email.value.trim(),
      consent: 'yes',
      consent_text: CONSENT_TEXT,
      consent_at: new Date().toISOString(),
      source_page: location.pathname,
      company: form.elements.company.value
    }).toString();

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    }).then(function (r) {
      if (!r.ok) { throw new Error(r.status); }
      remember('joined');
      dlg.querySelector('.news-body').innerHTML =
        '<div class="news-done">' +
          '<p class="mono-sm news-done-tag">Confirmed</p>' +
          '<h2 class="news-h">You&rsquo;re all set.</h2>' +
          '<p class="bm-sub">Watch for a text from us. Reply STOP any time and you are off, no hard feelings.</p>' +
        '</div>';
      setTimeout(function () { if (dlg.open) { dlg.close(); } }, 3600);
    }).catch(function () {
      submit.disabled = false;
      submit.innerHTML = 'Sign me up <span class="arr">&rarr;</span>';
      fail('That did not go through. Please try again, or DM @nochoice_la.');
    });
  });

  dlg.querySelector('.bm-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
  dlg.addEventListener('close', function () {
    document.documentElement.style.overflow = '';
    try { if (localStorage.getItem(KEY) !== 'joined') { remember('dismissed'); } } catch (e) {}
  });

  var armed = true;
  function open() {
    if (!armed) { return; }
    // never interrupt the booking chooser
    if (document.querySelector('dialog[open]')) { setTimeout(open, 8000); return; }
    armed = false;
    window.removeEventListener('scroll', onScroll);
    dlg.showModal();
    document.documentElement.style.overflow = 'hidden';
  }
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max > 0 && window.scrollY / max > SCROLL_AT) { open(); }
  }
  setTimeout(open, DELAY);
  window.addEventListener('scroll', onScroll, { passive: true });
})();


// Carousel arrows fade at the ends.
(function () {
  document.querySelectorAll('.carousel').forEach(function (car) {
    var track = car.querySelector('.car-track');
    var prev = car.querySelector('.car-btn.prev');
    var next = car.querySelector('.car-btn.next');
    if (!track || !prev || !next) { return; }
    function upd() {
      var max = track.scrollWidth - track.clientWidth - 1;
      prev.classList.toggle('off', track.scrollLeft <= 1);
      next.classList.toggle('off', track.scrollLeft >= max);
    }
    track.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  });
})();
