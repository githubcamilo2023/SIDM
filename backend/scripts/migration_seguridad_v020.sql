-- ============================================================
-- SIDM — Migración de seguridad v0.2.0
-- Ejecutar en el SQL Editor de Supabase DESPUÉS del schema base
-- ============================================================


-- ── 1. AGREGAR LABORATORIO A MÉDICOS ─────────────────────────────
-- Permite aislar datos entre laboratorios clientes
ALTER TABLE medicos
    ADD COLUMN IF NOT EXISTS laboratorio VARCHAR(100);

-- Asignar Inbiotech a los médicos existentes del piloto
UPDATE medicos SET laboratorio = 'Inbiotech' WHERE laboratorio IS NULL;

-- Índice para filtrado rápido por laboratorio
CREATE INDEX IF NOT EXISTS idx_medicos_laboratorio ON medicos(laboratorio);


-- ── 2. CONSTRAINT DE ROL EN VISITADORES ──────────────────────────
-- Evita roles inventados en la base de datos
ALTER TABLE visitadores
    ADD CONSTRAINT chk_visitadores_rol
    CHECK (rol IN ('visitador', 'supervisor', 'admin'))
    NOT VALID;  -- NOT VALID para no bloquear en datos existentes

-- Asignar rol por defecto a visitadores que no tengan
ALTER TABLE visitadores
    ALTER COLUMN rol SET DEFAULT 'visitador';

UPDATE visitadores SET rol = 'visitador' WHERE rol IS NULL;


-- ── 3. ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- IMPORTANTE: El backend usa service_key que bypasea RLS.
-- Estas políticas protegen si alguien accede con la anon_key
-- directamente (ej: desde el frontend o un cliente externo).

-- 3a. VISITADORES — solo lectura de su propio perfil
ALTER TABLE visitadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY visitadores_self_read ON visitadores
    FOR SELECT
    USING (id = current_setting('request.jwt.claim.sub', true)::int);

-- 3b. MEDICOS — lectura por laboratorio
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY medicos_read_by_lab ON medicos
    FOR SELECT
    USING (
        laboratorio = (
            SELECT laboratorio FROM visitadores
            WHERE id = current_setting('request.jwt.claim.sub', true)::int
        )
    );

-- 3c. VISITAS — solo sus propias visitas
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY visitas_own_read ON visitas
    FOR SELECT
    USING (visitador_id = current_setting('request.jwt.claim.sub', true)::int);

CREATE POLICY visitas_own_insert ON visitas
    FOR INSERT
    WITH CHECK (visitador_id = current_setting('request.jwt.claim.sub', true)::int);

-- 3d. PATRONES — lectura libre (datos agregados, no sensibles)
ALTER TABLE patrones ENABLE ROW LEVEL SECURITY;

CREATE POLICY patrones_read_all ON patrones
    FOR SELECT
    USING (true);

-- 3e. ALERTAS — solo sus propias alertas
ALTER TABLE alertas_enviadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY alertas_own_read ON alertas_enviadas
    FOR SELECT
    USING (visitador_id = current_setting('request.jwt.claim.sub', true)::int);


-- ── 4. VERIFICAR ─────────────────────────────────────────────────
-- Ejecutar para confirmar que RLS está activo:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN
--   ('visitadores','medicos','visitas','patrones','alertas_enviadas');
