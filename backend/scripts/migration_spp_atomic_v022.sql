-- SIDM schema migration 022 - Incremento atomico de patrones SPP

CREATE OR REPLACE FUNCTION incrementar_patron_spp(
    p_medico_id INTEGER,
    p_dia_semana INTEGER,
    p_franja_hora INTEGER,
    p_exitosa INTEGER,
    p_alpha NUMERIC DEFAULT 3,
    p_beta NUMERIC DEFAULT 2
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO patrones (
        medico_id,
        dia_semana,
        franja_hora,
        total_visitas,
        visitas_exitosas,
        spp,
        actualizado_en
    )
    VALUES (
        p_medico_id,
        p_dia_semana,
        p_franja_hora,
        1,
        p_exitosa,
        ROUND(((p_exitosa + p_alpha) / (1 + p_alpha + p_beta))::NUMERIC, 4),
        NOW()
    )
    ON CONFLICT (medico_id, dia_semana, franja_hora)
    DO UPDATE SET
        total_visitas = patrones.total_visitas + 1,
        visitas_exitosas = patrones.visitas_exitosas + EXCLUDED.visitas_exitosas,
        spp = ROUND((
            (
                patrones.visitas_exitosas
                + EXCLUDED.visitas_exitosas
                + p_alpha
            )
            / (patrones.total_visitas + 1 + p_alpha + p_beta)
        )::NUMERIC, 4),
        actualizado_en = NOW();
$$;

REVOKE ALL ON FUNCTION incrementar_patron_spp(
    INTEGER,
    INTEGER,
    INTEGER,
    INTEGER,
    NUMERIC,
    NUMERIC
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION incrementar_patron_spp(
    INTEGER,
    INTEGER,
    INTEGER,
    INTEGER,
    NUMERIC,
    NUMERIC
) TO service_role;
