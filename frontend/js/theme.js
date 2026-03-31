/**
 * UI 主题：像素 / 柔和 / 夜青 / 纸本
 * 使用 html[data-ui-theme]
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "starOfficeUiTheme";
  var ORDER = ["pixel", "soft", "midnight", "paper"];
  var LABELS = {
    pixel: "像素",
    soft: "柔和",
    midnight: "夜青",
    paper: "纸本"
  };

  function normalize(raw) {
    if (raw === "soft" || raw === "midnight" || raw === "paper" || raw === "pixel") {
      return raw;
    }
    return "pixel";
  }

  function apply(theme) {
    var t = normalize(theme);
    document.documentElement.setAttribute("data-ui-theme", t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch (e) {}
    return t;
  }

  function current() {
    return normalize(document.documentElement.getAttribute("data-ui-theme") || "pixel");
  }

  function cycle() {
    var i = ORDER.indexOf(current());
    if (i < 0) i = 0;
    return apply(ORDER[(i + 1) % ORDER.length]);
  }

  function syncButton() {
    var btn = document.getElementById("style-toggle");
    if (!btn) return;
    var th = current();
    var themeLabel = LABELS[th];
    var I = global.StarOfficeI18n;
    if (I && typeof I.t === "function" && I.getBundle && I.getBundle()) {
      var lt = I.t("theme." + th);
      if (lt && typeof lt === "string") themeLabel = lt;
      btn.textContent = I.t("control.styleLabel", { theme: themeLabel });
      btn.title = I.t("control.styleCycleTitle", { count: ORDER.length });
    } else {
      btn.textContent = "风格 · " + themeLabel;
      btn.title = "点击切换界面风格（共 " + ORDER.length + " 种）";
    }
  }

  function init() {
    var btn = document.getElementById("style-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        cycle();
        syncButton();
      });
    }
    syncButton();
    if (global.StarOfficeI18n && typeof global.StarOfficeI18n.onChange === "function") {
      global.StarOfficeI18n.onChange(function () {
        syncButton();
      });
    }
  }

  global.StarOfficeTheme = {
    apply: apply,
    cycle: cycle,
    current: current,
    init: init,
    ORDER: ORDER,
    LABELS: LABELS
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
