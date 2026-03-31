<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> | <strong>English</strong>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-f69220?logo=pnpm&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

A **pixel-office dashboard** for multi-agent collaboration: it visualizes what your AI assistants (OpenClaw, Lobster, etc.) are doing in real time—who is active, what happened “yesterday,” and who is online—so humans can read the room at a glance.

This repo is a **Node.js / Express** take on the upstream **Star-Office-UI** idea. It keeps the same look-and-feel and HTTP contract so existing agents and scripts need little or no change, while the backend is structured for **long-running service** use—not a single giant script.


This project supports 4 styles: pixel, soft, 夜青, paper, default pixel style.

![像素风格](./docs/screenshots/office-preview-1.png)
![柔和风格](./docs/screenshots/office-preview-2.png)
![夜青风格](./docs/screenshots/office-preview-3.png)
![纸本风格](./docs/screenshots/office-preview-4.png)

## What makes *this* fork different

- **Service-shaped codebase**: routes, services, config, and bootstrap live under `src/` instead of one monolithic file. Easier to review, test, and extend.
- **Toolchain is part of the product**: **pnpm** and **Node ≥ 20** are enforced (`engines`, `only-allow`, `.npmrc` `engine-strict`, plus a startup guard in `src/bootstrap/env-check.js`). CI and onboarding behave the same way everywhere.
- **Ops-friendly process**: HTTP server uses **graceful shutdown** on `SIGTERM` / `SIGINT` (Docker/K8s friendly). **`GET /health`** for liveness and **`GET /ready`** after persistence is initialized.
- **State on disk**: main status, multi-agent roster, and join keys are JSON files beside the app—simple to back up, diff, and ship with compose volumes.
- **Yesterday memo** reads markdown from a sibling **`memory/`** directory (see `GET /yesterday-memo`), turning diary files into a gentle “what we did last time” blurb.

Upstream lineage and thanks are below; the sections after that cover how to run and integrate.

## Credits

- Upstream: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- Original author: Ring Hyacinth (and contributors)
- This repository: Express backend rewrite and project layout by [wangmiaozero](https://github.com/wangmiaozero)

Thanks for open-sourcing the pixel-office concept, assets, and interaction design.

## Quick start

Requires **Node ≥ 20** and **pnpm ≥ 9** (install [pnpm](https://pnpm.io/installation) if needed).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

Default URL: `http://127.0.0.1:18791`

Development with file watch:

```bash
pnpm dev
```

If the port is busy:

```bash
PORT=18792 pnpm start
```

Optional env file:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` is documented only for edge cases where you must run `node src/server.js` without pnpm—it is **not** recommended for production.

## Docker Compose

```bash
docker compose up -d
```

Then open: `http://127.0.0.1:18791`

## Common commands

Set the **main** agent state (CLI helper):

```bash
pnpm set-state writing "Drafting docs"
```

Health and readiness:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## API overview

- `GET /health` — liveness
- `GET /ready` — readiness (after startup checks)
- `GET /status` — main agent status
- `POST /set_state` — set main agent status
- `GET /agents` — list agents (guest cleanup / offline logic applied)
- `POST /join-agent` — guest agent join
- `POST /agent-push` — guest status push
- `POST /leave-agent` — guest leave
- `POST /agent-approve` / `POST /agent-reject` — approve or reject guest
- `GET /yesterday-memo` — memo derived from `memory/YYYY-MM-DD.md`
- `GET /`, `/join`, `/invite` — web entry pages; static assets under `/static`

## Integrate with OpenClaw / Lobster

### 1) Supported states

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

Compatibility mapping:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) Join once and cache `agentId`

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

### 3) Push status periodically (every 10–30s)

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

Suggested lifecycle:

1. Call `join-agent` on startup  
2. Persist `agentId` locally  
3. Push on an interval  
4. Call `leave-agent` on graceful shutdown  
5. On `403`/`404`, stop pushing and re-join or alert  

## License

- Code: [MIT](./LICENSE)
- Art assets may carry additional terms from upstream; for commercial use, replace with your own assets where needed.

## Star history

If this project helps you, a star is appreciated.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
