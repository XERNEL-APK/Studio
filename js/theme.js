/**
 * theme.js
 * The *initial* theme is set synchronously by a tiny inline script in <head>
 * (before CSS paints) to avoid a flash of the wrong theme. This file only
 * wires up the toggle button(s) going forward and keeps localStorage,
 * system preference, and the [data-theme] attribute in sync.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "xernel-theme";
  // Mirrors --color-background from style.css for the <meta name="theme-color"> tag.
  var THEME_COLORS = { dark: "#080A08", light: "#F6F8F3" };

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function store(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      /* localStorage unavailable (private mode, etc.) — theme still applies for this session */
    }
  }

  function applyThemeColorMeta(theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.dark);
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function setTheme(theme, opts) {
    document.documentElement.setAttribute("data-theme", theme);
    applyThemeColorMeta(theme);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
      btn.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
    });
    if (!opts || opts.persist !== false) store(theme);
  }

  function toggleTheme() {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  }

  function init() {
    applyThemeColorMeta(currentTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });

    // Follow the OS preference live, but only while the person hasn't made an explicit choice.
    if (window.matchMedia) {
      var media = window.matchMedia("(prefers-color-scheme: light)");
      var onChange = function (e) {
        if (!getStored()) setTheme(e.matches ? "light" : "dark", { persist: false });
      };
      if (media.addEventListener) media.addEventListener("change", onChange);
      else if (media.addListener) media.addListener(onChange); // Safari <14
    }

    // aria-pressed needs an initial value even before any click.
    setTheme(currentTheme(), { persist: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
