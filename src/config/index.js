"use strict";

const path = require("path");

/** 项目根目录 */
const ROOT_DIR = path.join(__dirname, "..", "..");

const MEMORY_DIR = path.join(path.dirname(ROOT_DIR), "memory");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const STATE_FILE = path.join(ROOT_DIR, "state.json");
const AGENTS_STATE_FILE = path.join(ROOT_DIR, "agents-state.json");
const JOIN_KEYS_FILE = path.join(ROOT_DIR, "join-keys.json");

const VERSION_TIMESTAMP = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 15);

const PORT = Number(process.env.PORT || 18791);
const NODE_ENV = process.env.NODE_ENV || "development";

module.exports = {
  ROOT_DIR,
  MEMORY_DIR,
  FRONTEND_DIR,
  STATE_FILE,
  AGENTS_STATE_FILE,
  JOIN_KEYS_FILE,
  VERSION_TIMESTAMP,
  PORT,
  NODE_ENV
};
