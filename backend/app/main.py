from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import auth, medicos, visitas

settings = get_settings()

app = FastAPI(
    title="SIDM API",
    description="Sistema de Inteligencia de Disponibilidad Médica — Backend",
    version="0.1.0",
    docs_url="/docs" if settings.app_env == "development" else None,
)

# ── CORS ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ───────────────────────────────────────────────────────
app.include_router(auth.router,    prefix="/api/v1")
app.include_router(medicos.router, prefix="/api/v1")
app.include_router(visitas.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"status": "ok", "sistema": "SIDM API v0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
