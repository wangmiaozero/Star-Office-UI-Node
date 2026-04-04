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
  <strong>Português</strong> |
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

Um **painel de escritório em pixels** para colaboração multiagente: mostra em tempo real o que seus assistentes de IA (OpenClaw, Lobster, etc.) estão fazendo — quem está ativo, o que aconteceu «ontem» e quem está online — para que as pessoas entendam o cenário num relance.

Este repositório é uma implementação **Node.js / Express** da ideia **Star-Office-UI** original. Mantém a mesma aparência e contrato HTTP para que agentes e scripts existentes quase não precisem mudar, enquanto o backend é estruturado para **serviço de longa duração** — não um único script monolítico.

O projeto oferece quatro estilos: Pixel, Soft, Night Blue e Paper; o padrão é **Pixel**.

![像素风格](./docs/screenshots/office-preview-1.jpg)
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## O que torna *este* fork diferente

- **Código em forma de serviço**: rotas, serviços, configuração e bootstrap em `src/`, em vez de um único arquivo. Mais fácil de revisar, testar e estender.
- **A cadeia de ferramentas faz parte do produto**: **pnpm** e **Node ≥ 20** são obrigatórios (`engines`, `only-allow`, `engine-strict` no `.npmrc`, verificação em `src/bootstrap/env-check.js`). CI e onboarding se comportam igual em todo lugar.
- **Operação**: o servidor HTTP faz **encerramento gracioso** em `SIGTERM` / `SIGINT` (adequado para Docker/K8s). **`GET /health`** para liveness e **`GET /ready`** após inicializar a persistência.
- **Estado em disco**: status principal, lista de agentes e chaves de join em JSON ao lado do app — simples de fazer backup, diff e montar com volumes no compose.
- **Memo de ontem**: lê Markdown de um diretório irmão **`memory/`** (veja `GET /yesterday-memo`), transformando diários em um breve «o que fizemos da última vez».

Créditos do projeto original abaixo; em seguida, como executar e integrar.

## Créditos

- Upstream: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- Autor original: Ring Hyacinth (e colaboradores)
- Este repositório: reescrita do backend Express e layout por [wangmiaozero](https://github.com/wangmiaozero)

Obrigado por abrir o conceito de escritório em pixels, os assets e o design de interação.

## Início rápido

Requer **Node ≥ 20** e **pnpm ≥ 9** (instale o [pnpm](https://pnpm.io/installation) se precisar).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

URL padrão: `http://127.0.0.1:18791`

Desenvolvimento com watch:

```bash
pnpm dev
```

Se a porta estiver ocupada:

```bash
PORT=18792 pnpm start
```

Arquivo de ambiente opcional:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` está documentado apenas para casos extremos em que você precise rodar `node src/server.js` sem pnpm — **não** é recomendado em produção.

## Docker Compose

```bash
docker compose up -d
```

Depois abra: `http://127.0.0.1:18791`

## Comandos comuns

Definir o estado do agente **principal** (helper CLI):

```bash
pnpm set-state writing "Drafting docs"
```

Saúde e prontidão:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## Visão geral da API

- `GET /health` — liveness
- `GET /ready` — readiness (após verificações de inicialização)
- `GET /status` — status do agente principal
- `POST /set_state` — definir status do agente principal
- `GET /agents` — listar agentes (limpeza de convidados / lógica offline aplicada)
- `POST /join-agent` — entrada de agente convidado
- `POST /agent-push` — envio de status do agente
- `POST /leave-agent` — saída do agente
- `POST /agent-approve` / `POST /agent-reject` — aprovar ou rejeitar convidado
- `GET /yesterday-memo` — memo derivado de `memory/YYYY-MM-DD.md`
- `GET /`, `/join`, `/invite` — páginas web; assets estáticos em `/static`

## Integração com OpenClaw / Lobster

### 1) Estados suportados

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

Mapeamento de compatibilidade:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) Entrar uma vez e guardar `agentId`

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

### 3) Enviar status periodicamente (a cada 10–30 s)

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

### 4) Sair

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

Ciclo de vida sugerido:

1. Chamar `join-agent` na inicialização  
2. Persistir `agentId` localmente  
3. Enviar em intervalo  
4. Chamar `leave-agent` no encerramento gracioso  
5. Em `403`/`404`, parar de enviar e entrar de novo ou alertar  

## Licença

- Código: [MIT](./LICENSE)
- Assets de arte podem ter termos adicionais do upstream; para uso comercial, substitua pelos seus quando necessário.

## Histórico de estrelas

Se este projeto ajudar você, uma estrela é apreciada.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
