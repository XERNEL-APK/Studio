/**
 * app-details.js
 * Reads ?id= from the URL, finds the matching application, and renders
 * every section of the details page: about, screenshots + lightbox, app
 * info, what's new, SHA-256 verification, developer, and related apps.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var Store = window.XernelStore;
    Store.initMobileNav();
    Store.initSearchShortcut();
    Store.initHeaderSearchNav("header-search-input", "header-search-clear", "header-search-field");

    var id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      showNotFound();
      return;
    }

    Store.loadAllApps().then(function (result) {
      if (!result.ok) {
        showNotFound("We couldn't load the store catalog. Please try again later.");
        return;
      }
      var app = result.apps.filter(function (a) { return a.id === id; })[0];
      if (!app) {
        showNotFound();
        return;
      }
      renderApp(app, result.apps);
    });
  });

  function hideSkeleton() {
    var skeleton = document.getElementById("detail-skeleton");
    if (skeleton) skeleton.hidden = true;
  }

  function showNotFound(message) {
    var Store = window.XernelStore;
    hideSkeleton();
    document.title = "Application Not Found — XERNEL APK";
    var content = document.getElementById("app-content");
    var notFound = document.getElementById("not-found-panel");
    if (content) content.hidden = true;
    if (notFound) {
      notFound.hidden = false;
      notFound.replaceChildren(
        Store.renderStatePanel({
          icon: "alert",
          title: "Application Not Found",
          desc: message || "This application doesn't exist, or it may have been removed.",
          actionLabel: "Back to Store",
          actionHref: "index.html"
        })
      );
    }
  }

  function renderApp(app, allApps) {
    hideSkeleton();
    var content = document.getElementById("app-content");
    if (content) content.hidden = false;

    updateMeta(app);
    setText("detail-category", app.category);
    setText("detail-name", app.name);
    setText("detail-desc", app.shortDescription);
    setImg("detail-cover-img", app.cover, app.name + " cover art");
    setImg("detail-icon", app.icon, app.name + " icon");

    renderActions(app);
    renderAbout(app);
    renderScreenshotsSection(app);
    renderInfo(app);
    renderWhatsNew(app);
    renderRelated(app, allApps);
    initStickyDownload(app);
  }

  // ---------------------------------------------------------- utilities --

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value || "";
  }

  function setImg(id, src, alt) {
    var el = document.getElementById(id);
    if (el && src) {
      el.src = src;
      el.alt = alt;
    }
  }

  function setMeta(selector, content) {
    var el = document.querySelector(selector);
    if (el && content) el.setAttribute("content", content);
  }

  var SITE_BASE = "https://xernel-apk.github.io/studio/";

  function updateMeta(app) {
    document.title = app.name + " — XERNEL APK";
    setMeta('meta[name="description"]', app.shortDescription);
    setMeta('meta[property="og:title"]', app.name + " — XERNEL APK");
    setMeta('meta[property="og:description"]', app.shortDescription);

    var pageUrl = SITE_BASE + "app.html?id=" + encodeURIComponent(app.id);
    setMeta('meta[property="og:url"]', pageUrl);
    var canonical = document.getElementById("canonical-link");
    if (canonical) canonical.setAttribute("href", pageUrl);

    if (app.icon) setMeta('meta[property="og:image"]', toSiteUrl(app.icon));
    setJsonLd(app);
  }

  function toSiteUrl(relativePath) {
    return SITE_BASE + String(relativePath).replace(/^\.?\//, "");
  }

  function setJsonLd(app) {
    var existing = document.getElementById("app-jsonld");
    if (existing) existing.remove();

    var data = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": app.name,
      "description": app.description || app.shortDescription,
      "applicationCategory": app.category,
      "operatingSystem": "Android" + (app.requirements && app.requirements.android ? " " + app.requirements.android : ""),
      "softwareVersion": app.version,
      "url": SITE_BASE + "app.html?id=" + encodeURIComponent(app.id)
    };
    if (app.icon) data.image = toSiteUrl(app.icon);
    if (app.developer && app.developer.name) data.author = { "@type": "Organization", "name": app.developer.name };
    if (app.published) data.datePublished = app.published;
    if (app.updated) data.dateModified = app.updated;
    if (app.apk && app.apk.size) data.fileSize = app.apk.size;
    data.offers = { "@type": "Offer", "price": "0", "priceCurrency": "USD" };

    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "app-jsonld";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  // ------------------------------------------------------------ sections -

  function renderActions(app) {
    var Store = window.XernelStore;
    var wrap = document.getElementById("detail-actions");
    if (!wrap) return;
    wrap.replaceChildren();

    var hasApk = !!(app.apk && app.apk.url);
    wrap.appendChild(
      hasApk
        ? Store.h("a", { class: "btn btn--primary btn--lg", href: app.apk.url, target: "_blank", rel: "noopener noreferrer" }, [
            Store.icon("download"),
            Store.h("span", { text: "Download APK" })
          ])
        : Store.h("button", { class: "btn btn--primary btn--lg", type: "button", disabled: "disabled", title: "Download link unavailable" }, [
            Store.icon("download"),
            Store.h("span", { text: "Download Unavailable" })
          ])
    );

    if (hasApk) {
      var copyBtn = Store.h("button", { class: "btn btn--secondary btn--lg", type: "button" }, [
        Store.icon("copy"),
        Store.h("span", { "data-btn-label": "", text: "Copy Download Link" })
      ]);
      copyBtn.addEventListener("click", function () {
        copyToClipboard(app.apk.url)
          .then(function () {
            flashCopied(copyBtn, "Copy Download Link");
            showToast("Download link copied");
          })
          .catch(function () { showToast("Couldn't copy — select the link manually"); });
      });
      wrap.appendChild(copyBtn);
    }

    var shareBtn = Store.h("button", { class: "btn btn--secondary btn--lg", type: "button" }, [
      Store.icon("share"),
      Store.h("span", { "data-btn-label": "", text: "Share" })
    ]);
    shareBtn.addEventListener("click", function () {
      var shareUrl = SITE_BASE + "share/" + encodeURIComponent(app.id) + ".html";
      copyToClipboard(shareUrl)
        .then(function () {
          flashCopied(shareBtn, "Share");
          showToast("Share link copied — shows " + app.name + "'s preview on WhatsApp, Telegram, etc.");
        })
        .catch(function () { showToast("Couldn't copy — select the link manually"); });
    });
    wrap.appendChild(shareBtn);
  }

  function renderAbout(app) {
    setText("about-text", app.description || app.shortDescription);
  }

  function renderScreenshotsSection(app) {
    var Store = window.XernelStore;
    var section = document.getElementById("screenshots-section");
    var host = document.getElementById("screenshots-track-host");
    var shots = Array.isArray(app.screenshots) ? app.screenshots : [];
    if (!shots.length || !host) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;

    var built = Store.renderScreenshots(app);
    host.replaceChildren(built.track);

    var lightbox = initLightbox(app.name, built.sources);
    built.track.querySelectorAll(".screenshot-thumb").forEach(function (btn, i) {
      btn.addEventListener("click", function () { lightbox.open(i); });
    });
  }

  function renderInfo(app) {
    var Store = window.XernelStore;
    var host = document.getElementById("app-info");
    if (host) host.replaceChildren(Store.renderAppInformation(app));
  }

  function renderWhatsNew(app) {
    var Store = window.XernelStore;
    var section = document.getElementById("whats-new-section");
    var notes = Array.isArray(app.releaseNotes) ? app.releaseNotes : [];
    if (!notes.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    setText("whats-new-version", "Version " + app.version);
    var list = document.getElementById("whats-new-list");
    if (list) list.replaceChildren.apply(list, notes.map(function (note) { return Store.h("li", { text: note }); }));
  }

  function renderRelated(app, allApps) {
    var Store = window.XernelStore;
    var section = document.getElementById("related-section");
    var related = Store.getRelatedApps(app, allApps, 3);
    if (!related.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    var grid = document.getElementById("related-grid");
    if (grid) grid.replaceChildren.apply(grid, related.map(function (app) { return Store.renderAppCard(app, "h3"); }));
  }

  function initStickyDownload(app) {
    var bar = document.getElementById("sticky-download");
    if (!bar) return;
    var hasApk = app.apk && app.apk.url;
    if (!hasApk) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    setText("sticky-download-name", app.name);
    setText("sticky-download-size", app.apk.size || "");
    var link = document.getElementById("sticky-download-link");
    if (link) link.href = app.apk.url;
  }

  // ------------------------------------------------------------ lightbox -

  function initLightbox(appName, sources) {
    var root = document.getElementById("lightbox");
    var img = document.getElementById("lightbox-img");
    var caption = document.getElementById("lightbox-caption");
    var closeBtn = document.getElementById("lightbox-close");
    var prevBtn = document.getElementById("lightbox-prev");
    var nextBtn = document.getElementById("lightbox-next");
    var index = 0;
    var lastFocused = null;

    function show(i) {
      index = (i + sources.length) % sources.length;
      img.src = sources[index];
      img.alt = appName + " screenshot " + (index + 1);
      caption.textContent = (index + 1) + " / " + sources.length;
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
    }

    function open(i) {
      lastFocused = document.activeElement;
      show(i);
      root.classList.add("is-open");
      root.hidden = false;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKeydown);
      closeBtn.focus();
    }

    function close() {
      root.classList.remove("is-open");
      root.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", function () { show(index - 1); });
    nextBtn.addEventListener("click", function () { show(index + 1); });
    root.addEventListener("click", function (e) { if (e.target === root) close(); });

    return { open: open, close: close };
  }

  // ------------------------------------------------------ clipboard/toast -

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function flashCopied(btn, originalLabel) {
    var label = btn.querySelector("[data-btn-label]");
    btn.classList.add("btn--copied");
    if (label) label.textContent = "Copied!";
    clearTimeout(btn._resetTimer);
    btn._resetTimer = setTimeout(function () {
      btn.classList.remove("btn--copied");
      if (label) label.textContent = originalLabel;
    }, 1800);
  }

  function showToast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2200);
  }
})();
