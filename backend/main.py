"""LeadBoard FastAPI application entrypoint."""
import logging
import time

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.auth import get_current_user
from core.config import settings
from core.logging_config import configure_logging, new_request_id, request_id_ctx

# Import module routers here as new modules are added.
from modules.tasks.router import router as tasks_router
from modules.projects.router import router as projects_router
from modules.projects.timeline_router import router as timeline_router
from modules.dashboard.router import router as dashboard_router
from modules.meetings.router import router as meetings_router
from modules.meetings.template_router import router as meeting_templates_router
from modules.weekly_review.router import router as weekly_review_router
from modules.auth.router import router as auth_router
from modules.users.router import router as users_router
from modules.ai.router import router as ai_router
from modules.watchers.router import router as watchers_router
from modules.projects.member_router import router as project_members_router
from modules.system.router import router as system_router

configure_logging()
logger = logging.getLogger("leadboard")

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Attach a request ID to every request for easy log tracing."""
    rid = request.headers.get("X-Request-ID") or new_request_id()
    request_id_ctx.set(rid)
    start = time.perf_counter()

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = rid
    logger.info(
        "%s %s -> %s (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return a clear JSON error message instead of a raw stack trace.

    NOTE: a handler for the base `Exception` class is promoted by Starlette to
    the outermost ServerErrorMiddleware, which runs OUTSIDE CORSMiddleware.
    That means responses built here would normally be missing the
    Access-Control-Allow-Origin header, which makes the browser report a
    misleading "CORS error" instead of the real 500. We add the CORS header
    back manually so the frontend can still read the error response.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    response = JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again.",
            "request_id": request_id_ctx.get(),
        },
    )
    origin = request.headers.get("origin")
    if origin in settings.cors_origins_list:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok", "version": settings.APP_VERSION, "env": settings.APP_ENV}


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
    return {"message": "LeadBoard API", "docs": "/docs"}


# Register module routers.
# Auth endpoints are public (login/register/refresh); /auth/me is self-guarded.
app.include_router(auth_router)
# Users router endpoints are guarded individually by role dependencies.
app.include_router(users_router)

# All existing feature routers now require a valid access token. Applying the
# dependency here (instead of editing each router) acts as auth middleware and
# keeps the existing module files unchanged.
_auth = [Depends(get_current_user)]
app.include_router(tasks_router, dependencies=_auth)
app.include_router(projects_router, dependencies=_auth)
app.include_router(timeline_router, dependencies=_auth)
app.include_router(dashboard_router, dependencies=_auth)
app.include_router(meetings_router, dependencies=_auth)
app.include_router(meeting_templates_router, dependencies=_auth)
app.include_router(weekly_review_router, dependencies=_auth)
app.include_router(ai_router, dependencies=_auth)
app.include_router(watchers_router, dependencies=_auth)
app.include_router(project_members_router, dependencies=_auth)
app.include_router(system_router, dependencies=_auth)


@app.on_event("startup")
def _seed_meeting_templates() -> None:
    """Idempotently seed the built-in system meeting templates."""
    from core.database import SessionLocal
    from modules.meetings.template_service import seed_system_templates

    db = SessionLocal()
    try:
        seed_system_templates(db)
    except Exception:  # pragma: no cover - non-fatal seeding
        logger.exception("Failed to seed system meeting templates")
    finally:
        db.close()


@app.on_event("startup")
def _seed_admin_account() -> None:
    """Seed the admin account from ADMIN_USERNAME / ADMIN_PASSWORD env vars."""
    from core.database import SessionLocal
    from modules.users.service import seed_admin

    db = SessionLocal()
    try:
        seed_admin(db)
    except Exception:  # pragma: no cover - non-fatal seeding
        logger.exception("Failed to seed admin account")
    finally:
        db.close()
