# Tasks Module — API

Quản lý công việc cá nhân của Tech Lead / EM.

Base path: `/api/tasks`

## Fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | Auto increment |
| `title` | string | Bắt buộc |
| `description` | string \| null | |
| `priority` | `P0` \| `P1` \| `P2` | Mặc định `P2` |
| `status` | `todo` \| `in_progress` \| `waiting` \| `done` | Mặc định `todo` |
| `type` | `my_task` \| `delegated` \| `waiting_for` | Mặc định `my_task` |
| `due_date` | datetime \| null | ISO 8601 |
| `project_id` | int \| null | Liên kết Project (Module 2) |
| `tags` | string[] | Trả về mảng, lưu dạng CSV |
| `created_at` | datetime | Tự sinh |
| `updated_at` | datetime | Tự cập nhật |

## Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/tasks` | Danh sách task (có filter + sort) |
| `GET` | `/api/tasks/{id}` | Chi tiết 1 task |
| `POST` | `/api/tasks` | Tạo task mới |
| `PATCH` | `/api/tasks/{id}` | Cập nhật 1 phần task |
| `DELETE` | `/api/tasks/{id}` | Xóa task |
| `GET` | `/api/tasks/{id}/subtasks` | Danh sách sub-task của task |
| `POST` | `/api/tasks/{id}/subtasks` | Thêm sub-task |
| `PATCH` | `/api/tasks/{id}/subtasks/{subtask_id}` | Cập nhật sub-task (title / is_done / order / assignee / due_date) |
| `DELETE` | `/api/tasks/{id}/subtasks/{subtask_id}` | Xóa sub-task |
| `PUT` | `/api/tasks/{id}/subtasks/reorder` | Sắp xếp lại thứ tự (drag & drop) — body `{ ordered_ids: number[] }` |
| `GET` | `/api/tasks/{id}/attachments` | Danh sách attachment (link) |
| `POST` | `/api/tasks/{id}/attachments` | Thêm attachment — body `{ url, label }` |
| `DELETE` | `/api/tasks/{id}/attachments/{attachment_id}` | Xóa attachment |
| `GET` | `/api/tasks/{id}/comments` | Danh sách bình luận |
| `POST` | `/api/tasks/{id}/comments` | Thêm bình luận — body `{ content }` |
| `DELETE` | `/api/tasks/{id}/comments/{comment_id}` | Xóa bình luận |
| `GET` | `/api/tasks/{id}/activities` | Nhật ký hoạt động (chỉ đọc, backend tự ghi) |

### Query params cho `GET /api/tasks`

- `priority` = `P0` \| `P1` \| `P2`
- `status` = `todo` \| `in_progress` \| `waiting` \| `done`
- `type` = `my_task` \| `delegated` \| `waiting_for`
- `project_id` = int
- `due_before`, `due_after` = datetime (ISO 8601)
- `sort_by` = `priority` \| `due_date` \| `created_at` (mặc định `created_at`)
- `order` = `asc` \| `desc` (mặc định `desc`)

## Lỗi

- `404` — task không tồn tại, kèm message rõ ràng.
- `422` — payload không hợp lệ (do FastAPI/Pydantic validate).

## Sub-tasks (checklist)

Bảng `subtasks`: `id, task_id (FK → tasks, ON DELETE CASCADE), title, is_done, order, assignee, due_date, created_at`.

- Tạo bằng Alembic migration `0002_create_subtasks`; cột `assignee`/`due_date` thêm ở `0003_task_collaboration` (không drop bảng cũ).
- `POST` không cần `order` — tự thêm vào cuối.
- Xóa task sẽ tự xóa sub-task nhờ khóa ngoại CASCADE.
- Kéo-thả sắp xếp lại dùng `PUT /reorder` với danh sách id theo thứ tự mới.

## Attachments / Comments / Activities

Migration `0003_task_collaboration` tạo 3 bảng mới (đều có `task_id` FK CASCADE):

- `task_attachments`: `url, label, created_at` — chỉ lưu link, không upload file.
- `task_comments`: `content, created_at` — bình luận thủ công.
- `task_activities`: `action, old_value, new_value, created_at` — nhật ký tự động, **không có endpoint POST**. Backend tự ghi khi `create_task`/`update_task` thay đổi `status`, `priority`, `due_date`, `tags` (action: `task_created`, `status_changed`, `priority_changed`, `due_date_changed`, `tags_changed`).

