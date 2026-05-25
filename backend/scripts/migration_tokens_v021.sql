-- SIDM schema migration 021 - Revocacion persistente de tokens y version de sesion

ALTER TABLE visitadores
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS token_revocations (
    jti         VARCHAR(128) PRIMARY KEY,
    user_id     INTEGER REFERENCES visitadores(id) ON DELETE CASCADE,
    token_type  VARCHAR(20),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_revocations_expires
    ON token_revocations(expires_at);

CREATE INDEX IF NOT EXISTS idx_token_revocations_user
    ON token_revocations(user_id);

ALTER TABLE token_revocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS token_revocations_no_client_access ON token_revocations;
CREATE POLICY token_revocations_no_client_access ON token_revocations
    FOR ALL USING (false) WITH CHECK (false);

-- Limpieza sugerida para cron/Supabase scheduled job:
-- DELETE FROM token_revocations WHERE expires_at < NOW();
