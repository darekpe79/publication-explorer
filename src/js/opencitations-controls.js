(() => {
  "use strict";

  function language() {
    return window.JournexisI18n?.getLanguage?.() || document.documentElement.lang || "pl";
  }

  function labels(kind, open) {
    const en = language() === "en";
    if (kind === "citations") {
      if (en) return open ? "Hide citing publications" : "Show citing publications";
      return open ? "Ukryj publikacje cytujące" : "Pokaż publikacje cytujące";
    }
    if (en) return open ? "Hide references" : "Show references";
    return open ? "Ukryj bibliografię" : "Pokaż bibliografię";
  }

  function ensureStyles() {
    if (document.getElementById("journexis-opencitations-controls-styles")) return;
    const style = document.createElement("style");
    style.id = "journexis-opencitations-controls-styles";
    style.textContent = `
      .opencitations-button[aria-expanded="true"] {
        background: #eef2ff;
        border-color: #8b8ae8;
        box-shadow: inset 0 0 0 1px #8b8ae8;
      }
      .opencitations-button:disabled {
        cursor: wait;
        opacity: .7;
      }
    `;
    document.head.appendChild(style);
  }

  function syncPanel(panel) {
    if (!panel) return;
    panel.querySelectorAll(".opencitations-button[data-oc-list]").forEach(button => {
      const kind = button.dataset.ocList;
      const target = panel.querySelector(`[data-oc-target="${kind}"]`);
      const open = Boolean(target && !target.hidden);
      const expanded = open ? "true" : "false";
      const label = labels(kind, open);
      if (button.getAttribute("aria-expanded") !== expanded) {
        button.setAttribute("aria-expanded", expanded);
      }
      if (button.textContent !== label) {
        button.textContent = label;
      }
    });
  }

  function closeOtherList(panel, keepKind) {
    panel.querySelectorAll("[data-oc-target]").forEach(target => {
      if (target.dataset.ocTarget !== keepKind && !target.hidden) {
        target.hidden = true;
      }
    });
  }

  document.addEventListener("click", event => {
    const button = event.target.closest?.(".opencitations-button[data-oc-list]");
    if (!button) return;
    const panel = button.closest(".opencitations-panel");
    if (!panel) return;

    const kind = button.dataset.ocList;
    window.setTimeout(() => {
      const target = panel.querySelector(`[data-oc-target="${kind}"]`);
      if (target && !target.hidden) closeOtherList(panel, kind);
      syncPanel(panel);
    }, 0);
  });

  document.addEventListener("journexis:languagechange", () => {
    window.setTimeout(() => {
      document.querySelectorAll(".opencitations-panel").forEach(syncPanel);
    }, 0);
  });

  function init() {
    ensureStyles();
    document.querySelectorAll(".opencitations-panel").forEach(syncPanel);

    const result = document.getElementById("result");
    if (!result) return;

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.(".opencitations-panel")) syncPanel(node);
          node.querySelectorAll?.(".opencitations-panel").forEach(syncPanel);
        }
      }
    });
    observer.observe(result, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
