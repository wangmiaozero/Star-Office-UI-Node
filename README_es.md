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
  <strong>Español</strong> |
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

Un **panel tipo oficina pixel** para colaboración multiagente: muestra en tiempo real qué hacen tus asistentes de IA (OpenClaw, Lobster, etc.) — quién está activo, qué pasó «ayer» y quién está en línea — para que las personas entiendan la situación de un vistazo.

Este repositorio es una implementación **Node.js / Express** de la idea **Star-Office-UI** original. Mantiene la misma apariencia y contrato HTTP para que agentes y scripts existentes casi no cambien, mientras el backend está pensado para **servicios de larga ejecución**, no un único script monolítico.

El proyecto ofrece cuatro estilos: Pixel, Soft, Night Blue y Paper; el predeterminado es **Pixel**.

![像素风格](./docs/screenshots/office-preview-1.jpg)
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## Qué distingue a *este* fork

- **Código orientado a servicio**: rutas, servicios, configuración y arranque bajo `src/`, no un solo archivo gigante. Más fácil de revisar, probar y extender.
- **La cadena de herramientas importa**: se exigen **pnpm** y **Node ≥ 20** (`engines`, `only-allow`, `engine-strict` en `.npmrc`, comprobación en `src/bootstrap/env-check.js`). CI y onboarding se comportan igual en todas partes.
- **Operación**: el servidor HTTP hace **apagado ordenado** con `SIGTERM` / `SIGINT` (adecuado para Docker/K8s). **`GET /health`** para liveness y **`GET /ready`** tras inicializar la persistencia.
- **Estado en disco**: estado principal, lista de agentes y claves de unión en JSON junto a la app — sencillo de respaldar, comparar y montar con volúmenes en compose.
- **Memo de ayer**: lee Markdown de un directorio hermano **`memory/`** (véase `GET /yesterday-memo`), convirtiendo diarios en un breve «qué hicimos la última vez».

Los créditos del proyecto original están abajo; después se explica cómo ejecutar e integrar.

## Créditos

- Original: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- Autor original: Ring Hyacinth (y colaboradores)
- Este repositorio: reescritura backend Express y estructura por [wangmiaozero](https://github.com/wangmiaozero)

Gracias por publicar en abierto el concepto de oficina pixel, los recursos y el diseño de interacción.

## Inicio rápido

Necesitas **Node ≥ 20** y **pnpm ≥ 9** (instala [pnpm](https://pnpm.io/installation) si hace falta).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

URL por defecto: `http://127.0.0.1:18791`

Desarrollo con recarga:

```bash
pnpm dev
```

Si el puerto está ocupado:

```bash
PORT=18792 pnpm start
```

Archivo de entorno opcional:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` solo está documentado para casos excepcionales en los que debas ejecutar `node src/server.js` sin pnpm — **no** se recomienda en producción.

## Docker Compose

```bash
docker compose up -d
```

Luego abre: `http://127.0.0.1:18791`

## Comandos habituales

Establecer el estado del agente **principal** (ayuda CLI):

```bash
pnpm set-state writing "Drafting docs"
```

Salud y preparación:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## Resumen de la API

- `GET /health` — liveness
- `GET /ready` — readiness (tras comprobaciones de arranque)
- `GET /status` — estado del agente principal
- `POST /set_state` — establecer estado del agente principal
- `GET /agents` — listar agentes (se aplica limpieza de invitados / lógica offline)
- `POST /join-agent` — unión de agente invitado
- `POST /agent-push` — envío de estado del agente
- `POST /leave-agent` — salida del agente
- `POST /agent-approve` / `POST /agent-reject` — aprobar o rechazar invitado
- `GET /yesterday-memo` — memo derivado de `memory/YYYY-MM-DD.md`
- `GET /`, `/join`, `/invite` — páginas web; recursos estáticos bajo `/static`

## Integración con OpenClaw / Lobster

### 1) Estados admitidos

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

Mapeo de compatibilidad:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) Unirse una vez y guardar `agentId`

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

### 3) Enviar estado periódicamente (cada 10–30 s)

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

### 4) Salir

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

Ciclo de vida sugerido:

1. Llamar a `join-agent` al arrancar  
2. Persistir `agentId` localmente  
3. Enviar periódicamente  
4. Llamar a `leave-agent` en apagado ordenado  
5. Ante `403`/`404`, dejar de enviar y volver a unirse o alertar  

## Licencia

- Código: [MIT](./LICENSE)
- Los recursos gráficos pueden tener términos adicionales del proyecto original; para uso comercial, sustituye por los tuyos donde haga falta.

## Historial de estrellas

Si este proyecto te ayuda, se agradece una estrella.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
