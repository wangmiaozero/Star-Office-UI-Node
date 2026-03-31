"use strict";

const express = require("express");

const agentsService = require("../services/agents.service");

const router = express.Router();

router.get("/agents", (req, res) => {
  res.json(agentsService.getAgentsForList());
});

router.post("/agent-approve", (req, res) => {
  try {
    const agentId = String(req.body?.agentId || "").trim();
    if (!agentId) return res.status(400).json({ ok: false, msg: "缺少 agentId" });

    const result = agentsService.approveAgent(agentId);
    if (!result.ok) return res.status(result.status).json({ ok: false, msg: result.msg });
    res.json({ ok: true, agentId: result.agentId, authStatus: result.authStatus });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.post("/agent-reject", (req, res) => {
  try {
    const agentId = String(req.body?.agentId || "").trim();
    if (!agentId) return res.status(400).json({ ok: false, msg: "缺少 agentId" });

    const result = agentsService.rejectAgent(agentId);
    if (!result.ok) return res.status(result.status).json({ ok: false, msg: result.msg });
    res.json({ ok: true, agentId: result.agentId, authStatus: result.authStatus });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.post("/join-agent", (req, res) => {
  try {
    const result = agentsService.joinAgent(req.body);
    if (!result.ok) return res.status(result.status).json({ ok: false, msg: result.msg });
    res.json({
      ok: true,
      agentId: result.agentId,
      authStatus: result.authStatus,
      nextStep: result.nextStep
    });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.post("/leave-agent", (req, res) => {
  try {
    const result = agentsService.leaveAgent(req.body);
    if (!result.ok) return res.status(result.status).json({ ok: false, msg: result.msg });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

router.post("/agent-push", (req, res) => {
  try {
    const result = agentsService.pushAgent(req.body);
    if (!result.ok) return res.status(result.status).json({ ok: false, msg: result.msg });
    res.json({ ok: true, agentId: result.agentId, area: result.area });
  } catch (err) {
    res.status(500).json({ ok: false, msg: err.message });
  }
});

module.exports = router;
