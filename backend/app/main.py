import logging
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.routers import auth, medicos, visitas, admin   # ← NUEVO

# ── LOGGING ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("sidm")

settings = get_settings()
APP_VERSION = "0.3.1"

app = FastAPI(
    title="SIDM API",
    description="Sistema de Inteligencia de Disponibilidad Médica — Backend",
    version=APP_VERSION,
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
)


# ── SECURITY HEADERS MIDDLEWARE ───────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],    # no wildcard
    allow_headers=["Authorization", "Content-Type"],    # no wildcard
)


# ── GLOBAL ERROR HANDLER ─────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Error no manejado: %s %s → %s",
                 request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )


# ── ROUTERS ───────────────────────────────────────────────────────
app.include_router(auth.router,    prefix="/api/v1")
app.include_router(medicos.router, prefix="/api/v1")
app.include_router(visitas.router, prefix="/api/v1")
app.include_router(admin.router,   prefix="/api/v1")   # ← NUEVO


@app.get("/")
async def root():
    return {"status": "ok", "sistema": f"SIDM API v{APP_VERSION}"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


logger.info("SIDM API iniciada — env=%s", settings.app_env)
