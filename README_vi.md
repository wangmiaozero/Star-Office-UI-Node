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
  <a href="./README_it.md">Italiano</a> |
  <strong>Tiếng Việt</strong> |
  <a href="./README_ar.md">العربية</a>
</p>
<!-- markdownlint-enable MD033 MD041 -->

# Star Office UI Node

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-f69220?logo=pnpm&logoColor=white)
[![GitHub stars](https://img.shields.io/github/stars/wangmiaozero/Star-Office-UI-Node?style=social)](https://github.com/wangmiaozero/Star-Office-UI-Node/stargazers)

Một **bảng điều khiển văn phòng pixel** cho cộng tác đa tác tử: hiển thị theo thời gian thực các trợ lý AI (OpenClaw, Lobster, v.v.) đang làm gì — ai đang hoạt động, «hôm qua» đã xảy ra gì, ai đang trực tuyến — để con người nắm tình huống một cái nhìn.

Kho lưu trữ này triển khai **Node.js / Express** theo ý tưởng **Star-Office-UI** gốc. Giữ nguyên giao diện và hợp đồng HTTP để tác tử và script hiện có gần như không đổi, trong khi backend được tổ chức cho **dịch vụ chạy lâu dài** — không phải một script khổng lồ đơn lẻ.

Dự án hỗ trợ bốn kiểu: Pixel, Soft, Night Blue và Paper; mặc định là **Pixel**.

![像素风格](./docs/screenshots/office-preview-1.jpg)
![柔和风格](./docs/screenshots/office-preview-2.jpg)
![夜青风格](./docs/screenshots/office-preview-3.jpg)
![纸本风格](./docs/screenshots/office-preview-4.jpg)

## Điểm khác của *bản fork* này

- **Mã theo hướng dịch vụ**: route, service, cấu hình và bootstrap nằm trong `src/` thay vì một file duy nhất. Dễ review, test và mở rộng.
- **Chuỗi công cụ là một phần sản phẩm**: bắt buộc **pnpm** và **Node ≥ 20** (`engines`, `only-allow`, `engine-strict` trong `.npmrc`, kiểm tra trong `src/bootstrap/env-check.js`). CI và onboarding nhất quán mọi nơi.
- **Vận hành**: máy chủ HTTP **tắt an toàn** khi nhận `SIGTERM` / `SIGINT` (thích hợp Docker/K8s). **`GET /health`** cho liveness và **`GET /ready`** sau khi khởi tạo persistence.
- **Trạng thái trên đĩa**: trạng thái chính, danh sách tác tử và khóa join là JSON cạnh ứng dụng — dễ sao lưu, diff và gắn volume trong compose.
- **Ghi nhớ hôm qua**: đọc Markdown từ thư mục **`memory/`** cùng cấp (xem `GET /yesterday-memo`), biến nhật ký thành đoạn «lần trước chúng ta đã làm gì».

Phần ghi công dự án gốc ở dưới; sau đó là cách chạy và tích hợp.

## Ghi công

- Nguồn gốc: [ringhyacinth/Star-Office-UI](https://github.com/ringhyacinth/Star-Office-UI)
- Tác giả gốc: Ring Hyacinth (và cộng tác viên)
- Kho này: viết lại backend Express và bố cục dự án bởi [wangmiaozero](https://github.com/wangmiaozero)

Cảm ơn đã mã nguồn mở khái niệm văn phòng pixel, tài nguyên và thiết kế tương tác.

## Bắt đầu nhanh

Cần **Node ≥ 20** và **pnpm ≥ 9** (cài [pnpm](https://pnpm.io/installation) nếu cần).

```bash
git clone https://github.com/wangmiaozero/Star-Office-UI-Node.git
cd Star-Office-UI-Node
pnpm install
pnpm start
```

URL mặc định: `http://127.0.0.1:18791`

Phát triển có watch:

```bash
pnpm dev
```

Nếu cổng bận:

```bash
PORT=18792 pnpm start
```

Tệp môi trường tùy chọn:

```bash
cp .env.example .env
```

`SKIP_PNPM_CHECK=1` chỉ ghi nhận cho trường hợp hiếm khi phải chạy `node src/server.js` không qua pnpm — **không** khuyến nghị cho production.

## Docker Compose

```bash
docker compose up -d
```

Sau đó mở: `http://127.0.0.1:18791`

## Lệnh thường dùng

Đặt trạng thái tác tử **chính** (CLI tiện ích):

```bash
pnpm set-state writing "Drafting docs"
```

Sức khỏe và sẵn sàng:

```bash
curl -s http://127.0.0.1:18791/health
curl -s http://127.0.0.1:18791/ready
```

## Tổng quan API

- `GET /health` — liveness
- `GET /ready` — readiness (sau kiểm tra khởi động)
- `GET /status` — trạng thái tác tử chính
- `POST /set_state` — đặt trạng thái tác tử chính
- `GET /agents` — danh sách tác tử (dọn khách / logic offline)
- `POST /join-agent` — tác tử khách tham gia
- `POST /agent-push` — đẩy trạng thái tác tử
- `POST /leave-agent` — tác tử rời
- `POST /agent-approve` / `POST /agent-reject` — duyệt hoặc từ chối khách
- `GET /yesterday-memo` — memo từ `memory/YYYY-MM-DD.md`
- `GET /`, `/join`, `/invite` — trang web; tài nguyên tĩnh dưới `/static`

## Tích hợp OpenClaw / Lobster

### 1) Trạng thái được hỗ trợ

- `idle`, `writing`, `researching`, `executing`, `syncing`, `error`

Ánh xạ tương thích:

- `working` / `busy` / `write` → `writing`
- `run` / `running` / `execute` / `exec` → `executing`
- `sync` → `syncing`
- `research` / `search` → `researching`

### 2) Tham gia một lần và lưu `agentId`

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

### 3) Đẩy trạng thái định kỳ (mỗi 10–30 giây)

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

### 4) Rời

```bash
curl -s -X POST http://127.0.0.1:18791/leave-agent \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_xxx"}'
```

Vòng đời gợi ý:

1. Gọi `join-agent` khi khởi động  
2. Lưu `agentId` cục bộ  
3. Đẩy theo chu kỳ  
4. Gọi `leave-agent` khi tắt an toàn  
5. Khi `403`/`404`, ngừng đẩy và tham gia lại hoặc cảnh báo  

## Giấy phép

- Mã: [MIT](./LICENSE)
- Tài sản đồ họa có thể có điều khoản thêm từ upstream; dùng thương mại thì thay bằng tài sản của bạn khi cần.

## Lịch sử sao

Nếu dự án hữu ích, một sao là động viên lớn.

---

<!-- markdownlint-disable MD033 -->
<p align="center">
  Made with ❤️ by <a href="https://github.com/wangmiaozero">wangmiaozero</a>
</p>
<!-- markdownlint-enable MD033 -->
