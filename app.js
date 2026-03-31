#!/usr/bin/env node
require("./scripts/enforce-runtime");
/* Star Office UI - Node.js Backend State Service */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { spawn } = require("child_process");
const { registerAgentRoutes } = require("./src/routes/agents");
const { registerAssetRoutes } = require("./src/routes/assets");

const ROOT_DIR = __dirname;
const MEMORY_DIR = path.join(path.dirname(ROOT_DIR), "memory");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const FRONTEND_INDEX_FILE = path.join(FRONTEND_DIR, "index.html");
const FRONTEND_ELECTRON_STANDALONE_FILE = path.join(FRONTEND_DIR, "electron-standalone.html");
const STATE_FILE = path.join(ROOT_DIR, "state.json");
const AGENTS_STATE_FILE = path.join(ROOT_DIR, "agents-state.json");
const JOIN_KEYS_FILE = path.join(ROOT_DIR, "join-keys.json");
const ASSET_POSITIONS_FILE = path.join(ROOT_DIR, "asset-positions.json");
const ASSET_DEFAULTS_FILE = path.join(ROOT_DIR, "asset-defaults.json");
const RUNTIME_CONFIG_FILE = path.join(ROOT_DIR, "runtime-config.json");
const ASSET_TEMPLATE_ZIP = path.join(ROOT_DIR, "assets-replace-template.zip");
const BG_HISTORY_DIR = path.join(ROOT_DIR, "assets", "bg-history");
const HOME_FAVORITES_DIR = path.join(ROOT_DIR, "assets", "home-favorites");
const HOME_FAVORITES_INDEX_FILE = path.join(HOME_FAVORITES_DIR, "index.json");
const ROOM_REFERENCE_WEBP = path.join(ROOT_DIR, "assets", "room-reference.webp");
const ROOM_REFERENCE_PNG = path.join(ROOT_DIR, "assets", "room-reference.png");
const ROOM_REFERENCE_IMAGE = fs.existsSync(ROOM_REFERENCE_WEBP) ? ROOM_REFERENCE_WEBP : ROOM_REFERENCE_PNG;
const WORKSPACE_DIR = path.dirname(ROOT_DIR);
const GEMINI_SCRIPT = path.join(WORKSPACE_DIR, "skills", "gemini-image-generate", "scripts", "gemini_image_generate.py");
const GEMINI_PYTHON = path.join(WORKSPACE_DIR, "skills", "gemini-image-generate", ".venv", "bin", "python");
const HOME_FAVORITES_MAX = 30;
const ASSET_ALLOWED_EXTS = new Set([".png", ".webp", ".jpg", ".jpeg", ".gif", ".svg", ".avif"]);
const VALID_AGENT_STATES = new Set(["idle", "writing", "researching", "executing", "syncing", "error"]);
const VERSION_TIMESTAMP = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 15);
const ASSET_DRAWER_PASS = process.env.ASSET_DRAWER_PASS || "1234";
const ASSET_EDITOR_TTL_MS = 12 * 60 * 60 * 1000;

const uploadTmpDir = path.join(ROOT_DIR, ".tmp-uploads");
fs.mkdirSync(uploadTmpDir, { recursive: true });
const upload = multer({ dest: uploadTmpDir });

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "1mb" }));

const assetEditorSessions = new Map();
const bgTasks = new Map();

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
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
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

function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function isAssetEditorAuthed(req) {
  const token = parseCookies(req).asset_editor_token;
  if (!token) return false;
  const exp = assetEditorSessions.get(token);
  if (!exp || Date.now() > exp) {
    assetEditorSessions.delete(token);
    return false;
  }
  return true;
}

function requireAssetEditorAuth(req, res) {
  if (isAssetEditorAuthed(req)) return true;
  res.status(401).json({ ok: false, code: "UNAUTHORIZED", msg: "Asset editor auth required" });
  return false;
}

function safeFrontendPath(relPath) {
  const target = path.resolve(FRONTEND_DIR, relPath);
  const root = path.resolve(FRONTEND_DIR) + path.sep;
  if (!(target + path.sep).startsWith(root) && target !== path.resolve(FRONTEND_DIR)) {
    return null;
  }
  return target;
}

