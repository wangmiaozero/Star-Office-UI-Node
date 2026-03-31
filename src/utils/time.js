"use strict";

function nowIso() {
  return new Date().toISOString();
}

function ageSeconds(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 1000;
}

module.exports = { nowIso, ageSeconds };
