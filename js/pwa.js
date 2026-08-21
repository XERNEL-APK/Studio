/**
 * pwa.js — registers sw.js when supported. A no-op everywhere else,
 * including when opened directly via file:// during local development.
 */
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol === "file:") return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (err) {
      console.warn("[XERNEL APK] Service worker registration failed:", err.message || err);
    });
  });
})();
