<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> |
  <a href="./README.md">English</a> |
  <a href="./README_ko.md">한국어</a> |
  <a href="./README_fr.md">Français</a> |
  <a href="./README_de.md">Deutsch</a> |
  <a href="./README_ja.md">日本語</a> |
  <strong>繁體中文</strong> |
  <a href="./README_ru.md">Русский</a>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-f69220?logo=pnpm&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

**像素風「辦公室」看板**：把多路 AI 助手（OpenClaw、龍蝦等）的工作狀態即時呈現在一個畫面上——誰在寫、誰在查、誰在跑任務、誰在線，以及「昨天」留下了什麼痕跡，讓人一眼讀懂協作現場。

本倉庫是上游 **[Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)** 的 **Node / Express** 實作：保留同款畫面與 HTTP 行為，方便既有 Agent 與腳本幾乎零改動接入；後端依**可長期運行的服務**來拆層，而不是單一巨大腳本。

本專案支援四種介面風格：像素、柔和、夜青、紙本，預設為**像素**。

![像素风格](./docs/screenshots/office-preview-1.jpg)
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## 本專案的特色

- **工程化分層**：路由、業務服務、設定、啟動校驗分在 `src/` 下，可讀、可測、可迭代。
- **工具鏈寫進規範**：強制 **pnpm** 與 **Node ≥ 20**（`engines`、`only-allow`、`.npmrc` 的 `engine-strict`，以及 `src/bootstrap/env-check.js` 執行時校驗）。
- **面向部署的行程模型**：支援 **`SIGTERM` / `SIGINT` 優雅退出**；提供 **`GET /health`（存活）** 與 **`GET /ready`（就緒）** 探針。
- **狀態落盤簡單透明**：主狀態、多 Agent 列表、接入金鑰等以 JSON 檔與專案同級存放，備份與卷掛載都很直觀。
- **昨日小記**：`GET /yesterday-memo` 會讀取與倉庫同級的 **`memory/`** 目錄下依日期命名的 Markdown。

## 致謝與來源

- 原專案：[ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- 原作者：Ring Hyacinth（以及貢獻者）
- 本倉庫：由 [wangmiaozero](https://github.com/wangmiaozero) 以 Express 重寫並組織目錄結構

## 快速開始

需 **Node ≥ 20**、**pnpm ≥ 9**（見 [pnpm 安裝](https://pnpm.io/installation)）。

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

預設位址：`http://127.0.0.1:18791`

開發（檔案變更自動重啟）：

```bash
pnpm dev
```

埠位被占用時：

```bash
PORT=18792 pnpm start
```

環境變數範例：

```bash
cp .env.example .env
```

僅在無法以 pnpm 包裹行程時，可使用 **`SKIP_PNPM_CHECK=1`** 直接執行 `node src/server.js`；**生產環境不建議**。

## Docker Compose

```bash
docker compose up -d
```

瀏覽器開啟：`http://127.0.0.1:18791`

## 常用命令

切換**主 Agent**狀態：

```bash
pnpm set-state writing "正在整理文件"
```

健康與就緒：

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## API 概覽

- `GET /health`：存活探針
- `GET /ready`：就緒探針（持久化初始化完成後）
- `GET /status`：主 Agent 目前狀態
- `POST /set_state`：設定主 Agent 狀態
- `GET /agents`：多 Agent 列表（含過期／離線清理）
- `POST /join-agent`：訪客 Agent 加入
- `POST /agent-push`：訪客 Agent 推送狀態
- `POST /leave-agent`：訪客 Agent 離開
- `POST /agent-approve` / `POST /agent-reject`：核准或拒絕訪客
- `GET /yesterday-memo`：基於 `memory/` 的昨日小記
- `GET /`、`/join`、`/invite`：頁面入口；靜態資源在 `/static`

## 對接 OpenClaw / 龍蝦

### 1) 狀態列舉

- `idle`、`writing`、`researching`、`executing`、`syncing`、`error`

相容對應：

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) 首次接入：join

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

### 3) 持續推送：agent-push

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

### 4) 離開房間

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

### 5) 建議流程

1. 啟動時呼叫一次 `join-agent`
2. 將 `agentId` 持久化到本機
3. 依固定間隔呼叫 `agent-push`
4. 行程退出時呼叫 `leave-agent`
5. 若收到 `403` / `404`，停止推送並重試 join 或告警

## 開源與許可

- 程式碼以 [MIT License](./LICENSE) 發布
- 倉庫內美術資源可能受上源授權約束，商用請自行替換為自有素材

## Star

若專案對你有幫助，歡迎點一個 ⭐

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
