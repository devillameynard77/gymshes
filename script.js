/* ==========================================================================
   GYMRATBURAT PHOTOS — Vol. 01
   Vanilla JS. No libraries, no build step.
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };
  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };
  var pad = function (number) {
    return String(number).padStart(2, '0');
  };
  var clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
  };
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var root = document.documentElement;

  /* ----------------------------------------------------------------------
     Theme
     ---------------------------------------------------------------------- */
  var themeToggle = $('#theme-toggle');
  var themeMeta = $('meta[name="theme-color"]');

  function syncTheme() {
    var isLight = root.getAttribute('data-theme') === 'light';
    themeToggle.setAttribute('aria-pressed', String(isLight));
    themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    themeToggle.setAttribute('title', isLight ? 'Turn the lights off' : 'Turn the lights on');
    if (themeMeta) themeMeta.setAttribute('content', isLight ? '#edeae0' : '#0a0b09');
  }

  if (themeToggle) {
    syncTheme();
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem('grb-theme', next);
      } catch (error) {
        /* Storage can be unavailable on file:// in some browsers. */
      }
      syncTheme();
    });
  }

  /* ----------------------------------------------------------------------
     Preloader
     ---------------------------------------------------------------------- */
  var preloader = $('#preloader');
  var loadCount = $('#load-count');
  var loadBar = $('#load-bar');
  var progressValue = 0;
  var pageLoaded = document.readyState === 'complete';
  var loadingDone = false;
  var loadStart = performance.now();
  var minimumLoadTime = prefersReducedMotion ? 200 : 1150;

  function paintProgress(value) {
    progressValue = clamp(Math.round(value), 0, 100);
    if (loadCount) loadCount.textContent = pad(progressValue);
    if (loadBar) loadBar.style.transform = 'scaleX(' + progressValue / 100 + ')';
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function runInitialCount() {
    var duration = prefersReducedMotion ? 250 : 1050;
    var start = performance.now();

    function frame(now) {
      if (loadingDone) return;
      var t = clamp((now - start) / duration, 0, 1);
      paintProgress(easeOutCubic(t) * 92);
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function finishLoading() {
    if (loadingDone) return;
    loadingDone = true;

    var from = progressValue;
    var start = performance.now();
    var duration = prefersReducedMotion ? 100 : 420;

    function frame(now) {
      var t = clamp((now - start) / duration, 0, 1);
      paintProgress(from + (100 - from) * easeOutCubic(t));
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        window.setTimeout(function () {
          document.body.classList.add('loaded');
          if (preloader) preloader.setAttribute('aria-hidden', 'true');
        }, prefersReducedMotion ? 0 : 160);
      }
    }

    requestAnimationFrame(frame);
  }

  function attemptFinish() {
    if (!pageLoaded) return;
    var elapsed = performance.now() - loadStart;
    window.setTimeout(finishLoading, Math.max(0, minimumLoadTime - elapsed));
  }

  if (preloader) {
    runInitialCount();
    if (pageLoaded) {
      attemptFinish();
    } else {
      window.addEventListener('load', function () {
        pageLoaded = true;
        attemptFinish();
      });
    }
  }

  /* ----------------------------------------------------------------------
     Header, scroll progress and local clock
     ---------------------------------------------------------------------- */
  var header = $('#site-header');
  var progressBar = $('#scroll-progress-bar');
  var vibeSection = $('.vibe');
  var ticking = false;

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (progressBar) progressBar.style.transform = 'scaleX(' + (docHeight > 0 ? clamp(y / docHeight, 0, 1) : 0) + ')';

    if (vibeSection && !prefersReducedMotion) {
      var rect = vibeSection.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        var progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        vibeSection.style.setProperty('--vibe-shift', ((progress - 0.5) * 46).toFixed(2) + 'px');
      }
    }
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateScrollUI();

  var localTime = $('#local-time');
  var localZone = $('#local-zone');

  function updateClock() {
    var now = new Date();
    if (localTime) {
      localTime.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
    if (localZone && window.Intl) {
      try {
        var parts = new Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(now);
        var zonePart = parts.filter(function (part) { return part.type === 'timeZoneName'; })[0];
        localZone.textContent = zonePart ? zonePart.value.toUpperCase() : 'LOCAL TIME';
      } catch (error) {
        localZone.textContent = 'LOCAL TIME';
      }
    }
  }

  updateClock();
  window.setInterval(updateClock, 30000);

  /* ----------------------------------------------------------------------
     Toast
     ---------------------------------------------------------------------- */
  var toast = $('#toast');
  var toastTimer;

  function showToast(message, duration) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, duration || 2600);
  }

  /* ----------------------------------------------------------------------
     Mobile menu
     ---------------------------------------------------------------------- */
  var menu = $('#mobile-menu');
  var menuToggle = $('#menu-toggle');
  var menuClose = $('#menu-close');

  function openMenu() {
    if (!menu || !menuToggle) return;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    if (cursor) cursor.classList.add('is-inverted');
    window.setTimeout(function () {
      if (menuClose) menuClose.focus();
    }, 120);
  }

  function closeMenu(returnFocus) {
    if (!menu || !menuToggle) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (cursor) cursor.classList.remove('is-inverted');
    if (returnFocus !== false) menuToggle.focus();
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (menu.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', function () {
      closeMenu();
    });
  }

  if (menu) {
    $$('a', menu).forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu(false);
      });
    });
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && menu && menu.classList.contains('is-open')) closeMenu(false);
  });

  function trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) return;
    var focusable = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', container).filter(function (el) {
      return el.offsetParent !== null;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (!container.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ----------------------------------------------------------------------
     Custom cursor
     ---------------------------------------------------------------------- */
  var cursor = $('#cursor');

  if (cursor && finePointer && !prefersReducedMotion) {
    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');

    var cursorDot = $('.cursor__dot', cursor);
    var cursorRing = $('.cursor__ring', cursor);
    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var ringX = mouseX;
    var ringY = mouseY;

    function renderCursor() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (cursorDot) {
        cursorDot.style.transform = 'translate3d(' + mouseX + 'px,' + mouseY + 'px,0) translate(-50%,-50%)';
      }
      if (cursorRing) {
        cursorRing.style.transform = 'translate3d(' + ringX + 'px,' + ringY + 'px,0) translate(-50%,-50%)';
      }
      requestAnimationFrame(renderCursor);
    }

    document.addEventListener('mousemove', function (event) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      cursor.classList.remove('is-hidden');
    });

    document.addEventListener('mouseleave', function () {
      cursor.classList.add('is-hidden');
    });

    document.addEventListener('mouseover', function (event) {
      if (!(event.target instanceof Element)) return;
      var target = event.target.closest('a, button, [data-cursor]');
      var isView = !!target && (target.matches('.photo-card, .reel-item, [data-cursor="view"]'));
      cursor.classList.toggle('is-hover', !!target);
      cursor.classList.toggle('is-view', isView);
    });

    requestAnimationFrame(renderCursor);
  }

  /* ----------------------------------------------------------------------
     Scroll reveal
     ---------------------------------------------------------------------- */
  var revealElements = $$('[data-reveal]');

  function showAllReveals() {
    revealElements.forEach(function (element) {
      element.style.setProperty('--reveal-delay', element.getAttribute('data-reveal-delay') || '0');
      element.classList.add('is-revealed');
    });
  }

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.style.setProperty('--reveal-delay', entry.target.getAttribute('data-reveal-delay') || '0');
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealElements.forEach(function (element) {
      revealObserver.observe(element);
    });
  } else {
    showAllReveals();
  }

  /* ----------------------------------------------------------------------
     Stats counters
     ---------------------------------------------------------------------- */
  var statValues = $$('.stat__value');

  function animateStat(element) {
    var target = parseInt(element.getAttribute('data-count'), 10) || 0;
    if (prefersReducedMotion) {
      element.textContent = pad(target);
      return;
    }
    var duration = 1400;
    var start = performance.now();

    function frame(now) {
      var t = clamp((now - start) / duration, 0, 1);
      var value = Math.round(target * easeOutCubic(t));
      element.textContent = pad(value);
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if (statValues.length) {
    if ('IntersectionObserver' in window) {
      var statObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            animateStat(entry.target);
            statObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.5 }
      );
      statValues.forEach(function (value) {
        statObserver.observe(value);
      });
    } else {
      statValues.forEach(animateStat);
    }
  }

  /* ----------------------------------------------------------------------
     Share
     ---------------------------------------------------------------------- */
  var shareButton = $('#share-btn');
  var shareText = 'GYMRATBURAT PHOTOS — eight frames, one rat, zero filters.';

  function fallbackCopy(text) {
    var helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }
    document.body.removeChild(helper);
    return copied;
  }

  if (shareButton) {
    shareButton.addEventListener('click', function () {
      var shareData = {
        title: 'GYMRATBURAT PHOTOS — Vol. 01',
        text: shareText,
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(shareData).catch(function (error) {
          if (error && error.name === 'AbortError') return;
          if (fallbackCopy(window.location.href)) showToast('Archive link copied');
          else showToast('Share this archive from your address bar');
        });
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(
          function () { showToast('Archive link copied'); },
          function () {
            if (fallbackCopy(window.location.href)) showToast('Archive link copied');
            else showToast('Share this archive from your address bar');
          }
        );
      } else if (fallbackCopy(window.location.href)) {
        showToast('Archive link copied');
      } else {
        showToast('Share this archive from your address bar');
      }
    });
  }

  /* ----------------------------------------------------------------------
     Photo data
     ---------------------------------------------------------------------- */
  var photoCards = $$('.photo-card');
  var photos = photoCards
    .map(function (card) {
      var img = $('img', card);
      return {
        number: card.getAttribute('data-number'),
        full: card.getAttribute('data-full'),
        title: card.getAttribute('data-title'),
        tag: card.getAttribute('data-tag'),
        location: card.getAttribute('data-location'),
        category: card.getAttribute('data-category'),
        alt: img ? img.alt : '',
        thumb: card.getAttribute('data-full').replace(/\.jpg$/i, '-800.jpg'),
        slug: card.getAttribute('data-title').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };
    })
    .sort(function (a, b) {
      return a.number.localeCompare(b.number);
    });

  var photoIndexByNumber = {};
  photos.forEach(function (photo, index) {
    photoIndexByNumber[photo.number] = index;
  });

  /* ----------------------------------------------------------------------
     Gallery filters (FLIP transition)
     ---------------------------------------------------------------------- */
  var filterButtons = $$('.filter');
  var noteTile = $('.card--note');
  var visibleCount = $('#visible-count');
  var activeFilter = 'all';

  function applyFilter(filter) {
    activeFilter = filter;
    var records = photoCards.map(function (card) {
      return {
        card: card,
        wasHidden: card.hidden,
        rect: card.hidden ? null : card.getBoundingClientRect()
      };
    });

    photoCards.forEach(function (card) {
      card.hidden = filter !== 'all' && card.getAttribute('data-category') !== filter;
    });
    if (noteTile) noteTile.hidden = filter !== 'all';

    var count = 0;
    records.forEach(function (record) {
      var card = record.card;
      if (card.hidden) return;
      count += 1;

      if (card.getAnimations) {
        card.getAnimations().forEach(function (animation) {
          animation.cancel();
        });
      }

      if (record.rect && !record.wasHidden && !prefersReducedMotion) {
        var last = card.getBoundingClientRect();
        var dx = record.rect.left - last.left;
        var dy = record.rect.top - last.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          card.animate(
            [
              { transform: 'translate(' + dx + 'px,' + dy + 'px)' },
              { transform: 'translate(0,0)' }
            ],
            { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
          );
        }
      } else if (!prefersReducedMotion) {
        card.animate(
          [
            { opacity: 0, transform: 'translateY(14px) scale(0.985)' },
            { opacity: 1, transform: 'none' }
          ],
          { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
      }
    });

    if (visibleCount) visibleCount.textContent = pad(count);
    filterButtons.forEach(function (button) {
      var isActive = button.getAttribute('data-filter') === filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.getAttribute('data-filter');
      if (filter !== activeFilter) applyFilter(filter);
    });
  });

  /* ----------------------------------------------------------------------
     Reel
     ---------------------------------------------------------------------- */
  function createReelGroup(order, decorative) {
    var group = document.createElement('div');
    group.className = 'reel-group';
    if (decorative) group.setAttribute('aria-hidden', 'true');

    order.forEach(function (number) {
      var photo = photos[photoIndexByNumber[number]];
      if (!photo) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'reel-item';
      button.setAttribute('aria-label', 'Open frame ' + photo.number + ', ' + photo.title);
      if (decorative) button.tabIndex = -1;
      button.innerHTML =
        '<img src="' + photo.thumb + '" alt="' + photo.alt.replace(/"/g, '&quot;') +
        '" width="320" height="427" loading="lazy" decoding="async">' +
        '<span class="reel-item__num" aria-hidden="true">' + photo.number + '</span>' +
        '<span class="reel-item__open" aria-hidden="true">↗</span>';
      button.addEventListener('click', function () {
        openLightbox(photoIndexByNumber[number], false);
      });
      group.appendChild(button);
    });

    return group;
  }

  var reelTrackA = $('#reel-track-a');
  var reelTrackB = $('#reel-track-b');
  var ascending = photos.map(function (photo) { return photo.number; });
  var descending = ascending.slice().reverse();

  if (reelTrackA && reelTrackB && photos.length) {
    reelTrackA.appendChild(createReelGroup(ascending, false));
    reelTrackA.appendChild(createReelGroup(ascending, true));
    reelTrackB.appendChild(createReelGroup(descending, false));
    reelTrackB.appendChild(createReelGroup(descending, true));
  }

  /* ----------------------------------------------------------------------
     Lightbox
     ---------------------------------------------------------------------- */
  var lightbox = $('#lightbox');
  var lbImage = $('#lb-image');
  var lbFigure = $('#lb-figure');
  var lbTitle = $('#lb-title');
  var lbTag = $('#lb-tag');
  var lbLocation = $('#lb-location');
  var lbCurrent = $('#lb-current');
  var lbThumbs = $('#lb-thumbs');
  var lbPrev = $('#lb-prev');
  var lbNext = $('#lb-next');
  var lbClose = $('#lb-close');
  var lbAutoplayButton = $('#lb-autoplay');
  var lbAutoplayLabel = lbAutoplayButton ? $('.lb-autoplay__label', lbAutoplayButton) : null;
  var lbSave = $('#lb-save');
  var lbStage = $('.lightbox__stage', lightbox || document);
  var lbFigureElement = lbFigure;

  var lbOpen = false;
  var lbIndex = 0;
  var lbLastFocus = null;
  var lbAutoplay = false;
  var lbTimer = null;
  var lbLoadToken = 0;
  var pageTitle = document.title;

  function buildThumbs() {
    if (!lbThumbs) return;
    lbThumbs.innerHTML = '';
    photos.forEach(function (photo, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'lb-thumb';
      button.setAttribute('aria-label', 'View frame ' + photo.number + ': ' + photo.title);

      var image = document.createElement('img');
      image.src = photo.thumb;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 320;
      image.height = 427;
      button.appendChild(image);

      button.addEventListener('click', function () {
        if (index === lbIndex) return;
        lbIndex = index;
        renderLightbox();
        restartAutoplay();
      });

      lbThumbs.appendChild(button);
    });
  }

  function scrollActiveThumb() {
    if (!lbThumbs) return;
    var active = $('.lb-thumb.is-active', lbThumbs);
    if (!active) return;
    if (lbThumbs.scrollWidth <= lbThumbs.clientWidth) return;
    var target = active.offsetLeft - (lbThumbs.clientWidth - active.offsetWidth) / 2;
    lbThumbs.scrollTo({
      left: Math.max(0, target),
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }

  function renderLightbox() {
    var photo = photos[lbIndex];
    if (!photo) return;

    lbCurrent.textContent = pad(lbIndex + 1);
    lbTag.textContent = photo.tag;
    lbTitle.textContent = photo.title;
    lbLocation.textContent = photo.location;
    if (lbSave) {
      lbSave.href = photo.full;
      lbSave.setAttribute('download', photo.number + '-' + photo.slug + '.jpg');
    }
    document.title = 'Frame ' + photo.number + ' — ' + photo.title + ' | GYMRATBURAT PHOTOS';

    if (lbThumbs) {
      $$('.lb-thumb', lbThumbs).forEach(function (button, index) {
        var isActive = index === lbIndex;
        button.classList.toggle('is-active', isActive);
        if (isActive) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      window.setTimeout(scrollActiveThumb, 40);
    }

    lbFigure.classList.add('is-changing', 'is-loading');
    var token = ++lbLoadToken;
    var preload = new Image();

    preload.onload = function () {
      if (token !== lbLoadToken) return;
      lbImage.src = photo.full;
      lbImage.alt = photo.alt;
      lbFigure.classList.remove('is-loading');
      requestAnimationFrame(function () {
        lbFigure.classList.remove('is-changing');
      });
    };

    preload.onerror = function () {
      if (token !== lbLoadToken) return;
      lbImage.src = photo.full;
      lbImage.alt = photo.alt;
      lbFigure.classList.remove('is-loading', 'is-changing');
    };

    preload.src = photo.full;
    if (preload.complete && preload.naturalWidth) preload.onload();

    [1, -1].forEach(function (offset) {
      var neighbour = photos[(lbIndex + offset + photos.length) % photos.length];
      if (!neighbour) return;
      var cache = new Image();
      cache.src = neighbour.full;
    });
  }

  function stopAutoplay() {
    if (lbTimer) {
      window.clearInterval(lbTimer);
      lbTimer = null;
    }
  }

  function startAutoplayTimer() {
    stopAutoplay();
    if (!lbAutoplay || !lbOpen) return;
    lbTimer = window.setInterval(function () {
      if (!lbOpen) return;
      lbIndex = (lbIndex + 1) % photos.length;
      renderLightbox();
    }, 3600);
  }

  function setAutoplay(state) {
    lbAutoplay = !!state;
    if (lbAutoplayButton) {
      lbAutoplayButton.classList.toggle('is-playing', lbAutoplay);
      lbAutoplayButton.setAttribute('aria-pressed', String(lbAutoplay));
    }
    if (lbAutoplayLabel) lbAutoplayLabel.textContent = lbAutoplay ? 'Pause' : 'Play';
    if (lbAutoplay) startAutoplayTimer();
    else stopAutoplay();
  }

  function restartAutoplay() {
    if (lbAutoplay) startAutoplayTimer();
  }

  function openLightbox(index, play) {
    if (!lightbox || !photos.length) return;
    lbLastFocus = document.activeElement;
    lbIndex = clamp(Number(index) || 0, 0, photos.length - 1);
    lbOpen = true;
    document.body.classList.add('is-locked');
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    renderLightbox();
    setAutoplay(!!play);
    window.setTimeout(function () {
      if (lbClose) lbClose.focus({ preventScroll: true });
    }, 120);
  }

  function closeLightbox() {
    if (!lightbox || !lbOpen) return;
    lbOpen = false;
    lbLoadToken += 1;
    setAutoplay(false);
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    lbFigure.classList.remove('is-changing', 'is-loading');
    document.title = pageTitle;
    if (lbLastFocus && typeof lbLastFocus.focus === 'function') {
      window.setTimeout(function () {
        lbLastFocus.focus({ preventScroll: true });
      }, 40);
    }
  }

  function goToPhoto(delta) {
    if (!photos.length) return;
    lbIndex = (lbIndex + delta + photos.length) % photos.length;
    renderLightbox();
    restartAutoplay();
  }

  photoCards.forEach(function (card) {
    card.addEventListener('click', function () {
      openLightbox(photoIndexByNumber[card.getAttribute('data-number')], false);
    });
  });

  if (lightbox) {
    buildThumbs();

    $$('[data-close]', lightbox).forEach(function (element) {
      element.addEventListener('click', closeLightbox);
    });

    if (lbClose) lbClose.addEventListener('click', closeLightbox);
    if (lbPrev) lbPrev.addEventListener('click', function () { goToPhoto(-1); });
    if (lbNext) lbNext.addEventListener('click', function () { goToPhoto(1); });
    if (lbAutoplayButton) {
      lbAutoplayButton.addEventListener('click', function () {
        setAutoplay(!lbAutoplay);
      });
    }

    var swipeX = 0;
    var swipeY = 0;
    var swipeActive = false;

    if (lbStage) {
      lbStage.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse') return;
        if (event.target.closest('button')) return;
        swipeActive = true;
        swipeX = event.clientX;
        swipeY = event.clientY;
      });

      lbStage.addEventListener('pointerup', function (event) {
        if (!swipeActive) return;
        swipeActive = false;
        var dx = event.clientX - swipeX;
        var dy = event.clientY - swipeY;
        if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          goToPhoto(dx < 0 ? 1 : -1);
        }
      });

      lbStage.addEventListener('pointercancel', function () {
        swipeActive = false;
      });
    }
  }

  var playReelButton = $('#play-reel');
  if (playReelButton) {
    playReelButton.addEventListener('click', function () {
      openLightbox(0, true);
    });
  }

  var openSlideshowButton = $('#open-slideshow');
  if (openSlideshowButton) {
    openSlideshowButton.addEventListener('click', function () {
      openLightbox(0, true);
    });
  }

  var randomFrameButton = $('#random-frame');
  if (randomFrameButton) {
    randomFrameButton.addEventListener('click', function () {
      if (!photos.length) return;
      var randomIndex = Math.floor(Math.random() * photos.length);
      openLightbox(randomIndex, false);
    });
  }

  /* ----------------------------------------------------------------------
     Keyboard controls
     ---------------------------------------------------------------------- */
  document.addEventListener('keydown', function (event) {
    if (lbOpen) {
      trapFocus(event, lightbox);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPhoto(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToPhoto(1);
      } else if (event.key === ' ' && !event.target.closest('button, a, input, textarea, select')) {
        event.preventDefault();
        setAutoplay(!lbAutoplay);
      }
      return;
    }

    if (menu && menu.classList.contains('is-open')) {
      trapFocus(event, menu);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    }
  });

  /* ----------------------------------------------------------------------
     Hero parallax
     ---------------------------------------------------------------------- */
  var hero = $('.hero');
  var heroCollage = $('.hero__collage');

  if (hero && heroCollage && canHover && !prefersReducedMotion) {
    hero.addEventListener('mousemove', function (event) {
      var rect = hero.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      heroCollage.style.setProperty('--mx', x.toFixed(3));
      heroCollage.style.setProperty('--my', y.toFixed(3));
    });

    hero.addEventListener('mouseleave', function () {
      heroCollage.style.setProperty('--mx', '0');
      heroCollage.style.setProperty('--my', '0');
    });
  }

  /* ----------------------------------------------------------------------
     Active navigation link
     ---------------------------------------------------------------------- */
  var navLinks = $$('.desktop-nav a');
  var navTargets = {};

  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;
    navTargets[href.slice(1)] = link;
  });

  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var activeLink = navTargets[entry.target.id];
          if (!activeLink) return;
          navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link === activeLink);
          });
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );

    Object.keys(navTargets).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) navObserver.observe(section);
    });
  }

  /* ----------------------------------------------------------------------
     Keep body class in sync on unload-free navigation
     ---------------------------------------------------------------------- */
  window.addEventListener('pageshow', function () {
    document.body.classList.remove('is-locked');
  });
})();
