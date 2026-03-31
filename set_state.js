#!/usr/bin/env node
require("./scripts/enforce-runtime");

const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "state.json");
const VALID_STATES = ["idle", "writing", "researching", "executing", "syncing", "error"];

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  }
  return {
    state: "idle",
    detail: "待命中...",
    progress: 0,
    updated_at: new Date().toISOString()
  };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function main() {
  const [, , stateName, detail = ""] = process.argv;
  if (!stateName) {
    console.log("用法: node set_state.js <state> [detail]");
    console.log(`状态选项: ${VALID_STATES.join(", ")}`);
    process.exit(1);
  }

  if (!VALID_STATES.includes(stateName)) {
    console.log(`无效状态: ${stateName}`);
    console.log(`有效选项: ${VALID_STATES.join(", ")}`);
    process.exit(1);
  }

  const state = loadState();
  state.state = stateName;
  state.detail = detail;
  state.updated_at = new Date().toISOString();
  saveState(state);
  console.log(`状态已更新: ${stateName} - ${detail}`);
}

main();
