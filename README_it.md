<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> |
  <a href="./README.md">English</a> |
  <a href="./README_ko.md">한국어</a> |
  <a href="./README_fr.md">Français</a> |
  <a href="./README_de.md">Deutsch</a> |
  <a href="./README_ja.md">日本語</a> |
  <a href="./README_zh-TW.md">繁體中文</a> |
  <a href="./README_ru.md">Русский</a> |
  <a href="./README_es.md">Español</a> |
  <a href="./README_pt.md">Português</a> |
  <strong>Italiano</strong> |
  <a href="./README_vi.md">Tiếng Việt</a> |
  <a href="./README_ar.md">العربية</a>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-f69220?logo=pnpm&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

Una **dashboard d’ufficio in pixel** per la collaborazione multi-agente: mostra in tempo reale cosa stanno facendo i tuoi assistenti IA (OpenClaw, Lobster, ecc.) — chi è attivo, cosa è successo «ieri» e chi è online — così le persone capiscono la situazione a colpo d’occhio.

Questo repository è un’implementazione **Node.js / Express** dell’idea **Star-Office-UI** a monte. Mantiene lo stesso aspetto e contratto HTTP così che agenti e script esistenti cambino poco o nulla, mentre il backend è strutturato per **servizi a lunga esecuzione**, non un unico script monolitico.

Il progetto offre quattro stili: Pixel, Soft, Night Blue e Paper; predefinito è **Pixel**.

![像素风格](./docs/screenshots/office-preview-1.jpg)
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## Cosa rende *questo* fork diverso

- **Codice a forma di servizio**: route, servizi, configurazione e bootstrap sotto `src/` invece di un unico file. Più facile da revisionare, testare ed estendere.
- **La toolchain conta**: **pnpm** e **Node ≥ 20** sono obbligatori (`engines`, `only-allow`, `engine-strict` in `.npmrc`, controllo in `src/bootstrap/env-check.js`). CI e onboarding si comportano allo stesso modo ovunque.
- **Operatività**: il server HTTP esegue **shutdown graduale** su `SIGTERM` / `SIGINT` (adatto a Docker/K8s). **`GET /health`** per liveness e **`GET /ready`** dopo l’inizializzazione della persistenza.
- **Stato su disco**: stato principale, elenco agenti e chiavi di join in JSON accanto all’app — semplice da backuppare, diffare e montare con volumi in compose.
- **Memo di ieri**: legge Markdown da una directory sorella **`memory/`** (vedi `GET /yesterday-memo`), trasformando i diari in un breve «cosa abbiamo fatto l’ultima volta».

I crediti del progetto originale sono sotto; poi come eseguire e integrare.

## Crediti

- Upstream: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- Autore originale: Ring Hyacinth (e contributori)
- Questo repository: riscrittura backend Express e struttura di progetto di [wangmiaozero](https://github.com/wangmiaozero)

Grazie per aver reso open source il concetto di ufficio pixel, gli asset e il design delle interazioni.

## Avvio rapido

Servono **Node ≥ 20** e **pnpm ≥ 9** (installa [pnpm](https://pnpm.io/installation) se necessario).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

URL predefinito: `http://127.0.0.1:18791`

Sviluppo con watch:

```bash
pnpm dev
```

Se la porta è occupata:

```bash
PORT=18792 pnpm start
```

File di ambiente opzionale:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` è documentato solo per casi limite in cui devi eseguire `node src/server.js` senza pnpm — **non** consigliato in produzione.

## Docker Compose

```bash
docker compose up -d
```

Poi apri: `http://127.0.0.1:18791`

## Comandi comuni

Imposta lo stato dell’agente **principale** (helper CLI):

```bash
pnpm set-state writing "Drafting docs"
```

Salute e readiness:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## Panoramica API

- `GET /health` — liveness
- `GET /ready` — readiness (dopo i controlli di avvio)
- `GET /status` — stato dell’agente principale
- `POST /set_state` — imposta stato dell’agente principale
- `GET /agents` — elenco agenti (pulizia ospiti / logica offline applicata)
- `POST /join-agent` — ingresso agente ospite
- `POST /agent-push` — invio stato agente
- `POST /leave-agent` — uscita agente
- `POST /agent-approve` / `POST /agent-reject` — approva o rifiuta ospite
- `GET /yesterday-memo` — memo derivato da `memory/YYYY-MM-DD.md`
- `GET /`, `/join`, `/invite` — pagine web; asset statici sotto `/static`

## Integrazione con OpenClaw / Lobster

### 1) Stati supportati

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

Mappatura di compatibilità:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) Entra una volta e memorizza `agentId`

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

### 3) Invia stato periodicamente (ogni 10–30 s)

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

### 4) Esci

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

Ciclo di vita suggerito:

1. Chiama `join-agent` all’avvio  
2. Persisti `agentId` in locale  
3. Invia a intervalli  
4. Chiama `leave-agent` allo shutdown graduale  
5. Su `403`/`404`, smetti di inviare e rientra o avvisa  

## Licenza

- Codice: [MIT](./LICENSE)
- Gli asset grafici possono avere termini aggiuntivi dall’upstream; per uso commerciale sostituiscili con i tuoi dove serve.

## Storia delle stelle

Se questo progetto ti è utile, una stella è apprezzata.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
