"use strict";

const fs = require("fs");

const config = require("../config");
const { readJsonSafe, writeJson } = require("../utils/json");

function loadJoinKeys() {
  const data = readJsonSafe(config.JOIN_KEYS_FILE, null);
  if (data && typeof data === "object" && Array.isArray(data.keys)) return data;
  return { keys: [] };
}

function saveJoinKeys(data) {
  writeJson(config.JOIN_KEYS_FILE, data);
}

function ensureFile() {
  if (!fs.existsSync(config.JOIN_KEYS_FILE)) saveJoinKeys({ keys: [] });
}

module.exports = { loadJoinKeys, saveJoinKeys, ensureFile };