function loadAssetPositions() {
  const data = readJsonSafe(ASSET_POSITIONS_FILE, null);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function saveAssetPositions(data) {
  writeJson(ASSET_POSITIONS_FILE, data);
}

function loadAssetDefaults() {
  const data = readJsonSafe(ASSET_DEFAULTS_FILE, null);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function saveAssetDefaults(data) {
  writeJson(ASSET_DEFAULTS_FILE, data);
}

function normalizeUserModel(modelName) {
  const v = String(modelName || "").trim().toLowerCase();
  if (!v) return "nanobanana-pro";
  if (v === "nanobanana-2" || v === "gemini-2.5-flash-image") return "nanobanana-2";
  return "nanobanana-pro";
}

function loadRuntimeConfig() {
  const d = readJsonSafe(RUNTIME_CONFIG_FILE, null);
  if (!d || typeof d !== "object" || Array.isArray(d)) {
    return { gemini_model: "nanobanana-pro", gemini_api_key: "" };
  }
  return {
    gemini_model: normalizeUserModel(d.gemini_model),
    gemini_api_key: String(d.gemini_api_key || "").trim()
  };
}

function saveRuntimeConfig(data) {
  const current = loadRuntimeConfig();
  const next = {
    gemini_model: normalizeUserModel(data.gemini_model || current.gemini_model),
    gemini_api_key: String(data.gemini_api_key || current.gemini_api_key || "").trim()
  };
  writeJson(RUNTIME_CONFIG_FILE, next);
}

function ensureHomeFavoritesIndex() {
  fs.mkdirSync(HOME_FAVORITES_DIR, { recursive: true });
  if (!fs.existsSync(HOME_FAVORITES_INDEX_FILE)) {
    writeJson(HOME_FAVORITES_INDEX_FILE, { items: [] });
  }
}

function loadHomeFavoritesIndex() {
  ensureHomeFavoritesIndex();
  const d = readJsonSafe(HOME_FAVORITES_INDEX_FILE, null);
  if (d && typeof d === "object" && Array.isArray(d.items)) return d;
  return { items: [] };
}

function saveHomeFavoritesIndex(data) {
  ensureHomeFavoritesIndex();
  writeJson(HOME_FAVORITES_INDEX_FILE, data);
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
  if (!fs.existsSync(JOIN_KEYS_FILE)) {
    const samplePath = path.join(ROOT_DIR, "join-keys.sample.json");
    if (fs.existsSync(samplePath)) {
      const sample = readJsonSafe(samplePath, null);
      saveJoinKeys(sample && typeof sample === "object" ? sample : { keys: [] });
    } else {
      saveJoinKeys({ keys: [] });
    }
  }
  ensureHomeFavoritesIndex();
}

function ensureElectronStandaloneSnapshot() {
  if (fs.existsSync(FRONTEND_ELECTRON_STANDALONE_FILE)) return;
  if (fs.existsSync(FRONTEND_INDEX_FILE)) {
    fs.copyFileSync(FRONTEND_INDEX_FILE, FRONTEND_ELECTRON_STANDALONE_FILE);
  }
}

function maskApiKey(key) {
  if (!key) return "";
  if (key.length <= 4) return "*".repeat(key.length);
  return "*".repeat(key.length - 4) + key.slice(-4);
}

function createBgTask(customPrompt, speedMode) {
  const taskId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  bgTasks.set(taskId, { status: "pending", created_at: nowIso() });

  const target = path.join(FRONTEND_DIR, "office_bg_small.webp");
  const cfg = loadRuntimeConfig();
  const apiKey = cfg.gemini_api_key;

  if (!apiKey) {
    bgTasks.set(taskId, { status: "error", result: { ok: false, code: "MISSING_API_KEY", msg: "Missing GEMINI_API_KEY or GOOGLE_API_KEY" } });
    return taskId;
  }
  if (!fs.existsSync(GEMINI_PYTHON) || !fs.existsSync(GEMINI_SCRIPT)) {
    bgTasks.set(taskId, { status: "error", result: { ok: false, msg: "生图脚本环境缺失：gemini-image-generate 未安装" } });
    return taskId;
  }
  if (!fs.existsSync(target)) {
    bgTasks.set(taskId, { status: "error", result: { ok: false, msg: "office_bg_small.webp 不存在" } });
    return taskId;
  }

  const bak = `${target}.bak`;
  try {
    fs.copyFileSync(target, bak);
  } catch (_) {}

  const prompt = String(customPrompt || "").trim() || "8-bit cozy office interior";
  const model = normalizeUserModel(speedMode === "fast" ? "nanobanana-2" : cfg.gemini_model);
  const outDir = fs.mkdtempSync(path.join(uploadTmpDir, "gen-"));
  const args = [
    GEMINI_SCRIPT,
    "--prompt", prompt,
    "--model", model,
    "--out-dir", outDir,
    "--cleanup"
  ];
  if (fs.existsSync(ROOM_REFERENCE_IMAGE)) {
    args.push("--reference-image", ROOM_REFERENCE_IMAGE);
  }

  const child = spawn(GEMINI_PYTHON, args, {
    env: { ...process.env, GEMINI_API_KEY: apiKey, GEMINI_MODEL: model, GOOGLE_API_KEY: "" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => {
    stdout += String(d);
  });
  child.stderr.on("data", (d) => {
    stderr += String(d);
  });

  child.on("close", (code) => {
    try {
      if (code !== 0) {
        bgTasks.set(taskId, { status: "error", result: { ok: false, msg: `生图失败: ${(stderr || stdout).trim() || `exit ${code}`}` } });
        return;
      }
      const lines = stdout.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1] || "{}";
      const result = JSON.parse(last);
      const files = Array.isArray(result.files) ? result.files : [];
      const genFile = files[0];
      if (!genFile || !fs.existsSync(genFile)) {
        bgTasks.set(taskId, { status: "error", result: { ok: false, msg: "生图未返回有效文件" } });
        return;
      }
      fs.copyFileSync(genFile, target);
      fs.mkdirSync(BG_HISTORY_DIR, { recursive: true });
      const hist = path.join(BG_HISTORY_DIR, `office_bg_small-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}.webp`);
      fs.copyFileSync(target, hist);
      const st = fs.statSync(target);
      bgTasks.set(taskId, {
        status: "done",
        result: { ok: true, path: "office_bg_small.webp", size: st.size, history: path.relative(ROOT_DIR, hist), speed_mode: speedMode, msg: "已生成并替换 RPG 房间底图（已自动归档）" }
      });
    } catch (err) {
      bgTasks.set(taskId, { status: "error", result: { ok: false, msg: `生图结果解析失败: ${err.message}` } });
    }
  });

  return taskId;
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

app.get("/electron-standalone", (req, res) => {
  ensureElectronStandaloneSnapshot();
  const p = fs.existsSync(FRONTEND_ELECTRON_STANDALONE_FILE) ? FRONTEND_ELECTRON_STANDALONE_FILE : FRONTEND_INDEX_FILE;
  const html = fs.readFileSync(p, "utf-8");
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

registerAgentRoutes(app, {
  loadAgentsState,
  saveAgentsState,
  loadJoinKeys,
  saveJoinKeys,
  normalizeAgentState,
  stateToArea,
  ageSeconds,
  nowIso,
  randomAvatar
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
app.post("/assets/auth", (req, res) => {
  const pwd = String(req.body?.password || "").trim();
  if (!pwd || pwd !== ASSET_DRAWER_PASS) {
    return res.status(401).json({ ok: false, msg: "验证码错误" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  assetEditorSessions.set(token, Date.now() + ASSET_EDITOR_TTL_MS);
  res.setHeader("Set-Cookie", `asset_editor_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ASSET_EDITOR_TTL_MS / 1000}`);
  return res.json({ ok: true, msg: "认证成功" });
});

app.get("/assets/auth/status", (req, res) => {
  return res.json({ ok: true, authed: isAssetEditorAuthed(req), drawer_default_pass: ASSET_DRAWER_PASS === "1234" });
});

registerAssetRoutes(app, {
  fs,
  path,
  upload,
  ROOT_DIR,
  FRONTEND_DIR,
  HOME_FAVORITES_DIR,
  BG_HISTORY_DIR,
  ROOM_REFERENCE_IMAGE,
  ASSET_TEMPLATE_ZIP,
  ASSET_ALLOWED_EXTS,
  HOME_FAVORITES_MAX,
  bgTasks,
  requireAssetEditorAuth,
  loadAssetPositions,
  saveAssetPositions,
  loadAssetDefaults,
  saveAssetDefaults,
  loadRuntimeConfig,
  saveRuntimeConfig,
  maskApiKey,
  normalizeUserModel,
  createBgTask,
  loadHomeFavoritesIndex,
  saveHomeFavoritesIndex,
  ensureHomeFavoritesIndex,
  safeFrontendPath
});

ensureFiles();
ensureElectronStandaloneSnapshot();

const rawPort = process.env.STAR_BACKEND_PORT || process.env.PORT || "19000";
let PORT = Number(rawPort);
if (!Number.isFinite(PORT) || PORT <= 0) PORT = 19000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("=".repeat(50));
  console.log("Star Office UI - Node Backend State Service");
  console.log("=".repeat(50));
  console.log(`State file: ${STATE_FILE}`);
  console.log(`Listening on: http://0.0.0.0:${PORT}`);
  if (PORT !== 19000) console.log(`(Port override active: ${rawPort})`);
  console.log("=".repeat(50));
});
