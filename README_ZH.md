<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <strong>简体中文</strong> |
  <a href="./README.md">English</a> |
  <a href="./README_ko.md">한국어</a> |
  <a href="./README_fr.md">Français</a> |
  <a href="./README_de.md">Deutsch</a> |
  <a href="./README_ja.md">日本語</a> |
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

**像素风「办公室」看板**：把多路 AI 助手（OpenClaw、龙虾等）的工作状态实时铺在一屏上——谁在写、谁在查、谁在跑任务、谁在线，以及「昨天」留下了什么痕迹，让人一眼读懂协作现场。

本仓库是上游 **[Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)** 的 **Node / Express** 实现：保留同款画面与 HTTP 行为，方便已有 Agent 与脚本几乎零改动接入；后端按**可长期运行的服务**来拆层，而不是单文件堆逻辑。



本项目支持4种风格：像素、柔和、夜青、纸本，默认像素风格。

![像素风格](./docs/screenshots/office-preview-1.jpg)
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)



## 本项目的特色（和「又一个复刻」不一样在哪）

- **工程化分层**：路由、业务服务、配置、启动校验分在 `src/` 下，可读、可测、可迭代，而不是所有代码挤在一个入口文件里。
- **工具链写进规范**：强制 **pnpm** 与 **Node ≥ 20**（`engines`、`only-allow`、`.npmrc` 的 `engine-strict`，以及 `src/bootstrap/env-check.js` 运行时校验），减少「我本地能跑、CI 不能跑」的摩擦。
- **面向部署的进程模型**：支持 **`SIGTERM` / `SIGINT` 优雅退出**，适合 Docker / K8s 滚动发布；提供 **`GET /health`（存活）** 与 **`GET /ready`（就绪）** 探针。
- **状态落盘简单透明**：主状态、多 Agent 列表、接入密钥等以 JSON 文件形式与项目同级存放，备份与卷挂载都很直观。
- **昨日小记**：`GET /yesterday-memo` 会读取与仓库同级的 **`memory/`** 目录下按日期命名的 Markdown，把日记提炼成简短展示（具体规则见实现）。

下面仍保留对上源的致谢与对接说明；运行方式与 API 与英文版 README 同步维护。

## 致谢与来源

- 原项目：[ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- 原作者：Ring Hyacinth（以及贡献者）
- 本仓库：由 [wangmiaozero](https://github.com/wangmiaozero) 基于原理念用 Express 重写并组织目录结构

感谢原作者开源像素办公室的设计与素材管线，本仓库在此基础上做 Node 化与运维向增强。

## 快速开始

需 **Node ≥ 20**、**pnpm ≥ 9**（见 [pnpm 安装](https://pnpm.io/installation)）。

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

默认地址：`http://127.0.0.1:18791`

开发（文件变更自动重启）：

```bash
pnpm dev
```

端口占用时：

```bash
PORT=18792 pnpm start
```

环境变量示例：

```bash
cp .env.example .env
```

仅在无法用 pnpm 包裹进程时，可使用 **`SKIP_PNPM_CHECK=1`** 直接执行 `node src/server.js`；**生产环境不建议**。

## Docker Compose

```bash
docker compose up -d
```

浏览器访问：`http://127.0.0.1:18791`

## 常用命令

切换**主 Agent**状态（命令行小工具）：

```bash
pnpm set-state writing "正在整理文档"
pnpm set-state researching "正在查资料"
pnpm set-state executing "正在执行任务"
pnpm set-state syncing "同步进度中"
pnpm set-state error "发现问题，排查中"
pnpm set-state idle "待命中"
```

健康与就绪：

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## API 概览

- `GET /health`：存活探针
- `GET /ready`：就绪探针（持久化初始化完成后）
- `GET /status`：主 Agent 当前状态
- `POST /set_state`：设置主 Agent 状态
- `GET /agents`：多 Agent 列表（含过期 / 离线清理逻辑）
- `POST /join-agent`：访客 Agent 加入
- `POST /agent-push`：访客 Agent 推送状态
- `POST /leave-agent`：访客 Agent 离开
- `POST /agent-approve` / `POST /agent-reject`：批准或拒绝访客
- `GET /yesterday-memo`：基于 `memory/` 目录的昨日小记
- `GET /`、`/join`、`/invite`：页面入口；静态资源在 `/static`

## 对接 OpenClaw / 龙虾（重点）

### 1) 状态枚举

- `idle`、`writing`、`researching`、`executing`、`syncing`、`error`

兼容映射：

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) 首次接入：join

先调用 `join-agent`，拿到并缓存 `agentId`（后续 `agent-push` 必带）：

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

建议每 10～30 秒推送一次：

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

### 5) 建议流程

1. 启动时调用一次 `join-agent`
2. 将 `agentId` 持久化到本地
3. 按固定间隔调用 `agent-push`
4. 进程退出时调用 `leave-agent`
5. 若收到 `403` / `404`，停止推送并重试 join 或告警

## 开源与许可

- 代码以 [MIT License](./LICENSE) 发布
- 仓库内美术资源可能受上源授权约束，商用请自行替换为自有素材

## Star

若项目对你有帮助，欢迎点一个 ⭐

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
