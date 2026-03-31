/**
 * Star Office UI — 国际化
 * localStorage: starOfficeLocale（默认 zh-CN）
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "starOfficeLocale";
  var SUPPORTED = ["zh-CN", "ko", "en", "fr", "de", "ja", "zh-TW", "ru"];

  var bundle = null;
  var locale = "zh-CN";
  var listeners = [];

  function normalize(code) {
    if (!code) return "zh-CN";
    var c = String(code).trim();
    if (SUPPORTED.indexOf(c) >= 0) return c;
    return "zh-CN";
  }

  function getStored() {
    try {
      return normalize(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return "zh-CN";
    }
  }

  function setStored(code) {
    try {
      localStorage.setItem(STORAGE_KEY, normalize(code));
    } catch (e) {}
  }

  /**
   * 按路径取值。注意：键名里若含「.」（如 lang.names.zh-CN），不能靠 split(".")，
   * 否则 zh-CN 会被拆成 zh 与 CN。对 lang.names.* 走专用解析。
   */
  function get(obj, path) {
    if (!obj || !path) return null;
    if (path.indexOf("lang.names.") === 0) {
      var code = path.slice("lang.names.".length);
      if (obj.lang && obj.lang.names && Object.prototype.hasOwnProperty.call(obj.lang.names, code)) {
        return obj.lang.names[code];
      }
      return null;
    }
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return null;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /**
   * t('a.b.c') 或 t('loading.progress', { pct: 50 })
   */
  function t(path, vars) {
    var v = get(bundle, path);
    if (v == null || v === "") {
      v = path;
    }
    if (typeof v !== "string") {
      return v;
    }
    if (vars && typeof vars === "object") {
      return v.replace(/\{\{(\w+)\}\}/g, function (_, k) {
        return vars[k] != null ? String(vars[k]) : "";
      });
    }
    return v;
  }

  /** 数组路径：tArray('bubbles.idle') */
  function tArray(path) {
    var v = get(bundle, path);
    return Array.isArray(v) ? v : [];
  }

  function objectOrEmpty(path) {
    var v = get(bundle, path);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  }

  function current() {
    return locale;
  }

  function applyHtmlLang() {
    var map = {
      "zh-CN": "zh-CN",
      "zh-TW": "zh-Hant",
      ko: "ko",
      en: "en",
      fr: "fr",
      de: "de",
      ja: "ja",
      ru: "ru"
    };
    document.documentElement.setAttribute("lang", map[locale] || "zh-CN");
  }

  function applyDom() {
    if (bundle && bundle.page && bundle.page.title) {
      document.title = bundle.page.title;
    }
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      if (!key) continue;
      var attr = el.getAttribute("data-i18n-attr");
      var val = t(key);
      if (typeof val !== "string") continue;
      if (attr) {
        el.setAttribute(attr, val);
      } else {
        el.textContent = val;
      }
    }
    var titleEl = document.querySelector("title[data-i18n-title]");
    if (titleEl) {
      var tk = titleEl.getAttribute("data-i18n-title");
      document.title = t(tk);
    }
  }

  var langSelectInited = false;
  function initLangSelect() {
    var sel = document.getElementById("lang-select");
    if (!sel) return;
    function fill() {
      sel.innerHTML = "";
      var names = bundle && bundle.lang && bundle.lang.names;
      for (var i = 0; i < SUPPORTED.length; i++) {
        var code = SUPPORTED[i];
        var opt = document.createElement("option");
        opt.value = code;
        opt.textContent =
          names && typeof names[code] === "string" ? names[code] : code;
        sel.appendChild(opt);
      }
      sel.value = current();
    }
    if (!langSelectInited) {
      langSelectInited = true;
      sel.addEventListener("change", function () {
        setLocale(sel.value);
      });
      onChange(function () {
        fill();
        sel.value = current();
      });
    }
    fill();
  }

  function notify() {
    applyHtmlLang();
    applyDom();
    initLangSelect();
    for (var j = 0; j < listeners.length; j++) {
      try {
        listeners[j](locale, bundle);
      } catch (e) {}
    }
    try {
      var ev = new CustomEvent("staroffice-locale-change", { detail: { locale: locale, bundle: bundle } });
      document.dispatchEvent(ev);
    } catch (e2) {}
  }

  function onChange(fn) {
    if (typeof fn === "function") listeners.push(fn);
  }

  function loadBundleFor(code) {
    return fetch("/static/locales/" + encodeURIComponent(code) + ".json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("bad");
      return r.json();
    });
  }

  function setLocale(code) {
    var next = normalize(code);
    locale = next;
    setStored(locale);
    return loadBundleFor(locale)
      .catch(function () {
        if (locale !== "zh-CN") {
          locale = "zh-CN";
          setStored("zh-CN");
          return loadBundleFor("zh-CN");
        }
        throw new Error("i18n");
      })
      .then(function (data) {
        bundle = data;
        notify();
        return locale;
      });
  }

  function init() {
    locale = getStored();
    return loadBundleFor(locale)
      .catch(function () {
        locale = "zh-CN";
        setStored("zh-CN");
        return loadBundleFor("zh-CN");
      })
      .then(function (data) {
        bundle = data;
        notify();
        return locale;
      });
  }

  global.StarOfficeI18n = {
    SUPPORTED: SUPPORTED,
    init: init,
    setLocale: setLocale,
    t: t,
    tArray: tArray,
    objectOrEmpty: objectOrEmpty,
    get: get,
    current: current,
    onChange: onChange,
    applyDom: applyDom,
    getBundle: function () {
      return bundle;
    }
  };
})(typeof window !== "undefined" ? window : this);
