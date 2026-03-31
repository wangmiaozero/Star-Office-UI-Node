#!/usr/bin/env node
/* Star Office UI - Node.js Backend State Service */

"use strict";

require("./bootstrap/env-check");

const http = require("http");

const config = require("./config");
const { createApp } = require("./app");
const stateService = require("./services/state.service");
const agentsService = require("./services/agents.service");
const joinKeysService = require("./services/joinKeys.service");

function ensurePersistence() {
  stateService.ensureFiles();
  agentsService.ensureFile();
  joinKeysService.ensureFile();
}

function logInfo(...args) {
  console.log("[star-office-ui]", ...args);
}

function logError(...args) {
  console.error("[star-office-ui]", ...args);
}

ensurePersistence();

const app = createApp();
const server = http.createServer(app);

const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000);

function shutdown(signal) {
  logInfo(`${signal} 收到，正在优雅关闭...`);
  server.close((err) => {
    if (err) {
      logError("关闭 HTTP 服务失败:", err.message);
      process.exit(1);
    }
    logInfo("HTTP 已停止");
    process.exit(0);
  });

  setTimeout(() => {
    logError(`优雅关闭超时（${SHUTDOWN_TIMEOUT_MS}ms），强制退出`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logError("uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logError("unhandledRejection:", reason);
  process.exit(1);
});

server.listen(config.PORT, "0.0.0.0", () => {
  console.log("=".repeat(50));
  console.log("Star Office UI - Node Backend State Service");
  console.log("=".repeat(50));
  console.log(`State file: ${config.STATE_FILE}`);
  console.log(`Listening on: http://0.0.0.0:${config.PORT}`);
  console.log("=".repeat(50));
});

module.exports = { server, app };
