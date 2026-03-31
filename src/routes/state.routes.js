"use strict";

const express = require("express");

const stateService = require("../services/state.service");
const { nowIso } = require("../utils/time");

const router = express.Router();

router.get("/status", (req, res) => {
  res.json(stateService.loadState());
});

router.post("/set_state", (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({ status: "error", msg: "invalid json" });
    }
    const state = stateService.loadState();
    if ("state" in data) {
      const valid = new Set(["idle", "writing", "researching", "executing", "syncing", "error"]);
      if (valid.has(data.state)) state.state = data.state;
    }
    if ("detail" in data) state.detail = data.detail;
    state.updated_at = nowIso();
    stateService.saveState(state);
    return res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ status: "error", msg: err.message });
  }
});

module.exports = router;
