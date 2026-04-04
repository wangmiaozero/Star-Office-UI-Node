<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> |
  <a href="./README.md">English</a> |
  <strong>한국어</strong> |
  <a href="./README_fr.md">Français</a> |
  <a href="./README_de.md">Deutsch</a> |
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

**픽셀 오피스 대시보드**로 멀티 에이전트 협업을 시각화합니다. OpenClaw, Lobster 등 AI 어시스턴트가 무엇을 하는지, 누가 활성 상태인지, “어제” 무엇이 있었는지, 누가 온라인인지 한눈에 볼 수 있습니다.

이 저장소는 상위 **[Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)** 아이디어를 **Node.js / Express**로 구현한 것입니다. 화면과 HTTP 계약을 유지해 기존 에이전트·스크립트 변경을 최소화하고, 백엔드는 **장기 실행 서비스**에 맞게 구성했습니다.

UI 스타일 4종: 픽셀, 소프트, 미드나잇, 페이퍼 — 기본은 **픽셀**입니다.

![像素风格](./docs/screenshots/office-preview-1.jpg) 
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## 이 포크의 특징

- **서비스형 코드베이스**: `src/` 아래 라우트·서비스·설정·부트스트랩으로 분리.
- **도구 체인 고정**: **pnpm**과 **Node ≥ 20** (`engines`, `only-allow`, `engine-strict`, `src/bootstrap/env-check.js`).
- **운영 친화**: `SIGTERM` / `SIGINT` **정상 종료**. **`GET /health`**, 초기화 후 **`GET /ready`**.
- **디스크 상태**: 메인 상태, 에이전트 목록, 조인 키를 JSON으로 보관 — 백업·볼륨 마운트에 적합.
- **어제 메모**: 형제 디렉터리 **`memory/`**의 Markdown을 읽습니다 (`GET /yesterday-memo`).

## 크레딧

- 원본: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- 원작자: Ring Hyacinth (및 기여자)
- 본 저장소: [wangmiaozero](https://github.com/wangmiaozero)의 Express 재구성

## 빠른 시작

**Node ≥ 20**, **pnpm ≥ 9** ([pnpm 설치](https://pnpm.io/installation)).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

기본 URL: `http://127.0.0.1:18791`

파일 감시 개발:

```bash
pnpm dev
```

포트 충돌 시:

```bash
PORT=18792 pnpm start
```

환경 변수 예:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1`은 pnpm 없이 `node src/server.js`를 돌려야 할 때만 — **프로덕션에는 비권장**입니다.

## Docker Compose

```bash
docker compose up -d
```

브라우저: `http://127.0.0.1:18791`

## 자주 쓰는 명령

메인 에이전트 상태 설정:

```bash
pnpm set-state writing "문서 작성 중"
```

헬스·레디:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## API 개요

- `GET /health` — 생존
- `GET /ready` — 준비 완료(시작 검사 후)
- `GET /status` — 메인 에이전트 상태
- `POST /set_state` — 메인 상태 설정
- `GET /agents` — 에이전트 목록(게스트 정리·오프라인 처리)
- `POST /join-agent` — 게스트 참가
- `POST /agent-push` — 게스트 상태 푸시
- `POST /leave-agent` — 게스트 퇴장
- `POST /agent-approve` / `POST /agent-reject` — 승인/거절
- `GET /yesterday-memo` — `memory/YYYY-MM-DD.md` 기반 메모
- `GET /`, `/join`, `/invite` — 웹 페이지; 정적 자원은 `/static`

## OpenClaw / Lobster 연동

### 1) 지원 상태

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

호환 매핑:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) join 후 `agentId` 저장

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

### 3) 주기적 푸시(10~30초)

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

### 4) 퇴장

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

권장 흐름: 시작 시 `join-agent` → `agentId` 로컬 저장 → 주기 `agent-push` → 정상 종료 시 `leave-agent` → `403`/`404` 시 푸시 중단 후 재참가 또는 알림.

## 라이선스

- 코드: [MIT](./LICENSE)
- 아트 에셋은 상위 저장소 조건을 따를 수 있으며, 상업적 이용 시 필요 시 자체 에셋으로 교체하세요.

## 스타

도움이 되었다면 스타를 부탁드립니다.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
