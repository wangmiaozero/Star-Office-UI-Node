#!/usr/bin/env node
"use strict";

/** Node.js LTS floor: matches engines.node in package.json */
const MIN_NODE = [18, 18, 0];
/** Matches engines.pnpm in package.json */
const MIN_PNPM = [9, 0, 0];

function parseVersion(v) {
  return String(v)
    .replace(/^v/, "")
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
}

function lt(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

function assertNodeVersion() {
  const nodeVer = parseVersion(process.versions.node);
  if (lt(nodeVer, MIN_NODE)) {
    console.error(
      `[runtime-check] Node.js version too low: ${process.versions.node}. Required >= ${MIN_NODE.join(".")}.`
    );
    process.exit(1);
  }
}

/**
 * Must be invoked under pnpm lifecycle (install/start/dev) so UA contains pnpm.
 * Also enforces pnpm major line >= MIN_PNPM when version is present in UA.
 */
function assertPnpmToolchain() {
  const ua = String(process.env.npm_config_user_agent || "").toLowerCase();
  if (!ua.includes("pnpm/")) {
    console.error("[runtime-check] This project is pnpm-only.");
    console.error("[runtime-check] Use: pnpm install && pnpm start");
    console.error("[runtime-check] Do not use npm or yarn for install/scripts.");
    process.exit(1);
  }
  const m = ua.match(/pnpm\/(\d+)\.(\d+)\.(\d+)/);
  if (m) {
    const pv = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (lt(pv, MIN_PNPM)) {
      console.error(
        `[runtime-check] pnpm version too low: ${m[0].replace("pnpm/", "")}. Required >= ${MIN_PNPM.join(".")}.`
      );
      process.exit(1);
    }
  }
}

module.exports = {
  MIN_NODE,
  MIN_PNPM,
  parseVersion,
  lt,
  assertNodeVersion,
  assertPnpmToolchain
};
