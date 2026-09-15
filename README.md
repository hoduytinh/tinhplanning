# LeadBoard

Web app quản lý công việc cá nhân dành cho Tech Lead / Engineering Manager.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** FastAPI (Python) + SQLAlchemy + Alembic
- **Database:** SQLite (file trong volume `/data`, không mất khi rebuild)
- **Local dev:** Docker Compose (hot reload cả frontend & backend)

---

## Chạy local

### Cách 1 — Docker (nếu có Docker Desktop)

```bash
docker compose up --build
```

> Hoặc dùng Makefile: `make dev`

Lần đầu chạy sẽ tự động: chạy migration → seed 8 task mẫu → khởi động server.

### Cách 2 — Không cần Docker (Windows, chỉ cần Python + Node portable)

Dành cho máy công ty không được cài phần mềm. Chỉ cần:
- **Python 3.12** (thường có sẵn)
- **Node.js bản portable** (`.zip`) — không cần cài, giải nén là dùng được.
  Chỉnh đường dẫn Node trong `start-frontend.bat` nếu để ở nơi khác.

Mở **2 cửa sổ** (double-click hoặc chạy trong terminal):

```
start-backend.bat     → API tại http://localhost:8000
start-frontend.bat    → Giao diện tại http://localhost:5173
```

Lần đầu, `start-backend.bat` tự migrate + seed; `start-frontend.bat` tự `npm install`.

> Lưu ý execution policy: dự án dùng `npm.cmd` (không phải `npm.ps1`) nên
> không bị chặn bởi chính sách của công ty.

Sau khi cả hai khởi động xong:

| Dịch vụ | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |

Dừng lại: `Ctrl + C`, rồi `docker compose down` (dữ liệu vẫn được giữ trong volume).

---

## Cấu trúc

```
leadboard/
├── docker-compose.yml     # chạy local
├── Makefile               # make dev / build / logs / seed / migrate
├── .env.example           # mẫu biến môi trường
├── vercel.json            # deploy frontend (Vercel, root = frontend)
├── railway.toml           # deploy backend (Railway, root = backend)
├── backend/
│   ├── core/              # config, database, logging
│   ├── modules/tasks/     # Module 1 (router/models/schemas/service)
│   ├── alembic/           # migrations
│   ├── seed.py            # dữ liệu mẫu
│   └── main.py            # FastAPI app
└── frontend/
    └── src/
        ├── modules/tasks/ # TaskPage, TaskCard, TaskForm, taskApi
        ├── shared/        # Button, Badge, Modal, api.js
        └── App.jsx
```

---

## Các lệnh Makefile

| Lệnh | Tác dụng |
|------|----------|
| `make dev` | Chạy toàn bộ app (hot reload) |
| `make logs` | Xem log realtime |
| `make seed` | Chạy lại seed data (idempotent) |
| `make migrate` | Áp dụng migration mới nhất |
| `make revision m="..."` | Tạo migration mới từ thay đổi model |
| `make down` | Dừng container (giữ dữ liệu) |

---

## Deploy

### Frontend → Vercel
1. Import GitHub repo vào Vercel.
2. Root Directory: `frontend` (đã cấu hình trong `vercel.json`).
3. Thêm env `VITE_API_URL` = URL backend Railway.

### Backend → Railway
1. Import GitHub repo, Root Directory: `backend`.
2. Tạo **Volume** mount vào `/data` để giữ file SQLite.
3. Set env `DATABASE_URL`, `CORS_ORIGINS` (thêm domain Vercel).

---

## Module đã hoàn thành

- ✅ **Module 1 — Tasks:** CRUD, filter (priority/status/type/project/due_date), sort (priority/due_date/created_at), badge màu, seed data.

Các module tiếp theo (Projects, Dashboard, Meetings, Weekly Review) sẽ được thêm mà không sửa file của module cũ.
