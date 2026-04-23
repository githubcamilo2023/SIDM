-- ============================================================
-- SIDM — Schema SQL para Supabase
-- Ejecutar en el SQL Editor de Supabase en este orden exacto
-- ============================================================

-- ── 1. VISITADORES ───────────────────────────────────────────
CREATE TABLE visitadores (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    laboratorio     VARCHAR(100),
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMP DEFAULT NOW()
);

-- ── 2. MÉDICOS ───────────────────────────────────────────────
CREATE TABLE medicos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    especialidad    VARCHAR(100),
    zona            VARCHAR(80),
    consultorios    TEXT[],          -- array de strings: ["Clínica El Rosario", "Sura Laureles"]
    lat             DECIMAL(10,8),
    lng             DECIMAL(11,8),
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMP DEFAULT NOW()
);

-- ── 3. VISITAS ───────────────────────────────────────────────
CREATE TABLE visitas (
    id                      SERIAL PRIMARY KEY,
    visitador_id            INTEGER REFERENCES visitadores(id) ON DELETE CASCADE,
    medico_id               INTEGER REFERENCES medicos(id) ON DELETE CASCADE,
    consultorio             VARCHAR(150) NOT NULL,
    fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_llegada            TIME,
    hora_inicio_atencion    TIME,            -- hora real en que el médico lo atendió
    dia_semana              SMALLINT,        -- 1=Lun, 7=Dom (calculado al insertar)
    franja_hora             SMALLINT,        -- hora entera: 8, 9, 10...
    canal_contacto          VARCHAR(20),     -- sin_aviso | whatsapp | llamada
    resultado               VARCHAR(30) NOT NULL CHECK (
                                resultado IN (
                                    'exitosa','retraso','medico_ausente',
                                    'agenda_cerrada','reagendada'
                                )
                            ),
    tiempo_espera           SMALLINT,        -- minutos esperados
    pacientes_en_sala       VARCHAR(10),     -- vacio | 1-3 | 4-6 | lleno
    producto                VARCHAR(150),
    novedad_categoria       VARCHAR(50),
    nota                    TEXT,
    prox_visita             VARCHAR(50),
    nivel_interes           SMALLINT CHECK (nivel_interes BETWEEN 1 AND 5),
    creado_en               TIMESTAMP DEFAULT NOW()
);

-- ── 4. PATRONES ──────────────────────────────────────────────
-- Tabla derivada — se actualiza automáticamente con cada visita
-- Es la base del algoritmo SPP
CREATE TABLE patrones (
    id                  SERIAL PRIMARY KEY,
    medico_id           INTEGER REFERENCES medicos(id) ON DELETE CASCADE,
    dia_semana          SMALLINT NOT NULL,   -- 1=Lun, 7=Dom
    franja_hora         SMALLINT NOT NULL,   -- 0-23
    total_visitas       SMALLINT DEFAULT 0,
    visitas_exitosas    SMALLINT DEFAULT 0,
    spp                 DECIMAL(5,4),        -- score calculado con suavizado bayesiano
    actualizado_en      TIMESTAMP DEFAULT NOW(),
    UNIQUE (medico_id, dia_semana, franja_hora)  -- una sola fila por celda
);

-- ── 5. ALERTAS ───────────────────────────────────────────────
CREATE TABLE alertas_enviadas (
    id              SERIAL PRIMARY KEY,
    visitador_id    INTEGER REFERENCES visitadores(id),
    medico_id       INTEGER REFERENCES medicos(id),
    mensaje         TEXT,
    canal           VARCHAR(20) DEFAULT 'whatsapp',
    enviado_en      TIMESTAMP DEFAULT NOW()
);

-- ── ÍNDICES CRÍTICOS ─────────────────────────────────────────
CREATE INDEX idx_visitas_visitador     ON visitas(visitador_id, creado_en DESC);
CREATE INDEX idx_visitas_medico        ON visitas(medico_id, fecha DESC);
CREATE INDEX idx_patrones_medico       ON patrones(medico_id, dia_semana, franja_hora);
CREATE INDEX idx_medicos_activos       ON medicos(activo);

-- ── DATOS INICIALES (piloto Inbiotech) ───────────────────────
-- Ejecutar después de crear las tablas
-- Reemplazar el password_hash con el hash real generado por bcrypt

INSERT INTO visitadores (nombre, email, password_hash, laboratorio) VALUES
('Visitador 1 Inbiotech', 'visitador1@inbiotech.com', '$2b$12$REEMPLAZAR_CON_HASH_REAL', 'Inbiotech'),
('Visitador 2 Inbiotech', 'visitador2@inbiotech.com', '$2b$12$REEMPLAZAR_CON_HASH_REAL', 'Inbiotech');

-- Para generar el hash desde Python:
-- from passlib.context import CryptContext
-- pwd = CryptContext(schemes=["bcrypt"])
-- print(pwd.hash("contraseña_aqui"))
