#!/usr/bin/env node
/* Star Office UI - Node.js Backend State Service */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const MEMORY_DIR = path.join(path.dirname(ROOT_DIR), "memory");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const STATE_FILE = path.join(ROOT_DIR, "state.json");
const AGENTS_STATE_FILE = path.join(ROOT_DIR, "agents-state.json");
const JOIN_KEYS_FILE = path.join(ROOT_DIR, "join-keys.json");

const VERSION_TIMESTAMP = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 15);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(
  "/static",
  express.static(FRONTEND_DIR, {
    etag: false,
    lastModified: false,
    maxAge: 0
  })
);

const DEFAULT_STATE = {
  state: "idle",
  detail: "等待任务中...",
  progress: 0,
  updated_at: new Date().toISOString()
};

const DEFAULT_AGENTS = [
  {
    agentId: "star",
    name: "Star",
    isMain: true,
    state: "idle",
    detail: "待命中，随时准备为你服务",
    updated_at: new Date().toISOString(),
    area: "breakroom",
    source: "local",
    joinKey: null,
    authStatus: "approved",
    authExpiresAt: null,
    lastPushAt: null
  },
  {
    agentId: "npc1",
    name: "NPC 1",
    isMain: false,
    state: "writing",
    detail: "在整理热点日报...",
    updated_at: new Date().toISOString(),
    area: "writing",
    source: "demo",
    joinKey: null,
    authStatus: "approved",
    authExpiresAt: null,
    lastPushAt: null
  }
];

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeAgentState(s) {
  if (!s) return "idle";
  const v = String(s).trim().toLowerCase();
  if (["working", "busy", "write"].includes(v)) return "writing";
  if (["run", "running", "execute", "exec"].includes(v)) return "executing";
  if (["sync"].includes(v)) return "syncing";
  if (["research", "search"].includes(v)) return "researching";
  if (["idle", "writing", "researching", "executing", "syncing", "error"].includes(v)) return v;
  return "idle";
}

function stateToArea(state) {
  const areaMap = {
    idle: "breakroom",
    writing: "writing",
    researching: "writing",
    executing: "writing",
    syncing: "writing",
    error: "error"
  };
  return areaMap[state] || "breakroom";
}

function loadState() {
  let state = readJsonSafe(STATE_FILE, null);
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

function saveState(state) {
  writeJson(STATE_FILE, state);
}

function loadAgentsState() {
  const data = readJsonSafe(AGENTS_STATE_FILE, null);
  return Array.isArray(data) ? data : [...DEFAULT_AGENTS];
}

function saveAgentsState(agents) {
  writeJson(AGENTS_STATE_FILE, agents);
}

function loadJoinKeys() {
  const data = readJsonSafe(JOIN_KEYS_FILE, null);
  if (data && typeof data === "object" && Array.isArray(data.keys)) return data;
  return { keys: [] };
}

function saveJoinKeys(data) {
  writeJson(JOIN_KEYS_FILE, data);
}

function sanitizeContent(text) {
  let out = String(text || "");
  out = out.replace(/ou_[a-f0-9]+/g, "[用户]");
  out = out.replace(/user_id="[^"]+"/g, 'user_id="[隐藏]"');
  out = out.replace(/\/root\/[^"\s]+/g, "[路径]");
  out = out.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[IP]");
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[邮箱]");
  out = out.replace(/1[3-9]\d{9}/g, "[手机号]");
  return out;
}

function extractMemoFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    const corePoints = [];
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;
      if (line.startsWith("#")) continue;
      if (line.startsWith("- ")) corePoints.push(line.slice(2).trim());
      else if (line.length > 10) corePoints.push(line);
    }

    if (!corePoints.length) {
      return "「昨日无事记录」\n\n若有恒，何必三更眠五更起；最无益，莫过一日曝十日寒。";
    }

    const selectedPoints = corePoints.slice(0, 3);
    const wisdomQuotes = [
      "「工欲善其事，必先利其器。」",
      "「不积跬步，无以至千里；不积小流，无以成江海。」",
      "「知行合一，方可致远。」",
      "「业精于勤，荒于嬉；行成于思，毁于随。」",
      "「路漫漫其修远兮，吾将上下而求索。」",
      "「昨夜西风凋碧树，独上高楼，望尽天涯路。」",
      "「衣带渐宽终不悔，为伊消得人憔悴。」",
      "「众里寻他千百度，蓦然回首，那人却在，灯火阑珊处。」",
      "「世事洞明皆学问，人情练达即文章。」",
      "「纸上得来终觉浅，绝知此事要躬行。」"
    ];
    const quote = wisdomQuotes[Math.floor(Math.random() * wisdomQuotes.length)];
    const result = [];

    for (const pointRaw of selectedPoints) {
      let point = sanitizeContent(pointRaw);
      if (point.length > 40) point = `${point.slice(0, 37)}...`;
      if (point.length <= 20) result.push(`· ${point}`);
      else {
        for (let i = 0; i < point.length; i += 20) {
          const chunk = point.slice(i, i + 20);
          result.push(i === 0 ? `· ${chunk}` : `  ${chunk}`);
        }
      }
    }

    if (quote.length <= 20) result.push(`\n${quote}`);
    else {
      for (let i = 0; i < quote.length; i += 20) {
        const chunk = quote.slice(i, i + 20);
        result.push(i === 0 ? `\n${chunk}` : chunk);
      }
    }

    return result.join("\n").trim();
  } catch (err) {
    console.error("提取 memo 失败:", err.message);
    return "「昨日记录加载失败」\n\n「往者不可谏，来者犹可追。」";
  }
}

