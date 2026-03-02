<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <strong>简体中文</strong> | <a href="./README.md">English</a>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

一个面向多 Agent 协作的像素办公室看板：把 AI 助手（OpenClaw / 龙虾）的工作状态实时可视化，帮助团队直观看到“谁在做什么、昨天做了什么、现在是否在线”。
基于原项目 **Star-Office-UI** 的 Node.js 复刻版，目标是保持原有前端体验和 API 兼容，同时让 Node 技术栈用户开箱即用。

![Star Office UI 预览](https://raw.githubusercontent.com/ringhyacinth/Star-Office-UI/main/docs/screenshots/office-preview-20260301.jpg)

## 致谢与来源

- 原项目：`https://github.com/ringhyacinth/Star-Office-UI`
- 原作者：Ring Hyacinth（以及贡献者）
- 本仓库基于原项目实现 Node 版本（后端从 Flask 改为 Express）

感谢原作者开源这套像素办公室看板的设计与实现，给了这个 Node 版本落地基础。

## 项目定位

- 复刻原版后端核心能力：状态服务 + 多 Agent 接入 + 昨日小记
- 保留原前端资源与页面路由
- API 尽量对齐原版，便于 OpenClaw / 龙虾及已有脚本无痛接入

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

## 常用命令

切换主 Agent 状态：

```bash
node set_state.js writing "正在整理文档"
node set_state.js researching "正在查资料"
node set_state.js executing "正在执行任务"
node set_state.js syncing "同步进度中"
node set_state.js error "发现问题，排查中"
node set_state.js idle "待命中"
```

健康检查：

```bash
curl -s http://127.0.0.1:18791/health
```

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

## 对接 OpenClaw / 龙虾（重点）

### 1) 状态枚举

支持状态：

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

### 2) 首次接入：join

先调用 `join-agent`，拿到 `agentId`（后续 push 必带）：

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

### 3) 持续推送：agent-push

建议每 10~30 秒推送一次：

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

### 4) 离开房间

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

### 5) OpenClaw 侧建议流程

1. 启动时调用一次 `join-agent`
2. 缓存 `agentId` 到本地文件
3. 按固定间隔调用 `agent-push`
4. 进程退出时调用 `leave-agent`
5. 若收到 `403/404`，停止推送并重试 join 或告警

## 开源与许可

- 本仓库代码采用 `MIT License`，见 `LICENSE`
- 本仓库包含来自原项目的前端美术资源，素材授权范围不等同于 MIT
- 若用于商用，建议替换为你自己的原创素材

## 📄 License

[MIT](./LICENSE)

## ⭐ Star History

如果你觉得这个项目有帮助，欢迎点一个 ⭐!

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
