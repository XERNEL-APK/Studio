/**
 * search.js
 * Owns the search query state (read from / written to the URL as ?q=) and
 * notifies a callback with the filtered list whenever it changes. Results
 * are always returned in the store's default order (most recently updated
 * first). Rendering itself stays in store.js / app.js.
 */
(function () {
  "use strict";

  function normalize(value) {
    return (value || "").toString().toLowerCase();
  }

  function appMatchesQuery(app, query) {
    if (!query) return true;
    var q = normalize(query);
    var haystacks = [
      app.name,
      app.shortDescription,
      app.description,
      app.category,
      app.developer && app.developer.name,
      Array.isArray(app.tags) ? app.tags.join(" ") : ""
    ];
    return haystacks.some(function (field) { return normalize(field).indexOf(q) !== -1; });
  }

  function filterApps(apps, state) {
    return apps.filter(function (app) { return appMatchesQuery(app, state.query); });
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function readStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return { query: params.get("q") || "" };
  }

  function writeStateToUrl(state) {
    var params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    var qs = params.toString();
    var url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    window.history.replaceState(null, "", url);
  }

  /**
   * @param {Array} apps - full, unfiltered app list for this page
   * @param {Object} opts - { onChange(filteredApps, state), syncUrl?: boolean }
   */
  function createController(apps, opts) {
    var syncUrl = opts.syncUrl !== false;
    var state = syncUrl ? readStateFromUrl() : { query: "" };
    var Store = window.XernelStore;

    function emit() {
      var filtered = filterApps(apps, state);
      if (syncUrl) writeStateToUrl(state);
      opts.onChange(Store.sortApps(filtered), state);
    }

    function mount(els) {
      if (els.searchInput) {
        if (state.query) {
          els.searchInput.value = state.query;
          if (els.searchField) els.searchField.classList.add("has-value");
        }
        els.searchInput.addEventListener(
          "input",
          debounce(function (e) {
            state.query = e.target.value;
            if (els.searchField) els.searchField.classList.toggle("has-value", !!state.query);
            emit();
          }, 150)
        );
      }

      if (els.searchClear) {
        els.searchClear.addEventListener("click", function () {
          state.query = "";
          if (els.searchInput) {
            els.searchInput.value = "";
            els.searchInput.focus();
          }
          if (els.searchField) els.searchField.classList.remove("has-value");
          emit();
        });
      }
    }

    return { mount: mount, emit: emit, getState: function () { return state; } };
  }

  window.XernelSearch = { filterApps: filterApps, createController: createController };
})();
