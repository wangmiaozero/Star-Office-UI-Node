<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> |
  <a href="./README.md">English</a> |
  <a href="./README_ko.md">한국어</a> |
  <a href="./README_fr.md">Français</a> |
  <strong>Deutsch</strong> |
  <a href="./README_ja.md">日本語</a> |
  <a href="./README_zh-TW.md">繁體中文</a> |
  <a href="./README_ru.md">Русский</a>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-f69220?logo=pnpm&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

Ein **Pixel-Büro-Dashboard** für Multi-Agent-Kollaboration: Es zeigt live, was eure KI-Assistenten (OpenClaw, Lobster usw.) tun — wer aktiv ist, was „gestern“ passiert ist und wer online ist.

Dieses Repo ist eine **Node.js / Express**-Umsetzung von **Star-Office-UI**: gleiches Look-and-Feel und HTTP-Vertrag, damit bestehende Agenten wenig ändern müssen; das Backend ist für **dauerhaften Betrieb** gedacht.

Vier UI-Stile: Pixel, Soft, Mitternacht, Papier — Standard **Pixel**.

![像素风格](./docs/screenshots/office-preview-1.png)
![柔和风格](./docs/screenshots/office-preview-2.png)
![夜青风格](./docs/screenshots/office-preview-3.png)
![纸本风格](./docs/screenshots/office-preview-4.png)

## Was diesen Fork auszeichnet

- **Service-Struktur**: Routen, Services, Config und Bootstrap unter `src/` statt einer Monolith-Datei.
- **Toolchain erzwungen**: **pnpm** und **Node ≥ 20** (`engines`, `only-allow`, `engine-strict`, Prüfung in `src/bootstrap/env-check.js`).
- **Betrieb**: **Graceful Shutdown** bei `SIGTERM` / `SIGINT`. **`GET /health`**, **`GET /ready`** nach Persistenz-Init.
- **Status auf der Platte**: Hauptstatus, Agentenliste und Join-Keys als JSON neben der App.
- **Gestern-Memo**: Markdown aus **`memory/`** (`GET /yesterday-memo`).

## Danksagungen

- Upstream: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- Original: Ring Hyacinth (und Mitwirkende)
- Dieses Repo: Express-Neuaufbau von [wangmiaozero](https://github.com/wangmiaozero)

## Schnellstart

**Node ≥ 20**, **pnpm ≥ 9** ([pnpm installieren](https://pnpm.io/installation)).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

Standard-URL: `http://127.0.0.1:18791`

Entwicklung mit Watch:

```bash
pnpm dev
```

Port belegt:

```bash
PORT=18792 pnpm start
```

Optional:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` nur für Sonderfälle ohne pnpm — **nicht** für Produktion empfohlen.

## Docker Compose

```bash
docker compose up -d
```

Dann: `http://127.0.0.1:18791`

## Nützliche Befehle

Haupt-Agent-Status:

```bash
pnpm set-state writing "Dokumentation"
```

Health:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## API-Überblick

- `GET /health` — Liveness
- `GET /ready` — Readiness
- `GET /status` — Hauptstatus
- `POST /set_state` — Status setzen
- `GET /agents` — Agentenliste
- `POST /join-agent` — Gast beitreten
- `POST /agent-push` — Gast-Status
- `POST /leave-agent` — Gast verlassen
- `POST /agent-approve` / `POST /agent-reject` — Genehmigen/Ablehnen
- `GET /yesterday-memo` — Memo aus `memory/YYYY-MM-DD.md`
- `GET /`, `/join`, `/invite` — Seiten; statische Dateien unter `/static`

## OpenClaw / Lobster anbinden

### 1) Zustände

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

Mapping:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) Join und `agentId` cachen

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

### 3) Status regelmäßig pushen (10–30 s)

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

### 4) Verlassen

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

Empfohlen: beim Start `join-agent` → `agentId` speichern → Intervall-Push → beim Shutdown `leave-agent` → bei `403`/`404` Push stoppen und neu joinen oder alarmieren.

## Lizenz

- Code: [MIT](./LICENSE)
- Grafiken können zusätzliche Bedingungen des Upstreams haben; für kommerzielle Nutzung ggf. eigene Assets verwenden.

## Sterne

Wenn das Projekt hilft, freuen wir uns über einen Stern.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
