"use strict";

const fs = require("fs");

const config = require("../config");
const { DEFAULT_STATE } = require("../constants/defaults");
const { readJsonSafe, writeJson } = require("../utils/json");

function saveState(state) {
  writeJson(config.STATE_FILE, state);
}

function loadState() {
  let state = readJsonSafe(config.STATE_FILE, null);
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    state = { ...DEFAULT_STATE };
  }

  try {
    const ttl = Number.parseInt(state.ttl_seconds ?? 300, 10);
    const updatedAt = state.updated_at;
    const s = state.state || "idle";
    const workingStates = new Set(["writing", "researching", "executing"]);
    if (updatedAt && workingStates.has(s)) {
      const age = (Date.now() - new Date(updatedAt).getTime()) / 1000;
      if (Number.isFinite(age) && age > ttl) {
        state.state = "idle";
        state.detail = "待命中（自动回到休息区）";
        state.progress = 0;
        state.updated_at = new Date().toISOString();
        saveState(state);
      }
    }
  } catch (_) {}

  return state;
}

function ensureFiles() {
  if (!fs.existsSync(config.STATE_FILE)) saveState({ ...DEFAULT_STATE });
}

module.exports = { loadState, saveState, ensureFiles };
