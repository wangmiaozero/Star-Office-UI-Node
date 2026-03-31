# Star-Office-UI-Node 架构说明

## 当前目录结构（已拆分）

```text
Star-Office-UI-Node/
├── app.js                    # 入口：装配依赖、注册路由、启动服务
├── src/
│   └── routes/
│       ├── agents.js         # 多 Agent 相关接口
│       └── assets.js         # 资产编辑、生图、收藏等接口
├── frontend/                 # 前端资源与页面
├── docs/
│   └── ARCHITECTURE_ZH.md
├── state.json                # 主状态（持久化）
├── agents-state.json         # 多 Agent 状态（持久化）
├── join-keys.json            # Join Key（持久化）
├── asset-positions.json      # 资产位置（持久化）
├── asset-defaults.json       # 资产默认值（持久化）
└── runtime-config.json       # 运行时配置（持久化）
```

## 工具链硬约束

- **仅 pnpm**：`npm`/`yarn` 安装会在 `preinstall` 阶段失败；`engines` + `.npmrc` 双保险。
- **Node**：`>=18.18.0`；`app.js` / `set_state.js` 入口加载 `enforce-runtime.js`，与 `pnpm start` 一致（禁止裸 `node app.js`）。
- **pnpm 版本**：`>=9`；生命周期脚本通过 `npm_config_user_agent` 解析 `pnpm/x.y.z`。
- **CI**：`.github/workflows/ci.yml` 使用 `pnpm install --frozen-lockfile`。

## 设计原则

- Node 原生优先：CommonJS + Express，低心智负担。
- 单一职责：`app.js` 负责装配，业务路由拆到 `src/routes/*`。
- 本地持久化优先：核心状态全部落盘 JSON，进程重启可恢复。
- 兼容前端：保持页面和 API 语义稳定，避免破坏现有调用方。

## 持久化策略

- 所有 JSON 写入走原子写：先写 `*.tmp-*` 再 `rename` 覆盖，避免中途断电导致半写文件。
- 首次启动自动创建缺失状态文件，保证冷启动可用。
- 背景历史、收藏数据落盘在 `assets/` 下，适合备份/迁移。

## 并发与可用性

- 进程内并发：
  - Node 单进程事件循环天然串行执行 JS 逻辑；
  - 文件写使用同步 + 原子替换，降低并发写冲突风险。
- 任务并发：
  - 生图任务使用内存任务表 + 轮询接口；
  - 同时只允许一个 pending 生图任务，避免资源打爆。
- 可用性：
  - `/health` 可用于进程探活；
  - 状态 TTL 自动回 `idle`，避免“僵尸工作中”状态。

## 生产建议（高并发/高可用）

- 反向代理：Nginx/Caddy 放前，开启 gzip 和静态缓存。
- 进程守护：`pm2` 或 systemd，开启自动拉起和日志切割。
- 多副本部署：
  - 如果要跑多实例，不要共享本地 JSON 直写；
  - 状态层迁移到 Redis/PostgreSQL（推荐），再做无状态 API 副本。
- 会话与任务：
  - 资产抽屉认证 token、生图任务状态目前是内存态；
  - 多实例场景建议迁移到 Redis。

## 后续建议拆分（可选）

- `src/services/stateStore.js`：读写 state/agents/join-keys/runtime-config。
- `src/services/authService.js`：资产抽屉 token 生命周期。
- `src/services/geminiService.js`：生图任务创建、轮询、错误码规范化。
- `src/routes/system.js`：`/health`、`/status`、`/set_state`、`/yesterday-memo`。

