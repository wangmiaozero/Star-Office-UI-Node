<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> |
  <a href="./README.md">English</a> |
  <a href="./README_ko.md">한국어</a> |
  <a href="./README_fr.md">Français</a> |
  <a href="./README_de.md">Deutsch</a> |
  <strong>日本語</strong> |
  <a href="./README_ru.md">Русский</a> |
  <a href="./README_es.md">Español</a> |
  <a href="./README_pt.md">Português</a> |
  <a href="./README_it.md">Italiano</a> |
  <a href="./README_vi.md">Tiếng Việt</a> |
  <a href="./README_ar.md">العربية</a>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-f69220?logo=pnpm&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

マルチエージェント協業向けの **ピクセル風オフィス・ダッシュボード** です。OpenClaw や Lobster などの AI アシスタントが今何をしているか、「昨日」の記録、誰がオンラインかをリアルタイムに可視化します。

本リポジトリは上流 **[Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)** を **Node.js / Express** で再実装したもので、見た目と HTTP 契約を保ち既存エージェントの変更を最小限にしつつ、バックエンドは **常駐サービス** 向けに整理しています。

UI は 4 スタイル：ピクセル、ソフト、夜青、紙本 — 既定は **ピクセル** です。

![像素风格](./docs/screenshots/office-preview-1.jpg)  
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## このフォークの特徴

- **サービス型構成**: ルート・サービス・設定・ブートストラップを `src/` に分離。
- **ツールチェーン固定**: **pnpm** と **Node ≥ 20**（`engines`、`only-allow`、`engine-strict`、`src/bootstrap/env-check.js`）。
- **運用向け**: `SIGTERM` / `SIGINT` で **graceful shutdown**。**`GET /health`**、永続化後の **`GET /ready`**。
- **ディスク上の状態**: メイン状態・エージェント一覧・参加キーを JSON で保持 — バックアップとボリューム運用が容易。
- **昨日のメモ**: 隣接する **`memory/`** の Markdown を読みます（`GET /yesterday-memo`）。

## クレジット

- 上流: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- 原作者: Ring Hyacinth（およびコントリビュータ）
- 本リポジトリ: [wangmiaozero](https://github.com/wangmiaozero) による Express 再構成

## クイックスタート

**Node ≥ 20**、**pnpm ≥ 9**（[pnpm インストール](https://pnpm.io/installation)）。

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

既定 URL: `http://127.0.0.1:18791`

ファイル監視付き開発:

```bash
pnpm dev
```

ポートが使用中の場合:

```bash
PORT=18792 pnpm start
```

環境変数の例:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` は pnpm なしで `node src/server.js` を動かす際のみ — **本番では非推奨** です。

## Docker Compose

```bash
docker compose up -d
```

ブラウザで `http://127.0.0.1:18791`

## よく使うコマンド

メインエージェントの状態:

```bash
pnpm set-state writing "ドキュメント作成中"
```

ヘルス・レディ:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## API 概要

- `GET /health` — 生存
- `GET /ready` — 準備完了（起動チェック後）
- `GET /status` — メインエージェント状態
- `POST /set_state` — メイン状態の設定
- `GET /agents` — エージェント一覧（ゲスト整理・オフライン処理）
- `POST /join-agent` — ゲスト参加
- `POST /agent-push` — ゲスト状態のプッシュ
- `POST /leave-agent` — ゲスト退出
- `POST /agent-approve` / `POST /agent-reject` — 承認／拒否
- `GET /yesterday-memo` — `memory/YYYY-MM-DD.md` 由来のメモ
- `GET /`, `/join`, `/invite` — ページ；静的ファイルは `/static`

## OpenClaw / Lobster 連携

### 1) 対応状態

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

互換マッピング:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) join と `agentId` の保存

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

### 3) 定期的なプッシュ（10〜30 秒）

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

### 4) 退出

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

推奨フロー: 起動時に `join-agent` → `agentId` をローカル保存 → 一定間隔で `agent-push` → 正常終了時に `leave-agent` → `403`/`404` ではプッシュ停止と再 join またはアラート。

## ライセンス

- コード: [MIT](./LICENSE)
- アートは上流の条件がある場合があります。商用利用時は必要に応じて差し替えてください。

## スター

役に立ったらスターをいただけると嬉しいです。

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
