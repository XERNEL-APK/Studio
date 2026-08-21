/**
 * sw.js — minimal offline support for XERNEL APK.
 * No build step: this file is hand-written and served as-is, like everything
 * else in this project. Bump CACHE_VERSION when shell files change so old
 * caches get cleaned up on the next visit.
 */
"use strict";

var CACHE_VERSION = "xernel-v1";
var SHELL_CACHE = CACHE_VERSION + "-shell";
var DATA_CACHE = CACHE_VERSION + "-data";
var IMAGE_CACHE = CACHE_VERSION + "-images";

var SHELL_FILES = [
  "index.html",
  "app.html",
  "404.html",
  "css/style.css",
  "css/responsive.css",
  "js/theme.js",
  "js/store.js",
  "js/search.js",
  "js/app.js",
  "js/app-details.js",
  "manifest.json",
  "assets/logo.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.addAll(SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  var keep = [SHELL_CACHE, DATA_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return keep.indexOf(key) === -1; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isDataRequest(url) {
  return url.pathname.indexOf("/data/") !== -1 && url.pathname.endsWith(".json");
}

function isImageRequest(url) {
  return url.pathname.indexOf("/assets/") !== -1;
}

// Network-first, falling back to cache — used for HTML navigations and JSON
// data, where freshness matters more than speed.
function networkFirst(request, cacheName) {
  return fetch(request)
    .then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    })
    .catch(function () { return caches.match(request); });
}

// Cache-first, falling back to network — used for app icons/covers/
// screenshots, which almost never change once published.
function cacheFirst(request, cacheName) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    });
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin (e.g. GitHub Releases APKs)

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).then(function (response) {
        return response || caches.match("index.html");
      })
    );
    return;
  }

  if (isDataRequest(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (isImageRequest(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) { return cached || fetch(request); })
  );
});
