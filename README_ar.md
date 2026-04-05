<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="./README_ZH.md">简体中文</a> |
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
  <strong>العربية</strong>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-f69220?logo=pnpm&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

**لوحة تحكم مكتب بكسل** للتعاون متعدد الوكلاء: تعرض في الوقت الفعلي ما تفعله مساعدات الذكاء الاصطناعي (OpenClaw و Lobster وغيرها) — من نشط، وماذا حدث «أمس»، ومن متصل — ليقرأ الإنسان المشهد بسرعة.

هذا المستودع تنفيذ **Node.js / Express** لفكرة **Star-Office-UI** الأصلية. يحافظ على نفس المظهر وعقد HTTP حتى تحتاج الوكلاء والسكربتات الحالية إلى تغييرات بسيطة أو معدومة، بينما الخلفية مُهيأة **لخدمة طويلة الأمد** وليس سكربتًا واحدًا ضخمًا.

المشروع يدعم أربعة أنماط: Pixel و Soft و Night Blue و Paper؛ الافتراضي هو **Pixel**.

![像素风格](./docs/screenshots/office-preview-1.jpg)
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## ما الذي يميز *هذا* الفرع

- **شيفرة على شكل خدمة**: مسارات وخدمات وإعدادات وتمهيد تحت `src/` بدل ملف واحد. أسهل للمراجعة والاختبار والتوسعة.
- **سلسلة الأدوات جزء من المنتج**: يُشترط **pnpm** و **Node ≥ 20** (`engines` و `only-allow` و `engine-strict` في `.npmrc` وفحص في `src/bootstrap/env-check.js`). CI والتشغيل متسقان في كل مكان.
- **تشغيل**: الخادم يُنهي التشغيل **بشكل منظم** عند `SIGTERM` / `SIGINT` (مناسب لـ Docker/K8s). **`GET /health`** للبقاء و **`GET /ready`** بعد تهيئة التخزين.
- **حالة على القرص**: الحالة الرئيسية وقائمة الوكلاء ومفاتيح الانضمام في JSON بجانب التطبيق — سهلة للنسخ الاحتياطي والمقارنة والأحجام في compose.
- **مذكرة الأمس**: تقرأ Markdown من مجلد **`memory/`** المجاور (انظر `GET /yesterday-memo`) وتحول ملفات اليوميات إلى ملخص «ما فعلناه آخر مرة».

الشكر للمشروع الأصلي أدناه؛ ثم كيفية التشغيل والدمج.

## شكر وتقدير

- المصدر: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- المؤلف الأصلي: Ring Hyacinth (والمساهمون)
- هذا المستودع: إعادة كتابة خلفية Express وهيكلة المشروع بواسطة [wangmiaozero](https://github.com/wangmiaozero)

شكرًا لإتاحة مفهوم المكتب البكسل والأصول وتصميم التفاعل.

## بدء سريع

يُشترط **Node ≥ 20** و **pnpm ≥ 9** (ثبّت [pnpm](https://pnpm.io/installation) إن لزم).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

العنوان الافتراضي: `http://127.0.0.1:18791`

تطوير مع إعادة التحميل:

```bash
pnpm dev
```

إذا كان المنفذ مشغولًا:

```bash
PORT=18792 pnpm start
```

ملف بيئة اختياري:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` موثّق فقط لحالات نادرة يجب فيها تشغيل `node src/server.js` بدون pnpm — **لا** يُنصح به في الإنتاج.

## Docker Compose

```bash
docker compose up -d
```

ثم افتح: `http://127.0.0.1:18791`

## أوامر شائعة

تعيين حالة الوكيل **الرئيسي** (مساعد CLI):

```bash
pnpm set-state writing "Drafting docs"
```

الصحة والجاهزية:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## نظرة على واجهة API

- `GET /health` — البقاء
- `GET /ready` — الجاهزية (بعد فحوصات البدء)
- `GET /status` — حالة الوكيل الرئيسي
- `POST /set_state` — تعيين حالة الوكيل الرئيسي
- `GET /agents` — قائمة الوكلاء (تنظيف الضيوف / منطق غير المتصل)
- `POST /join-agent` — انضمام وكيل ضيف
- `POST /agent-push` — دفع حالة الوكيل
- `POST /leave-agent` — مغادرة الوكيل
- `POST /agent-approve` / `POST /agent-reject` — قبول أو رفض الضيف
- `GET /yesterday-memo` — مذكرة من `memory/YYYY-MM-DD.md`
- `GET /`, `/join`, `/invite` — صفحات الويب؛ الموارد الثابتة تحت `/static`

## الدمج مع OpenClaw / Lobster

### 1) الحالات المدعومة

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

ربط التوافق:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) انضم مرة واحدة واحفظ `agentId`

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

### 3) ادفع الحالة دوريًا (كل 10–30 ثانية)

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

### 4) مغادرة

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

دورة حياة مقترحة:

1. استدعِ `join-agent` عند البدء  
2. خزّن `agentId` محليًا  
3. ادفع على فترات  
4. استدعِ `leave-agent` عند الإغلاق المنظم  
5. عند `403`/`404`، توقف عن الدفع وأعد الانضمام أو تنبّه  

## الترخيص

- الشيفرة: [MIT](./LICENSE)
- أصول الفن قد تخضع لشروط إضافية من المصدر؛ للاستخدام التجاري استبدل بأصولك عند الحاجة.

## تاريخ النجوم

إذا ساعدك المشروع، نقدّر نجمة.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
