/**
 * app.js
 * Home page orchestration: loads apps.json + every application JSON,
 * renders the featured hero and the application grid, then wires the
 * header search box + category/sort controls via search.js.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var Store = window.XernelStore;
    Store.initMobileNav();
    Store.initSearchShortcut();

    var els = {
      grid: document.getElementById("apps-grid"),
      searchInput: document.getElementById("header-search-input"),
      searchField: document.getElementById("header-search-field"),
      searchClear: document.getElementById("header-search-clear"),
      resultCount: document.getElementById("result-count")
    };

    if (els.grid) els.grid.replaceChildren(Store.renderSkeletonCards(6));

    Store.loadAllApps().then(function (result) {
      if (!result.ok) return renderLoadError(els);
      var apps = result.apps;
      if (!apps.length) return renderEmptyStore(els);

      var controller = window.XernelSearch.createController(apps, {
        onChange: function (list) { renderGrid(els, list, apps.length); }
      });
      controller.mount(els);
      controller.emit();
    });
  });

  function renderGrid(els, list, totalCount) {
    var Store = window.XernelStore;
    if (!els.grid) return;

    if (els.resultCount) {
      els.resultCount.textContent =
        list.length === totalCount
          ? totalCount + (totalCount === 1 ? " application" : " applications")
          : list.length + " of " + totalCount + " applications";
    }

    if (!list.length) {
      els.grid.replaceChildren(
        Store.renderStatePanel({
          icon: "box",
          title: "No applications found",
          desc: "Try a different search term or choose another category."
        })
      );
      return;
    }
    els.grid.replaceChildren.apply(els.grid, list.map(function (app) { return Store.renderAppCard(app, "h2"); }));
  }

  function renderLoadError(els) {
    var Store = window.XernelStore;
    if (els.grid) {
      els.grid.replaceChildren(
        Store.renderStatePanel({
          icon: "alert",
          title: "Unable to load applications",
          desc: "Please try again later."
        })
      );
    }
  }

  function renderEmptyStore(els) {
    var Store = window.XernelStore;
    if (els.grid) {
      els.grid.replaceChildren(
        Store.renderStatePanel({
          icon: "box",
          title: "No applications yet",
          desc: "Check back soon — new applications will appear here as they're published."
        })
      );
    }
  }
})();
