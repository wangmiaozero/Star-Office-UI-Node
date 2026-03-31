"use strict";

const express = require("express");

const { nowIso } = require("../utils/time");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: nowIso() });
});

/** 就绪探针：进程与文件就绪后由 server 挂载前已 ensure */
router.get("/ready", (req, res) => {
  res.json({ status: "ready", timestamp: nowIso() });
});

module.exports = router;
