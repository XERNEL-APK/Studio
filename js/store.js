/**
 * store.js
 * Data loading + validation (manifest-driven, per GitHub Pages' lack of
 * directory listing) and every reusable rendering function shared between
 * the home page and the application details page.
 *
 * Exposes a single global: window.XernelStore
 */
(function () {
  "use strict";

  var REQUIRED_FIELDS = ["id", "name", "shortDescription", "version", "category", "icon"];

  // ---------------------------------------------------------------- DOM ---

  /** Minimal hyperscript-style element builder. Never touches innerHTML with data. */
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var val = attrs[key];
        if (val == null || val === false) return;
        if (key === "class") node.className = val;
        else if (key === "text") node.textContent = val;
        else if (key.indexOf("on") === 0 && typeof val === "function") node.addEventListener(key.slice(2), val);
        else node.setAttribute(key, val);
      });
    }
    (children || []).forEach(function (child) {
      if (child == null || child === false) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  // -------------------------------------------------------------- icons ---
  // Hand-authored inline SVGs only — no icon libraries or CDNs. These strings
  // are fixed, developer-authored markup (never JSON/user data), so innerHTML
  // is safe here even though it is avoided everywhere else in this file.

  var ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7.5-3.5 7.5-9.5V5.6L12 3l-7.5 2.6v5.9C4.5 17.5 12 21 12 21Z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.87-2.78.62-3.37-1.19-3.37-1.19-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.36 1.11 2.94.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.32.1-2.75 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.43.2 2.49.1 2.75.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.5 18.8 19.7c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8.1c.4-.3-.1-.5-.6-.2L6.5 12.9l-4.8-1.5c-1-.3-1-1 .2-1.5L20.6 3.4c.9-.3 1.6.2 1.3 1.1Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5H16l.4-3H13.5V8.4c0-.9.25-1.5 1.55-1.5H16.5V4.3c-.27-.04-1.2-.12-2.28-.12-2.26 0-3.8 1.38-3.8 3.9V10.5H8v3h2.42V21h3.08Z"/></svg>'
  };

  function iconEl(name) {
    var wrap = document.createElement("span");
    wrap.innerHTML = ICONS[name] || "";
    var svg = wrap.firstElementChild;
    if (svg) svg.setAttribute("aria-hidden", "true");
    return svg || wrap;
  }

  // ------------------------------------------------------------ helpers ---

  function dateVal(iso) {
    var t = iso ? new Date(iso).getTime() : NaN;
    return isNaN(t) ? 0 : t;
  }

  function formatDate(iso) {
    var t = dateVal(iso);
    if (!t) return "";
    try {
      return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(t));
    } catch (err) {
      return iso;
    }
  }

  function computeBadge(app) {
    var now = Date.now();
    var DAY = 86400000;
    var published = dateVal(app.published);
    var updated = dateVal(app.updated);
    if (published && (now - published) / DAY <= 21 && (now - published) >= 0) return "new";
    if (updated && (now - updated) / DAY <= 14 && (now - updated) >= 0 && updated !== published) return "updated";
    return null;
  }

  // -------------------------------------------------------------- cache ---
  // Short-TTL cache so navigating home -> detail -> home doesn't re-fetch
  // every JSON file each time. Falls back silently if storage is unavailable
  // (private browsing, quota, etc.) — the store just fetches fresh instead.

  var CACHE_KEY = "xernel-apps-cache-v1";
  var CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.apps) || typeof parsed.savedAt !== "number") return null;
      if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
      return parsed.apps;
    } catch (err) {
      return null;
    }
  }

  function writeCache(apps) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), apps: apps }));
    } catch (err) {
      /* storage unavailable or full — caching is an optimization, not a requirement */
    }
  }

  // -------------------------------------------------------- data loading --

  function fetchJSON(path) {
    return fetch(path, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + path);
        return res.json();
      })
      .catch(function (err) {
        console.warn("[XERNEL APK] Failed to load", path, "—", err.message || err);
        return null;
      });
  }

  function isValidApp(app, source) {
    var missing = REQUIRED_FIELDS.filter(function (field) {
      return app[field] == null || app[field] === "";
    });
    if (missing.length) {
      console.warn("[XERNEL APK] Skipping " + source + " — missing required field(s): " + missing.join(", "));
      return false;
    }
    return true;
  }

  function loadAllApps() {
    var cached = readCache();
    if (cached) return Promise.resolve({ ok: true, apps: cached, fromCache: true });

    return fetchJSON("data/apps.json").then(function (manifest) {
      if (!manifest || !Array.isArray(manifest)) {
        return { ok: false, apps: [] };
      }
      return Promise.all(
        manifest.map(function (rel) {
          return fetchJSON("data/" + rel).then(function (data) {
            return { rel: rel, data: data };
          });
        })
      ).then(function (results) {
        var apps = [];
        results.forEach(function (r) {
          if (r.data && isValidApp(r.data, r.rel)) apps.push(r.data);
        });
        writeCache(apps);
        return { ok: true, apps: apps };
      });
    });
  }

  // ------------------------------------------------------- data queries ---

  function getRelatedApps(app, apps, limit) {
    limit = limit || 3;
    var appTags = Array.isArray(app.tags) ? app.tags : [];
    var scored = apps
      .filter(function (a) { return a.id !== app.id; })
      .map(function (a) {
        var score = a.category === app.category ? 3 : 0;
        var aTags = Array.isArray(a.tags) ? a.tags : [];
        aTags.forEach(function (t) { if (appTags.indexOf(t) !== -1) score += 1; });
        return { app: a, score: score };
      })
      .filter(function (s) { return s.score > 0; })
      .sort(function (x, y) { return y.score - x.score; });
    return scored.slice(0, limit).map(function (s) { return s.app; });
  }

  function sortApps(apps) {
    return apps.slice().sort(function (a, b) { return dateVal(b.updated) - dateVal(a.updated); });
  }

  // ------------------------------------------------------------ render ---

  function renderAppCard(app, headingTag) {
    var badge = computeBadge(app);
    var badges = [];
    if (badge === "new") badges.push(h("span", { class: "badge badge--new", text: "New" }));
    if (badge === "updated") badges.push(h("span", { class: "badge badge--updated", text: "Updated" }));

    return h("a", {
      class: "app-card",
      href: "app.html?id=" + encodeURIComponent(app.id),
      "aria-label": app.name + " — " + app.category + ", version " + app.version
    }, [
      badges.length ? h("div", { class: "app-card__badges" }, badges) : null,
      h("div", { class: "app-card__top" }, [
        h("img", { class: "app-card__icon", src: app.icon, alt: app.name + " icon", loading: "lazy", decoding: "async", width: "60", height: "60" }),
        h("div", { class: "app-card__heading" }, [
          h(headingTag || "h3", { class: "app-card__title", text: app.name }),
          h("div", { class: "app-card__category", text: app.category })
        ])
      ]),
      h("p", { class: "app-card__desc", text: app.shortDescription }),
      h("div", { class: "app-card__footer" }, [
        h("span", { text: "v" + app.version }),
        h("span", { text: (app.apk && app.apk.size) || "" })
      ])
    ]);
  }

  function renderScreenshots(app) {
    var shots = Array.isArray(app.screenshots) ? app.screenshots : [];
    var track = h("div", { class: "screenshot-gallery__track", role: "group", "aria-label": app.name + " screenshots" });
    shots.forEach(function (src, i) {
      track.appendChild(h("button", {
        class: "screenshot-thumb",
        type: "button",
        "data-index": String(i),
        "aria-label": "Open screenshot " + (i + 1) + " of " + shots.length + " full screen"
      }, [h("img", { src: src, alt: app.name + " screenshot " + (i + 1), loading: i === 0 ? "eager" : "lazy", decoding: "async" })]));
    });
    return { track: track, sources: shots };
  }

  function renderAppInformation(app) {
    var rows = [];
    function row(label, value) {
      if (value == null || value === "") return;
      rows.push(h("div", { class: "info-row" }, [h("dt", { text: label }), h("dd", { text: value })]));
    }
    row("Version", app.version);
    row("Version code", app.versionCode != null ? String(app.versionCode) : null);
    row("APK size", app.apk && app.apk.size);
    row("Android version", app.requirements && app.requirements.android);
    row("Architecture", app.requirements && Array.isArray(app.requirements.architecture) ? app.requirements.architecture.join(", ") : null);
    row("Category", app.category);
    row("Published", app.published ? formatDate(app.published) : null);
    row("Last updated", app.updated ? formatDate(app.updated) : null);
    row("Developer", app.developer && app.developer.name);
    return h("dl", { class: "info-table" }, rows);
  }

  function renderSkeletonCards(count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      frag.appendChild(h("div", { class: "skeleton-card" }, [
        h("div", { class: "skeleton skeleton-icon" }),
        h("div", { class: "skeleton skeleton-line" }),
        h("div", { class: "skeleton skeleton-line skeleton-line--sm" })
      ]));
    }
    return frag;
  }

  function renderStatePanel(opts) {
    return h("div", { class: "state-panel" }, [
      h("div", { class: "state-panel__icon" }, [iconEl(opts.icon || "box")]),
      h("h3", { class: "state-panel__title", text: opts.title }),
      h("p", { class: "state-panel__desc", text: opts.desc }),
      opts.actionLabel ? h("a", { class: "btn btn--primary", href: opts.actionHref || "index.html" }, [opts.actionLabel]) : null
    ]);
  }

  function initMobileNav() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var drawer = document.getElementById("mobile-drawer");
    if (!toggle || !drawer) return;

    function setOpen(isOpen) {
      drawer.classList.toggle("is-open", isOpen);
      toggle.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      drawer.hidden = !isOpen;
    }

    toggle.addEventListener("click", function () { setOpen(!drawer.classList.contains("is-open")); });
    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  function initHeaderSearchNav(inputId, clearId, fieldId) {
    var input = document.getElementById(inputId);
    var clearBtn = document.getElementById(clearId);
    var field = document.getElementById(fieldId);
    if (!input) return;

    function go() {
      var q = input.value.trim();
      window.location.href = "index.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    }

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        go();
      }
    });
    input.addEventListener("input", function () {
      if (field) field.classList.toggle("has-value", !!input.value);
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        if (field) field.classList.remove("has-value");
        input.focus();
      });
    }
  }

  function initSearchShortcut(inputId) {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      var active = document.activeElement;
      var tag = active && active.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (active && active.isContentEditable)) return;
      var input = document.getElementById(inputId || "header-search-input");
      if (!input) return;
      e.preventDefault();
      input.focus();
    });
  }

  window.XernelStore = {
    h: h,
    icon: iconEl,
    initMobileNav: initMobileNav,
    initHeaderSearchNav: initHeaderSearchNav,
    initSearchShortcut: initSearchShortcut,
    loadAllApps: loadAllApps,
    getRelatedApps: getRelatedApps,
    sortApps: sortApps,
    formatDate: formatDate,
    renderAppCard: renderAppCard,
    renderScreenshots: renderScreenshots,
    renderAppInformation: renderAppInformation,
    renderSkeletonCards: renderSkeletonCards,
    renderStatePanel: renderStatePanel
  };
})();
