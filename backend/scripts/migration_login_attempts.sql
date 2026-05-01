-- ============================================================
-- SIDM — Migración: tabla login_attempts para rate limiting
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ── TABLA DE INTENTOS DE LOGIN ───────────────────────────────
-- Almacena cada intento de login para rate limiting persistente.
-- Reemplaza el rate limiter en memoria que no funciona en Railway.

CREATE TABLE IF NOT EXISTS login_attempts (
    id              SERIAL PRIMARY KEY,
    rate_key        VARCHAR(200) NOT NULL,
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda rápida por key + ventana de tiempo
CREATE INDEX IF NOT EXISTS idx_login_attempts_key_time
    ON login_attempts(rate_key, attempted_at);

-- RLS: el backend usa service_key, pero protegemos por si acaso
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- No permitir lectura/escritura desde anon_key
-- (solo el backend con service_key puede acceder)
CREATE POLICY login_attempts_deny_all ON login_attempts
    FOR ALL
    USING (false);

-- ── LIMPIEZA AUTOMÁTICA (opcional) ───────────────────────────
-- Ejecutar manualmente o con pg_cron si está habilitado:
-- DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour';
