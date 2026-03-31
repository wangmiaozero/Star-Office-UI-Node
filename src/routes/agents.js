"use strict";

function registerAgentRoutes(app, deps) {
  const {
    loadAgentsState,
    saveAgentsState,
    loadJoinKeys,
    saveJoinKeys,
    normalizeAgentState,
    stateToArea,
    ageSeconds,
    nowIso,
    randomAvatar
  } = deps;

  app.get("/agents", (req, res) => {
    const agents = loadAgentsState();
    const keysData = loadJoinKeys();
    const cleanedAgents = [];

    for (const a of agents) {
      if (a.isMain) {
        cleanedAgents.push(a);
        continue;
      }

      const authStatus = a.authStatus || "pending";
      const authExpiresAt = a.authExpiresAt;

      if (authStatus === "pending" && authExpiresAt) {
        const expired = Date.now() > new Date(authExpiresAt).getTime();
        if (expired) {
          const key = a.joinKey;
          if (key) {
            const keyItem = keysData.keys.find((k) => k.key === key);
            if (keyItem) {
              keyItem.used = false;
              keyItem.usedBy = null;
              keyItem.usedByAgentId = null;
              keyItem.usedAt = null;
            }
          }
          continue;
        }
      }

      if (authStatus === "approved" && a.lastPushAt) {
        const age = ageSeconds(a.lastPushAt);
        if (age !== null && age > 300) a.authStatus = "offline";
      }

      cleanedAgents.push(a);
    }

    saveAgentsState(cleanedAgents);
    saveJoinKeys(keysData);
    res.json(cleanedAgents);
  });

  app.post("/agent-approve", (req, res) => {
    try {
      const agentId = String(req.body?.agentId || "").trim();
      if (!agentId) return res.status(400).json({ ok: false, msg: "缺少 agentId" });

      const agents = loadAgentsState();
      const target = agents.find((a) => a.agentId === agentId && !a.isMain);
      if (!target) return res.status(404).json({ ok: false, msg: "未找到 agent" });

      target.authStatus = "approved";
      target.authApprovedAt = nowIso();
      target.authExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      saveAgentsState(agents);

      res.json({ ok: true, agentId, authStatus: "approved" });
    } catch (err) {
      res.status(500).json({ ok: false, msg: err.message });
    }
  });

  app.post("/agent-reject", (req, res) => {
    try {
      const agentId = String(req.body?.agentId || "").trim();
      if (!agentId) return res.status(400).json({ ok: false, msg: "缺少 agentId" });

      let agents = loadAgentsState();
      const target = agents.find((a) => a.agentId === agentId && !a.isMain);
      if (!target) return res.status(404).json({ ok: false, msg: "未找到 agent" });

      target.authStatus = "rejected";
      target.authRejectedAt = nowIso();

      const keysData = loadJoinKeys();
      if (target.joinKey) {
        const keyItem = keysData.keys.find((k) => k.key === target.joinKey);
        if (keyItem) {
          keyItem.used = false;
          keyItem.usedBy = null;
          keyItem.usedByAgentId = null;
          keyItem.usedAt = null;
        }
      }

      agents = agents.filter((a) => a.isMain || a.agentId !== agentId);
      saveAgentsState(agents);
      saveJoinKeys(keysData);

      res.json({ ok: true, agentId, authStatus: "rejected" });
    } catch (err) {
      res.status(500).json({ ok: false, msg: err.message });
    }
  });

  app.post("/join-agent", (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object" || !String(data.name || "").trim()) {
        return res.status(400).json({ ok: false, msg: "请提供名字" });
      }

      const name = String(data.name).trim();
      const state = normalizeAgentState(data.state || "idle");
      const detail = String(data.detail || "");
      const joinKey = String(data.joinKey || "").trim();
      if (!joinKey) return res.status(400).json({ ok: false, msg: "请提供接入密钥" });

      const keysData = loadJoinKeys();
      const keyItem = keysData.keys.find((k) => k.key === joinKey);
      if (!keyItem) return res.status(403).json({ ok: false, msg: "接入密钥无效" });

      const agents = loadAgentsState();
      const now = Date.now();

      const existing = agents.find((a) => a.name === name && !a.isMain);
      const existingId = existing?.agentId;

      for (const a of agents) {
        if (a.isMain) continue;
        if (a.authStatus !== "approved") continue;
        const age = ageSeconds(a.lastPushAt) ?? ageSeconds(a.updated_at);
        if (age !== null && age > 300) a.authStatus = "offline";
      }

      const maxConcurrent = Number.parseInt(keyItem.maxConcurrent ?? 3, 10);
      let activeCount = 0;
      for (const a of agents) {
        if (a.isMain) continue;
        if (a.agentId === existingId) continue;
        if (a.joinKey !== joinKey) continue;
        if (a.authStatus !== "approved") continue;
        const age = ageSeconds(a.lastPushAt) ?? ageSeconds(a.updated_at);
        if (age === null || age <= 300) activeCount += 1;
      }

      if (activeCount >= maxConcurrent) {
        saveAgentsState(agents);
        return res.status(429).json({
          ok: false,
          msg: `该接入密钥当前并发已达上限（${maxConcurrent}），请稍后或换另一个 key`
        });
      }

      let agentId;
      if (existing) {
        existing.state = state;
        existing.detail = detail;
        existing.updated_at = nowIso();
        existing.area = stateToArea(state);
        existing.source = "remote-openclaw";
        existing.joinKey = joinKey;
        existing.authStatus = "approved";
        existing.authApprovedAt = nowIso();
        existing.authExpiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
        existing.lastPushAt = nowIso();
        if (!existing.avatar) existing.avatar = randomAvatar();
        agentId = existing.agentId;
      } else {
        const suffix = Math.random().toString(36).slice(2, 6);
        agentId = `agent_${Date.now()}_${suffix}`;
        agents.push({
          agentId,
          name,
          isMain: false,
          state,
          detail,
          updated_at: nowIso(),
          area: stateToArea(state),
          source: "remote-openclaw",
          joinKey,
          authStatus: "approved",
          authApprovedAt: nowIso(),
          authExpiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
          lastPushAt: nowIso(),
          avatar: randomAvatar()
        });
      }

      keyItem.used = true;
      keyItem.usedBy = name;
      keyItem.usedByAgentId = agentId;
      keyItem.usedAt = nowIso();
      keyItem.reusable = true;

      saveAgentsState(agents);
      saveJoinKeys(keysData);
      res.json({ ok: true, agentId, authStatus: "approved", nextStep: "已自动批准，立即开始推送状态" });
    } catch (err) {
      res.status(500).json({ ok: false, msg: err.message });
    }
  });

  app.post("/leave-agent", (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object") return res.status(400).json({ ok: false, msg: "invalid json" });

      const agentId = String(data.agentId || "").trim();
      const name = String(data.name || "").trim();
      if (!agentId && !name) return res.status(400).json({ ok: false, msg: "请提供 agentId 或名字" });

      const agents = loadAgentsState();
      let target = null;
      if (agentId) target = agents.find((a) => a.agentId === agentId && !a.isMain) || null;
      if (!target && name) target = agents.find((a) => a.name === name && !a.isMain) || null;
      if (!target) return res.status(404).json({ ok: false, msg: "没有找到要离开的 agent" });

      const joinKey = target.joinKey;
      const newAgents = agents.filter((a) => a.isMain || a.agentId !== target.agentId);

      const keysData = loadJoinKeys();
      if (joinKey) {
        const keyItem = keysData.keys.find((k) => k.key === joinKey);
        if (keyItem) {
          keyItem.used = false;
          keyItem.usedBy = null;
          keyItem.usedByAgentId = null;
          keyItem.usedAt = null;
        }
      }

      saveAgentsState(newAgents);
      saveJoinKeys(keysData);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, msg: err.message });
    }
  });

  app.post("/agent-push", (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object") return res.status(400).json({ ok: false, msg: "invalid json" });

      const agentId = String(data.agentId || "").trim();
      const joinKey = String(data.joinKey || "").trim();
      const stateIn = String(data.state || "").trim();
      const detail = String(data.detail || "").trim();
      const name = String(data.name || "").trim();

      if (!agentId || !joinKey || !stateIn) {
        return res.status(400).json({ ok: false, msg: "缺少 agentId/joinKey/state" });
      }

      const state = normalizeAgentState(stateIn);
      const keysData = loadJoinKeys();
      const keyItem = keysData.keys.find((k) => k.key === joinKey);
      if (!keyItem) return res.status(403).json({ ok: false, msg: "joinKey 无效" });

      const agents = loadAgentsState();
      const target = agents.find((a) => a.agentId === agentId && !a.isMain);
      if (!target) return res.status(404).json({ ok: false, msg: "agent 未注册，请先 join" });

      const authStatus = target.authStatus || "pending";
      if (!["approved", "offline"].includes(authStatus)) {
        return res.status(403).json({ ok: false, msg: "agent 未获授权，请等待主人批准" });
      }
      if (authStatus === "offline") {
        target.authStatus = "approved";
        target.authApprovedAt = nowIso();
        target.authExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }

      if (target.joinKey !== joinKey) return res.status(403).json({ ok: false, msg: "joinKey 不匹配" });

      target.state = state;
      target.detail = detail;
      if (name) target.name = name;
      target.updated_at = nowIso();
      target.area = stateToArea(state);
      target.source = "remote-openclaw";
      target.lastPushAt = nowIso();

      saveAgentsState(agents);
      res.json({ ok: true, agentId, area: target.area });
    } catch (err) {
      res.status(500).json({ ok: false, msg: err.message });
    }
  });
}

module.exports = { registerAgentRoutes };
