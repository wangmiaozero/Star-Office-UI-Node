# Star Office UI Node

基于原项目 **Star-Office-UI** 的 Node.js 复刻版，目标是保持原有前端体验和 API 兼容，同时让 Node 技术栈用户开箱即用。

---

## 致谢与来源

- 原项目：`https://github.com/ringhyacinth/Star-Office-UI`
- 原作者：Ring Hyacinth（以及贡献者）
- 这个仓库是基于原项目进行的 Node.js 版本实现（后端从 Flask 改为 Express）

感谢原作者开源这套像素办公室看板的设计与实现，给了这个 Node 版本落地基础。

---

## 项目定位

- 复刻原版后端核心能力：状态服务 + 多 Agent 接入 + 昨日小记
- 保留原前端资源与页面路由
- API 尽量对齐原版，便于 OpenClaw / 龙虾及已有脚本无痛接入

---

## 快速开始

```bash
cd /Users/hfy/wm-code/Star-Office-UI-Node
pnpm install
pnpm start
```

默认地址：`http://127.0.0.1:18791`

若端口占用：

```bash
PORT=18792 pnpm start
```

---

## 常用命令

### 1) 切换主 Agent 状态

```bash
node set_state.js writing "正在整理文档"
node set_state.js researching "正在查资料"
node set_state.js executing "正在执行任务"
node set_state.js syncing "同步进度中"
node set_state.js error "发现问题，排查中"
node set_state.js idle "待命中"
```

### 2) 健康检查

```bash
curl -s http://127.0.0.1:18791/health
```

---

## API 概览

- `GET /health`：健康检查
- `GET /status`：主 Agent 当前状态
- `POST /set_state`：设置主 Agent 状态
- `GET /agents`：多 Agent 列表
- `POST /join-agent`：访客 Agent 加入
- `POST /agent-push`：访客 Agent 推送状态
- `POST /leave-agent`：访客 Agent 离开
- `POST /agent-approve`：批准访客（当前配置下拿到 key 通常已自动批准）
- `POST /agent-reject`：拒绝访客
- `GET /yesterday-memo`：昨日小记
- `GET /`、`/join`、`/invite`：页面入口

---

## 对接 OpenClaw / 龙虾（重点）

这里给你一套最直接的接入协议，OpenClaw 侧只要能发 HTTP 就能接。

### A. 状态枚举（必须）

服务端支持并推荐以下状态：

- `idle`
- `writing`
- `researching`
- `executing`
- `syncing`
- `error`

兼容映射：

- `working` / `busy` / `write` -> `writing`
- `run` / `running` / `execute` / `exec` -> `executing`
- `sync` -> `syncing`
- `research` / `search` -> `researching`

### B. 首次接入：join

先调用 `join-agent`，拿到 `agentId`（后续 push 必带）。

```bash
curl -s -X POST http://127.0.0.1:18791/join-agent \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openclaw-agent-01",
    "joinKey": "ocj_starteam02",
    "state": "idle",
    "detail": "刚刚加入"
  }'
```

成功响应示例：

```json
{
  "ok": true,
  "agentId": "agent_xxx",
  "authStatus": "approved"
}
```

### C. 持续推送：agent-push

拿到 `agentId` 后循环推送（建议 10~30 秒一次）：

```bash
curl -s -X POST http://127.0.0.1:18791/agent-push \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_xxx",
    "joinKey": "ocj_starteam02",
    "name": "openclaw-agent-01",
    "state": "writing",
    "detail": "正在整理任务上下文"
  }'
```

### D. 离开房间

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

### E. OpenClaw 侧建议流程

1. 启动时调用一次 `join-agent`
2. 缓存 `agentId` 到本地文件（避免每次重启都重复 join）
3. 按固定间隔调用 `agent-push`
4. 任务结束或进程退出时调用 `leave-agent`
5. 若收到 `403/404`，停止推送并触发重试 join 或告警

---

## 目录结构（简版）

```text
Star-Office-UI-Node/
  app.js
  set_state.js
  state.json
  state.sample.json
  agents-state.json
  join-keys.json
  frontend/
  package.json
```

---

## 开源与许可

### 代码许可

- 本仓库代码采用 `MIT License`，见 `LICENSE`
- 你可以自由使用、修改、分发、二次开发（需保留 MIT 声明）

### 资产与素材声明（重要）

- 本仓库包含来自原项目的前端美术资源（角色、场景、动画等）
- 这些资源不等同于 MIT 授权范围，请遵守原项目对素材使用的限制与说明
- 若你要商用，建议替换为你自己的原创素材

### 致谢保留建议

- 建议在你的二次发布仓库中保留“致谢与来源”段落
- 建议保留原项目链接：`https://github.com/ringhyacinth/Star-Office-UI`

---

## English Documentation

This repository is a Node.js remake of the original **Star-Office-UI** project.
It keeps the same visual experience and API behavior so existing clients (including OpenClaw / lobster agents) can integrate with minimal changes.

### Credits

- Upstream project: `https://github.com/ringhyacinth/Star-Office-UI`
- Original author: Ring Hyacinth (and contributors)
- This fork/remake rewrites backend from Flask to Express

Thanks to the original author for open-sourcing the idea, assets pipeline, and interaction design.

### Quick Start

```bash
cd /Users/hfy/wm-code/Star-Office-UI-Node
pnpm install
pnpm start
```

Default URL: `http://127.0.0.1:18791`

If the port is occupied:

```bash
PORT=18792 pnpm start
```

### Common Commands

```bash
node set_state.js writing "Drafting docs"
node set_state.js researching "Doing research"
node set_state.js executing "Executing tasks"
node set_state.js syncing "Syncing progress"
node set_state.js error "Debugging issue"
node set_state.js idle "Standing by"
```

Health check:

```bash
curl -s http://127.0.0.1:18791/health
```

### API Overview

- `GET /health`: health check
- `GET /status`: main agent status
- `POST /set_state`: set main agent status
- `GET /agents`: list all agents
- `POST /join-agent`: join as guest agent
- `POST /agent-push`: push guest status
- `POST /leave-agent`: leave the office
- `POST /agent-approve`: approve guest agent
- `POST /agent-reject`: reject guest agent
- `GET /yesterday-memo`: yesterday memo
- `GET /`, `/join`, `/invite`: web entry pages

### Integrate with OpenClaw / Lobster

#### 1) Supported states

- `idle`
- `writing`
- `researching`
- `executing`
- `syncing`
- `error`

Compatibility mapping:

- `working` / `busy` / `write` -> `writing`
- `run` / `running` / `execute` / `exec` -> `executing`
- `sync` -> `syncing`
- `research` / `search` -> `researching`

#### 2) Join once and get `agentId`

```bash
curl -s -X POST http://127.0.0.1:18791/join-agent \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openclaw-agent-01",
    "joinKey": "ocj_starteam02",
    "state": "idle",
    "detail": "just joined"
  }'
```

#### 3) Push status periodically (every 10-30s)

```bash
curl -s -X POST http://127.0.0.1:18791/agent-push \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_xxx",
    "joinKey": "ocj_starteam02",
    "name": "openclaw-agent-01",
    "state": "writing",
    "detail": "working on current task context"
  }'
```

#### 4) Leave

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

Recommended lifecycle:

1. Call `join-agent` on startup
2. Cache `agentId` locally
3. Push status on interval
4. Call `leave-agent` on graceful shutdown
5. If `403/404` happens, stop pushing and re-join or alert

### Open Source License

- Code is licensed under `MIT`, see `LICENSE`
- Art assets in this repo may have additional restrictions from upstream
- For commercial usage, replace all assets with your own originals