function ensureFiles() {
  if (!fs.existsSync(STATE_FILE)) saveState({ ...DEFAULT_STATE });
  if (!fs.existsSync(AGENTS_STATE_FILE)) saveAgentsState([...DEFAULT_AGENTS]);
  if (!fs.existsSync(JOIN_KEYS_FILE)) saveJoinKeys({ keys: [] });
}

function randomAvatar() {
  const pool = ["guest_role_1", "guest_role_2", "guest_role_3", "guest_role_4", "guest_role_5", "guest_role_6"];
  return pool[Math.floor(Math.random() * pool.length)];
}

function nowIso() {
  return new Date().toISOString();
}

function ageSeconds(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 1000;
}

app.get("/", (req, res) => {
  const html = fs.readFileSync(path.join(FRONTEND_DIR, "index.html"), "utf-8");
  res.type("html").send(html.replaceAll("{{VERSION_TIMESTAMP}}", VERSION_TIMESTAMP));
});

app.get("/join", (req, res) => {
  const html = fs.readFileSync(path.join(FRONTEND_DIR, "join.html"), "utf-8");
  res.type("html").send(html);
});

app.get("/invite", (req, res) => {
  const html = fs.readFileSync(path.join(FRONTEND_DIR, "invite.html"), "utf-8");
  res.type("html").send(html);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: nowIso() });
});

app.get("/status", (req, res) => {
  res.json(loadState());
});

app.post("/set_state", (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({ status: "error", msg: "invalid json" });
    }
    const state = loadState();
    if ("state" in data) {
      const valid = new Set(["idle", "writing", "researching", "executing", "syncing", "error"]);
      if (valid.has(data.state)) state.state = data.state;
    }
    if ("detail" in data) state.detail = data.detail;
    state.updated_at = nowIso();
    saveState(state);
    return res.json({ status: "ok" });
  } catch (err) {
    return res.status(500).json({ status: "error", msg: err.message });
  }
});

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

app.get("/yesterday-memo", (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;
    const yesterdayFile = path.join(MEMORY_DIR, `${yesterdayStr}.md`);

    let targetFile = null;
    let targetDate = yesterdayStr;

    if (fs.existsSync(yesterdayFile)) {
      targetFile = yesterdayFile;
    } else if (fs.existsSync(MEMORY_DIR)) {
      const files = fs
        .readdirSync(MEMORY_DIR)
        .filter((f) => f.endsWith(".md") && /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
        .sort()
        .reverse();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      for (const f of files) {
        if (f !== `${todayStr}.md`) {
          targetFile = path.join(MEMORY_DIR, f);
          targetDate = f.replace(".md", "");
          break;
        }
      }
    }

    if (targetFile && fs.existsSync(targetFile)) {
      return res.json({ success: true, date: targetDate, memo: extractMemoFromFile(targetFile) });
    }

    return res.json({ success: false, msg: "没有找到昨日日记" });
  } catch (err) {
    return res.status(500).json({ success: false, msg: err.message });
  }
});

ensureFiles();

const PORT = Number(process.env.PORT || 18791);
app.listen(PORT, "0.0.0.0", () => {
  console.log("=".repeat(50));
  console.log("Star Office UI - Node Backend State Service");
  console.log("=".repeat(50));
  console.log(`State file: ${STATE_FILE}`);
  console.log(`Listening on: http://0.0.0.0:${PORT}`);
  console.log("=".repeat(50));
});
