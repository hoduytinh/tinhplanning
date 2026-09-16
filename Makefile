# LeadBoard — Makefile
# Các lệnh phổ biến cho local dev.

.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help dev build up down logs seed migrate revision shell-backend clean deploy health

help: ## Hiển thị danh sách lệnh
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

dev: ## Chạy toàn bộ app (hot reload) — 1 lệnh duy nhất
	$(COMPOSE) up --build

build: ## Build lại images
	$(COMPOSE) build

up: ## Chạy nền (detached)
	$(COMPOSE) up -d

down: ## Dừng và gỡ container
	$(COMPOSE) down

logs: ## Xem log realtime
	$(COMPOSE) logs -f

seed: ## Chạy lại seed data (idempotent)
	$(COMPOSE) exec backend python -m seed

migrate: ## Áp dụng migration mới nhất
	$(COMPOSE) exec backend alembic upgrade head

revision: ## Tạo migration mới:  make revision m="mô tả"
	$(COMPOSE) exec backend alembic revision --autogenerate -m "$(m)"

shell-backend: ## Mở shell trong container backend
	$(COMPOSE) exec backend bash

deploy: ## Push lên main — Vercel + Render tự động deploy
	git push origin main
	@echo "✓ Đã push — Vercel + Render đang auto-deploy..."

health: ## Kiểm tra health backend production:  make health RENDER_URL=https://...
	@curl -s $${RENDER_URL}/health | python -m json.tool

clean: ## Dừng và xóa container (GIỮ NGUYÊN volume dữ liệu)
	$(COMPOSE) down --remove-orphans
