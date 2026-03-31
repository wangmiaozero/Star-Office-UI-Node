"use strict";

function cacheHeaders(req, res, next) {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
}

module.exports = cacheHeaders;
