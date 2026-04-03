(function () {
  'use strict';

  const PROTECTED_PATHS = new Set([
    '/index.html',
    '/messages.html',
    '/insights.html',
    '/uploads.html',
    '/settings.html',
    '/compose.html'
  ]);

  const PAGE_LABELS = {
    '/index.html': 'Members Area',
    '/messages.html': 'Messages Inbox',
    '/insights.html': 'Insights Archive',
    '/uploads.html': 'Resume Uploads',
    '/settings.html': 'Account Settings',
    '/compose.html': 'Compose Message'
  };

  const PREFETCH_PATHS = ['/messages.html', '/insights.html', '/uploads.html', '/settings.html'];
  const MIN_LOADER_MS = 240;
  let overlayEl = null;
  let prefetchDone = false;
  let navigating = false;

  function isSameOrigin(url) {
    try {
      return url.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function normalizePath(pathname) {
    if (!pathname || pathname === '/') return '/index.html';
    return pathname;
  }

  function isProtectedPath(pathname) {
    return PROTECTED_PATHS.has(normalizePath(pathname));
  }

  function isAuthenticatedUiVisible() {
    const signOutBtn = document.getElementById('signOutBtn');
    const signOutVisible = !!(signOutBtn && signOutBtn.offsetParent !== null && getComputedStyle(signOutBtn).display !== 'none');

    const topNavMenu = document.getElementById('topNavMenu');
    const topNavVisible = !!(topNavMenu && topNavMenu.offsetParent !== null && getComputedStyle(topNavMenu).display !== 'none');

    const loginSection = document.getElementById('login-section');
    const protectedContent = document.getElementById('protected-content') || document.getElementById('dashboard');
    const loggedInShellVisible = !!(protectedContent && protectedContent.offsetParent !== null) && !(loginSection && loginSection.offsetParent !== null);

    return signOutVisible || topNavVisible || loggedInShellVisible;
  }

  function ensureOverlay() {
    if (overlayEl) return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.className = 'page-transition-overlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.innerHTML = '<div class="page-transition-card" role="status" aria-live="polite"><span class="page-transition-spinner" aria-hidden="true"></span><span class="page-transition-label">Opening secure page…</span></div>';
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function setOverlayLabel(text) {
    const node = ensureOverlay();
    const label = node.querySelector('.page-transition-label');
    if (!label) return;
    label.textContent = text || 'Opening secure page…';
  }

  function showOverlay() {
    const node = ensureOverlay();
    document.body.classList.add('page-transition-leaving');
    node.classList.add('active');
  }

  function hideOverlay() {
    if (!overlayEl) return;
    document.body.classList.remove('page-transition-leaving');
    overlayEl.classList.remove('active');
    setOverlayLabel('Opening secure page…');
  }

  function canHandleAnchor(anchor, event) {
    if (!anchor || navigating) return false;
    if (event.defaultPrevented) return false;
    if (event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;

    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;

    let targetUrl;
    try {
      targetUrl = new URL(anchor.href, window.location.href);
    } catch (e) {
      return false;
    }

    if (!isSameOrigin(targetUrl)) return false;
    if (!isProtectedPath(targetUrl.pathname)) return false;

    const currentPath = normalizePath(window.location.pathname);
    const targetPath = normalizePath(targetUrl.pathname);
    if (currentPath === targetPath && targetUrl.hash === window.location.hash) return false;

    return targetUrl;
  }

  function getDestinationLabel(anchor, targetUrl) {
    const pathLabel = PAGE_LABELS[normalizePath(targetUrl.pathname)];
    if (pathLabel) return 'Opening ' + pathLabel + '…';

    const anchorText = (anchor && anchor.textContent ? anchor.textContent : '').trim();
    if (anchorText) return 'Opening ' + anchorText + '…';

    return 'Opening secure page…';
  }

  function prefetchProtectedPages() {
    if (prefetchDone || !isAuthenticatedUiVisible()) return;
    prefetchDone = true;

    PREFETCH_PATHS.forEach(function (path) {
      if (normalizePath(window.location.pathname) === path) return;
      if (document.querySelector('link[rel="prefetch"][href="' + path + '"]')) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = path;
      link.as = 'document';
      document.head.appendChild(link);
    });
  }

  function handleClick(event) {
    const anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    const targetUrl = canHandleAnchor(anchor, event);
    if (!targetUrl || !isAuthenticatedUiVisible()) return;

    event.preventDefault();
    navigating = true;
    setOverlayLabel(getDestinationLabel(anchor, targetUrl));
    showOverlay();

    const start = Date.now();
    const navigate = function () {
      const elapsed = Date.now() - start;
      const delay = Math.max(0, MIN_LOADER_MS - elapsed);
      window.setTimeout(function () {
        window.location.assign(targetUrl.href);
      }, delay);
    };

    if (typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      try {
        document.startViewTransition(function () { });
      } catch (e) { }
    }

    navigate();
  }

  function schedulePrefetchRetries() {
    for (let i = 1; i <= 6; i += 1) {
      window.setTimeout(prefetchProtectedPages, i * 700);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    ensureOverlay();
    document.addEventListener('click', handleClick, true);
    prefetchProtectedPages();
    schedulePrefetchRetries();
  });

  window.addEventListener('pageshow', function () {
    navigating = false;
    hideOverlay();
  });
})();
