"use strict";

function registerAssetRoutes(app, deps) {
  const {
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
  } = deps;

  app.get("/assets/template.zip", (req, res) => {
    if (!fs.existsSync(ASSET_TEMPLATE_ZIP)) {
      return res.status(404).json({ ok: false, msg: "模板包不存在，请先生成" });
    }
    return res.download(ASSET_TEMPLATE_ZIP);
  });

  app.get("/assets/list", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const items = [];
    const stack = [FRONTEND_DIR];
    while (stack.length) {
      const dir = stack.pop();
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          stack.push(full);
          continue;
        }
        const rel = path.relative(FRONTEND_DIR, full).replace(/\\/g, "/");
        if (rel.startsWith("fonts/")) continue;
        const ext = path.extname(full).toLowerCase();
        if (!ASSET_ALLOWED_EXTS.has(ext)) continue;
        const st = fs.statSync(full);
        items.push({ path: rel, size: st.size, ext, mtime: new Date(st.mtimeMs).toISOString() });
      }
    }
    items.sort((a, b) => a.path.localeCompare(b.path));
    res.json({ ok: true, count: items.length, items });
  });

  app.get("/assets/positions", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    res.json({ ok: true, items: loadAssetPositions() });
  });

  app.post("/assets/positions", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const key = String(req.body?.key || "").trim();
    const x = req.body?.x;
    const y = req.body?.y;
    const scale = req.body?.scale ?? 1;
    if (!key) return res.status(400).json({ ok: false, msg: "缺少 key" });
    if (x === undefined || y === undefined) return res.status(400).json({ ok: false, msg: "缺少 x/y" });
    const all = loadAssetPositions();
    all[key] = { x: Number(x), y: Number(y), scale: Number(scale), updated_at: new Date().toISOString() };
    saveAssetPositions(all);
    res.json({ ok: true, key, x: Number(x), y: Number(y), scale: Number(scale) });
  });

  app.get("/assets/defaults", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    res.json({ ok: true, items: loadAssetDefaults() });
  });

  app.post("/assets/defaults", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const key = String(req.body?.key || "").trim();
    const x = req.body?.x;
    const y = req.body?.y;
    const scale = req.body?.scale ?? 1;
    if (!key) return res.status(400).json({ ok: false, msg: "缺少 key" });
    if (x === undefined || y === undefined) return res.status(400).json({ ok: false, msg: "缺少 x/y" });
    const all = loadAssetDefaults();
    all[key] = { x: Number(x), y: Number(y), scale: Number(scale), updated_at: new Date().toISOString() };
    saveAssetDefaults(all);
    res.json({ ok: true, key, x: Number(x), y: Number(y), scale: Number(scale) });
  });

  app.get("/config/gemini", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const cfg = loadRuntimeConfig();
    res.json({
      ok: true,
      has_api_key: Boolean(cfg.gemini_api_key),
      api_key_masked: maskApiKey(cfg.gemini_api_key),
      gemini_model: normalizeUserModel(cfg.gemini_model)
    });
  });

  app.post("/config/gemini", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const model = normalizeUserModel(req.body?.model || "nanobanana-pro");
    const apiKey = String(req.body?.api_key || "").trim();
    const payload = { gemini_model: model };
    if (apiKey) payload.gemini_api_key = apiKey;
    saveRuntimeConfig(payload);
    res.json({ ok: true, msg: "Gemini 配置已保存" });
  });

  app.post("/assets/generate-rpg-background", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    for (const [id, task] of bgTasks) {
      if (task.status === "pending") {
        return res.json({ ok: true, async: true, task_id: id, msg: "已有生图任务进行中，请等待完成" });
      }
    }
    const prompt = String(req.body?.prompt || "").trim();
    const speedMode = ["fast", "quality"].includes(String(req.body?.speed_mode || "").trim()) ? String(req.body.speed_mode).trim() : "quality";
    const taskId = createBgTask(prompt, speedMode);
    res.json({ ok: true, async: true, task_id: taskId, msg: "生图任务已启动，请通过 task_id 轮询结果" });
  });

  app.get("/assets/generate-rpg-background/poll", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const taskId = String(req.query?.task_id || "").trim();
    if (!taskId) return res.status(400).json({ ok: false, msg: "缺少 task_id" });
    const task = bgTasks.get(taskId);
    if (!task) return res.status(404).json({ ok: false, msg: "任务不存在" });
    if (task.status === "pending") return res.json({ ok: true, status: "pending", msg: "生图进行中..." });
    if (task.status === "done") {
      bgTasks.delete(taskId);
      return res.json({ ok: true, status: "done", ...task.result });
    }
    bgTasks.delete(taskId);
    return res.status(task.result?.code ? 400 : 500).json({ ok: false, status: "error", ...(task.result || { msg: "未知错误" }) });
  });

  app.post("/assets/restore-reference-background", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const target = path.join(FRONTEND_DIR, "office_bg_small.webp");
    if (!fs.existsSync(target)) return res.status(404).json({ ok: false, msg: "office_bg_small.webp 不存在" });
    if (!fs.existsSync(ROOM_REFERENCE_IMAGE)) return res.status(404).json({ ok: false, msg: "参考图不存在" });
    fs.copyFileSync(target, `${target}.bak`);
    fs.copyFileSync(ROOM_REFERENCE_IMAGE, target);
    const st = fs.statSync(target);
    res.json({ ok: true, path: "office_bg_small.webp", size: st.size, msg: "已恢复初始底图" });
  });

  app.post("/assets/restore-last-generated-background", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const target = path.join(FRONTEND_DIR, "office_bg_small.webp");
    if (!fs.existsSync(target)) return res.status(404).json({ ok: false, msg: "office_bg_small.webp 不存在" });
    if (!fs.existsSync(BG_HISTORY_DIR)) return res.status(404).json({ ok: false, msg: "暂无历史底图" });
    const files = fs
      .readdirSync(BG_HISTORY_DIR)
      .filter((x) => x.startsWith("office_bg_small-") && x.endsWith(".webp"))
      .map((x) => path.join(BG_HISTORY_DIR, x));
    if (!files.length) return res.status(404).json({ ok: false, msg: "暂无历史底图" });
    const latest = files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    fs.copyFileSync(target, `${target}.bak`);
    fs.copyFileSync(latest, target);
    const st = fs.statSync(target);
    res.json({ ok: true, path: "office_bg_small.webp", size: st.size, from: path.relative(ROOT_DIR, latest), msg: "已回退到最近一次生成底图" });
  });

  app.get("/assets/home-favorites/list", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const idx = loadHomeFavoritesIndex();
    const out = [];
    for (const it of idx.items || []) {
      const rel = String(it.path || "").trim();
      if (!rel) continue;
      const abs = path.join(ROOT_DIR, rel);
      if (!fs.existsSync(abs)) continue;
      const fn = path.basename(rel);
      out.push({ id: it.id, path: rel, url: `/assets/home-favorites/file/${fn}`, thumb_url: `/assets/home-favorites/file/${fn}`, created_at: it.created_at || "" });
    }
    out.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    res.json({ ok: true, items: out });
  });

  app.get("/assets/home-favorites/file/:filename", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const full = path.join(HOME_FAVORITES_DIR, req.params.filename);
    if (!fs.existsSync(full)) return res.status(404).json({ ok: false, msg: "文件不存在" });
    res.sendFile(full);
  });

  app.post("/assets/home-favorites/save-current", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const src = path.join(FRONTEND_DIR, "office_bg_small.webp");
    if (!fs.existsSync(src)) return res.status(404).json({ ok: false, msg: "office_bg_small.webp 不存在" });
    ensureHomeFavoritesIndex();
    const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const itemId = `home-${ts}`;
    const fn = `${itemId}.webp`;
    const dst = path.join(HOME_FAVORITES_DIR, fn);
    fs.copyFileSync(src, dst);

    const idx = loadHomeFavoritesIndex();
    const items = idx.items || [];
    items.unshift({ id: itemId, path: path.relative(ROOT_DIR, dst).replace(/\\/g, "/"), created_at: new Date().toISOString().slice(0, 19) });
    while (items.length > HOME_FAVORITES_MAX) {
      const tail = items.pop();
      if (tail?.path) {
        const p = path.join(ROOT_DIR, tail.path);
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
          } catch (_) {}
        }
      }
    }
    saveHomeFavoritesIndex({ items });
    res.json({ ok: true, id: itemId, path: path.relative(ROOT_DIR, dst).replace(/\\/g, "/"), msg: "已收藏当前地图" });
  });

  app.post("/assets/home-favorites/delete", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const itemId = String(req.body?.id || "").trim();
    if (!itemId) return res.status(400).json({ ok: false, msg: "缺少 id" });
    const idx = loadHomeFavoritesIndex();
    const hit = (idx.items || []).find((x) => String(x.id || "") === itemId);
    if (!hit) return res.status(404).json({ ok: false, msg: "收藏项不存在" });
    if (hit.path) {
      const p = path.join(ROOT_DIR, hit.path);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (_) {}
      }
    }
    idx.items = (idx.items || []).filter((x) => String(x.id || "") !== itemId);
    saveHomeFavoritesIndex(idx);
    res.json({ ok: true, id: itemId, msg: "已删除收藏" });
  });

  app.post("/assets/home-favorites/apply", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const itemId = String(req.body?.id || "").trim();
    if (!itemId) return res.status(400).json({ ok: false, msg: "缺少 id" });
    const idx = loadHomeFavoritesIndex();
    const hit = (idx.items || []).find((x) => String(x.id || "") === itemId);
    if (!hit) return res.status(404).json({ ok: false, msg: "收藏项不存在" });
    const src = path.join(ROOT_DIR, String(hit.path || ""));
    if (!fs.existsSync(src)) return res.status(404).json({ ok: false, msg: "收藏文件不存在" });
    const target = path.join(FRONTEND_DIR, "office_bg_small.webp");
    if (!fs.existsSync(target)) return res.status(404).json({ ok: false, msg: "office_bg_small.webp 不存在" });
    fs.copyFileSync(target, `${target}.bak`);
    fs.copyFileSync(src, target);
    const st = fs.statSync(target);
    res.json({ ok: true, path: "office_bg_small.webp", size: st.size, from: hit.path, msg: "已应用收藏地图" });
  });

  app.post("/assets/restore-default", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const relPath = String(req.body?.path || "").trim().replace(/^\/+/, "");
    if (!relPath) return res.status(400).json({ ok: false, msg: "缺少 path" });
    const target = safeFrontendPath(relPath);
    if (!target) return res.status(400).json({ ok: false, msg: "非法 path" });
    if (!fs.existsSync(target)) return res.status(404).json({ ok: false, msg: "目标文件不存在" });
    const defaultPath = `${target}.default`;
    if (!fs.existsSync(defaultPath)) return res.status(404).json({ ok: false, msg: "未找到默认资产快照" });
    fs.copyFileSync(target, `${target}.bak`);
    fs.copyFileSync(defaultPath, target);
    const st = fs.statSync(target);
    res.json({ ok: true, path: relPath, size: st.size, msg: "已重置为默认资产" });
  });

  app.post("/assets/restore-prev", (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const relPath = String(req.body?.path || "").trim().replace(/^\/+/, "");
    if (!relPath) return res.status(400).json({ ok: false, msg: "缺少 path" });
    const target = safeFrontendPath(relPath);
    if (!target) return res.status(400).json({ ok: false, msg: "非法 path" });
    const bak = `${target}.bak`;
    if (!fs.existsSync(bak)) return res.status(404).json({ ok: false, msg: "未找到上一版备份" });
    fs.copyFileSync(bak, target);
    const st = fs.statSync(target);
    res.json({ ok: true, path: relPath, size: st.size, msg: "已回退到上一版" });
  });

  app.post("/assets/upload", upload.single("file"), (req, res) => {
    if (!requireAssetEditorAuth(req, res)) return;
    const relPath = String(req.body?.path || "").trim().replace(/^\/+/, "");
    const backup = String(req.body?.backup || "1").trim() !== "0";
    if (!relPath || !req.file) return res.status(400).json({ ok: false, msg: "缺少 path 或 file" });
    const target = safeFrontendPath(relPath);
    if (!target) return res.status(400).json({ ok: false, msg: "非法 path" });
    const ext = path.extname(target).toLowerCase();
    if (!ASSET_ALLOWED_EXTS.has(ext)) return res.status(400).json({ ok: false, msg: "仅允许上传图片/美术资源类型" });
    if (!fs.existsSync(target)) return res.status(404).json({ ok: false, msg: "目标文件不存在，请先从 /assets/list 选择 path" });

    const defaultSnap = `${target}.default`;
    if (!fs.existsSync(defaultSnap)) {
      try {
        fs.copyFileSync(target, defaultSnap);
      } catch (_) {}
    }
    if (backup) {
      try {
        fs.copyFileSync(target, `${target}.bak`);
      } catch (_) {}
    }
    fs.copyFileSync(req.file.path, target);
    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}
    const st = fs.statSync(target);
    res.json({ ok: true, path: relPath, size: st.size, backup });
  });
}

module.exports = { registerAssetRoutes };
