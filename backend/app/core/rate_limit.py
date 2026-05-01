"""
Rate limiter persistente usando Supabase.

Almacena intentos de login en una tabla de Supabase en vez de memoria.
Funciona correctamente con múltiples workers, restarts, y deploys.

Tabla requerida (ver migration_seguridad_v020.sql):
    CREATE TABLE login_attempts (
        id          SERIAL PRIMARY KEY,
        rate_key    VARCHAR(200) NOT NULL,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_login_attempts_key_time ON login_attempts(rate_key, attempted_at);
"""

import logging
from datetime import datetime, timedelta, timezone
from app.core.config import get_settings
from app.core.database import get_supabase

logger = logging.getLogger("sidm.ratelimit")


def check_rate_limit(key: str) -> bool:
    """
    Retorna True si el key tiene permitido intentar.
    Retorna False si se excedió el límite.
    """
    settings = get_settings()
    db = get_supabase()
    window_start = (
        datetime.now(timezone.utc) - timedelta(seconds=settings.login_window_seconds)
    ).isoformat()

    try:
        result = (
            db.table("login_attempts")
            .select("id", count="exact")
            .eq("rate_key", key)
            .gte("attempted_at", window_start)
            .execute()
        )
        count = result.count if result.count is not None else 0
    except Exception as e:
        # Si falla la query, permitir el intento (fail-open para no bloquear login)
        logger.error("Error consultando rate limit: %s", e)
        return True

    if count >= settings.login_max_attempts:
        logger.warning("Rate limit excedido: %s (%d intentos en %ds)",
                       key, count, settings.login_window_seconds)
        return False

    return True


def record_attempt(key: str):
    """Registra un intento de login en Supabase."""
    db = get_supabase()
    try:
        db.table("login_attempts").insert({
            "rate_key": key,
            "attempted_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        logger.error("Error registrando intento de login: %s", e)


def reset_attempts(key: str):
    """Limpia los intentos tras login exitoso."""
    db = get_supabase()
    try:
        db.table("login_attempts").delete().eq("rate_key", key).execute()
    except Exception as e:
        logger.error("Error limpiando intentos de login: %s", e)


def cleanup_old_attempts():
    """
    Limpia intentos viejos (más de 1 hora).
    Llamar periódicamente o desde un cron job.
    """
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    try:
        db.table("login_attempts").delete().lt("attempted_at", cutoff).execute()
    except Exception as e:
        logger.error("Error en cleanup de login_attempts: %s", e)
