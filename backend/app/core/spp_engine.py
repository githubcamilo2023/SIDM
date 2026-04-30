"""
Motor de cálculo del Score de Probabilidad de Presencia (SPP).

Algoritmo: suavizado bayesiano sobre patrones históricos de campo.
No usa ML — usa estadística simple y transparente.
Explicable al gerente de distrito en 2 minutos.
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from app.core.config import get_settings
from app.core.database import get_supabase

logger = logging.getLogger("sidm.spp")


# ── PARÁMETROS DEL PRIOR BAYESIANO ───────────────────────────────
ALPHA = 3
BETA  = 2

# Umbrales de confianza por número de muestras
CONFIANZA_ALTA  = 20
CONFIANZA_MEDIA = 10

# Pesos de la matriz SPP (deben sumar 1.0)
PESOS = {
    "campo":   0.45,
    "agenda":  0.30,   # reservado para fase 2
    "trafico": 0.15,   # reservado para fase 2
    "clima":   0.10,   # reservado para fase 2
}

# Mapeo resultado → score numérico
RESULTADO_SCORE = {
    "exitosa":        1.0,
    "retraso":        0.5,
    "medico_ausente": 0.0,
    "agenda_cerrada": 0.0,
    "reagendada":     0.0,
}


def _now_bogota() -> datetime:
    """Hora actual en Colombia, independiente de la zona del servidor."""
    tz = ZoneInfo(get_settings().timezone)
    return datetime.now(tz)


def _confianza(n: int) -> str:
    if n >= CONFIANZA_ALTA:  return "alta"
    if n >= CONFIANZA_MEDIA: return "media"
    return "baja"


def _mensaje(spp: float, confianza: str) -> str:
    if confianza == "baja":
        return "Pocos datos aún. Tu reporte de hoy mejora la predicción."
    if spp >= 0.75: return "Alta probabilidad. Priorizar en ruta."
    if spp >= 0.50: return "Probabilidad media. Confirma antes si puedes."
    if spp >= 0.35: return "Probabilidad baja en esta franja. Considera otro horario."
    return "Historial negativo en este horario. Reagendar recomendado."


def calcular_spp(medico_id: int, dia_semana: int = None, franja_hora: int = None) -> dict:
    """
    Calcula el SPP para un médico en una franja horaria específica.
    Si no se proveen dia/hora, usa el momento actual en zona horaria de Colombia.
    """
    db = get_supabase()
    now = _now_bogota()
    dia  = dia_semana  if dia_semana  is not None else now.isoweekday()
    hora = franja_hora if franja_hora is not None else now.hour

    # ── Buscar patrón histórico ────────────────────────────────────
    result = (
        db.table("patrones")
        .select("total_visitas, visitas_exitosas")
        .eq("medico_id", medico_id)
        .eq("dia_semana", dia)
        .eq("franja_hora", hora)
        .execute()
    )

    patron = result.data[0] if result.data else None
    n = patron["total_visitas"]    if patron else 0
    k = patron["visitas_exitosas"] if patron else 0

    # ── Score de campo con suavizado bayesiano ────────────────────
    score_campo = (k + ALPHA) / (n + ALPHA + BETA)

    # ── Scores de entorno (prior neutral hasta fase 2) ────────────
    score_agenda  = 0.65
    score_trafico = 0.75
    score_clima   = 0.85

    # ── SPP final ponderado ───────────────────────────────────────
    spp = (
        PESOS["campo"]   * score_campo   +
        PESOS["agenda"]  * score_agenda  +
        PESOS["trafico"] * score_trafico +
        PESOS["clima"]   * score_clima
    )

    confianza = _confianza(n)

    logger.debug(
        "SPP medico=%d dia=%d hora=%d → spp=%.4f confianza=%s (n=%d k=%d)",
        medico_id, dia, hora, spp, confianza, n, k,
    )

    return {
        "medico_id":    medico_id,
        "spp":          round(spp, 4),
        "confianza":    confianza,
        "base_datos":   n,
        "mensaje":      _mensaje(spp, confianza),
        "score_detalle": {
            "campo":   round(score_campo, 4),
            "agenda":  score_agenda,
            "trafico": score_trafico,
            "clima":   score_clima,
            "n":       n,
            "k":       k,
        }
    }


def calcular_spp_batch(medico_ids: list[int], dia_semana: int = None, franja_hora: int = None) -> dict[int, dict]:
    """
    Calcula SPP para múltiples médicos en una sola query a patrones.
    Resuelve el problema N+1 de listar_medicos.
    """
    db = get_supabase()
    now = _now_bogota()
    dia  = dia_semana  if dia_semana  is not None else now.isoweekday()
    hora = franja_hora if franja_hora is not None else now.hour

    # Una sola query para todos los patrones
    result = (
        db.table("patrones")
        .select("medico_id, total_visitas, visitas_exitosas")
        .in_("medico_id", medico_ids)
        .eq("dia_semana", dia)
        .eq("franja_hora", hora)
        .execute()
    )

    patrones_map = {p["medico_id"]: p for p in (result.data or [])}

    # Scores de entorno (neutrales fase 1)
    score_agenda  = 0.65
    score_trafico = 0.75
    score_clima   = 0.85

    resultados = {}
    for mid in medico_ids:
        patron = patrones_map.get(mid)
        n = patron["total_visitas"]    if patron else 0
        k = patron["visitas_exitosas"] if patron else 0

        score_campo = (k + ALPHA) / (n + ALPHA + BETA)
        spp = (
            PESOS["campo"]   * score_campo   +
            PESOS["agenda"]  * score_agenda  +
            PESOS["trafico"] * score_trafico +
            PESOS["clima"]   * score_clima
        )
        confianza = _confianza(n)

        resultados[mid] = {
            "medico_id":    mid,
            "spp":          round(spp, 4),
            "confianza":    confianza,
            "base_datos":   n,
            "mensaje":      _mensaje(spp, confianza),
            "score_detalle": {
                "campo":   round(score_campo, 4),
                "agenda":  score_agenda,
                "trafico": score_trafico,
                "clima":   score_clima,
                "n":       n,
                "k":       k,
            }
        }

    return resultados


def actualizar_patron(medico_id: int, dia_semana: int, franja_hora: int, resultado: str):
    """
    Actualiza el patrón histórico después de cada visita reportada.
    Upsert: crea si no existe, actualiza si ya existe.
    """
    db = get_supabase()
    exitosa = int(RESULTADO_SCORE.get(resultado, 0) >= 0.5)

    existing = (
        db.table("patrones")
        .select("id, total_visitas, visitas_exitosas")
        .eq("medico_id", medico_id)
        .eq("dia_semana", dia_semana)
        .eq("franja_hora", franja_hora)
        .execute()
    )

    if existing.data:
        patron = existing.data[0]
        nuevo_total     = patron["total_visitas"]    + 1
        nuevas_exitosas = patron["visitas_exitosas"] + exitosa
        nuevo_spp = round(
            (nuevas_exitosas + ALPHA) / (nuevo_total + ALPHA + BETA), 4
        )
        db.table("patrones").update({
            "total_visitas":    nuevo_total,
            "visitas_exitosas": nuevas_exitosas,
            "spp":              nuevo_spp,
        }).eq("id", patron["id"]).execute()
        logger.info("Patrón actualizado: medico=%d dia=%d hora=%d n=%d",
                     medico_id, dia_semana, franja_hora, nuevo_total)
    else:
        nuevo_spp = round((exitosa + ALPHA) / (1 + ALPHA + BETA), 4)
        db.table("patrones").insert({
            "medico_id":        medico_id,
            "dia_semana":       dia_semana,
            "franja_hora":      franja_hora,
            "total_visitas":    1,
            "visitas_exitosas": exitosa,
            "spp":              nuevo_spp,
        }).execute()
        logger.info("Patrón creado: medico=%d dia=%d hora=%d",
                     medico_id, dia_semana, franja_hora)
