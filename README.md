<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> | <strong>English</strong>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

This repository is a Node.js remake of the original **Star-Office-UI** project.
It keeps the same visual experience and API behavior so existing clients (including OpenClaw / lobster agents) can integrate with minimal changes.

![Star Office UI Preview](./docs/screenshots/office-preview-20260301.jpg)

## Credits

- Upstream project: `https://github.com/ringhyacinth/Star-Office-UI`
- Original author: Ring Hyacinth (and contributors)
- This fork/remake rewrites backend from Flask to Express

Thanks to the original author for open-sourcing the idea, assets pipeline, and interaction design.

## Quick Start

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

Use environment file:

```bash
cp .env.example .env
```

## Run with Docker Compose

```bash
docker compose up -d
```

Then open: `http://127.0.0.1:18791`

## Common Commands

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

## API Overview

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

## Integrate with OpenClaw / Lobster

### 1) Supported states

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

### 2) Join once and get `agentId`

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

### 3) Push status periodically (every 10-30s)

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

### 4) Leave

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

## Open Source License

- Code is licensed under `MIT`, see `LICENSE`
- Art assets in this repo may have additional restrictions from upstream
- For commercial usage, replace all assets with your own originals

## 📄 License

[MIT](./LICENSE)

## ⭐ Star History

If you find this project helpful, please give it a ⭐!

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
