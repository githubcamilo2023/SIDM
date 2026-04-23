from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, date
from app.core.auth import get_current_user
from app.core.database import get_supabase
from app.core.spp_engine import actualizar_patron
from app.schemas.schemas import VisitaCreate, VisitaOut, HistorialStats

router = APIRouter(prefix="/visitas", tags=["visitas"])


@router.post("", response_model=dict, status_code=201)
async def registrar_visita(
    body: VisitaCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Registra el resultado de una visita médica.
    Después de guardar, actualiza automáticamente el patrón SPP del médico.
    """
    db = get_supabase()
    now = datetime.now()

    # Validar nivel de interés solo si el médico atendió
    visitas_con_medico = {"exitosa", "retraso"}
    if body.resultado in visitas_con_medico and body.nivel_interes is None:
        raise HTTPException(
            status_code=422,
            detail="El nivel de interés es obligatorio cuando el médico atendió",
        )

    # Guardar la visita
    visita_data = {
        "visitador_id":          current_user["id"],
        "medico_id":             body.medico_id,
        "consultorio":           body.consultorio,
        "fecha":                 now.date().isoformat(),
        "hora_llegada":          body.hora_llegada,
        "dia_semana":            now.isoweekday(),
        "franja_hora":           now.hour,
        "canal_contacto":        body.canal_contacto,
        "resultado":             body.resultado,
        "tiempo_espera":         body.tiempo_espera,
        "producto":              body.producto,
        "novedad_categoria":     body.novedad_categoria,
        "nota":                  body.nota,
        "prox_visita":           body.prox_visita,
        "nivel_interes":         body.nivel_interes,
        "pacientes_en_sala":     body.pacientes_en_sala,
        "hora_inicio_atencion":  body.hora_inicio_atencion,
    }

    result = db.table("visitas").insert(visita_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Error al guardar la visita")

    # Actualizar patrón SPP del médico automáticamente
    actualizar_patron(
        medico_id=body.medico_id,
        dia_semana=now.isoweekday(),
        franja_hora=now.hour,
        resultado=body.resultado,
    )

    return {
        "ok": True,
        "visita_id": result.data[0]["id"],
        "mensaje": "Visita registrada. El modelo SPP fue actualizado.",
    }


@router.get("/historial", response_model=list[VisitaOut])
async def historial_visitador(
    limite: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve el historial completo de visitas del visitador autenticado,
    enriquecido con el nombre del médico.
    """
    db = get_supabase()

    result = (
        db.table("visitas")
        .select("*, medicos(nombre)")
        .eq("visitador_id", current_user["id"])
        .order("creado_en", desc=True)
        .limit(limite)
        .execute()
    )

    visitas = []
    for v in (result.data or []):
        medico_nombre = v.get("medicos", {}).get("nombre") if v.get("medicos") else None
        visitas.append(VisitaOut(
            id=v["id"],
            medico_id=v["medico_id"],
            medico_nombre=medico_nombre,
            consultorio=v["consultorio"],
            fecha=v["fecha"],
            hora_llegada=v["hora_llegada"],
            resultado=v["resultado"],
            tiempo_espera=v.get("tiempo_espera"),
            producto=v.get("producto"),
            novedad_categoria=v.get("novedad_categoria"),
            nota=v.get("nota"),
            nivel_interes=v.get("nivel_interes"),
            creado_en=v["creado_en"],
        ))

    return visitas


@router.get("/stats", response_model=HistorialStats)
async def stats_visitador(
    current_user: dict = Depends(get_current_user),
):
    """
    Estadísticas del visitador: tasa de éxito, nivel de interés promedio,
    tiempo de espera promedio. Estos números van al dashboard del supervisor.
    """
    db = get_supabase()

    result = (
        db.table("visitas")
        .select("resultado, nivel_interes, tiempo_espera")
        .eq("visitador_id", current_user["id"])
        .execute()
    )

    visitas = result.data or []
    total = len(visitas)

    if total == 0:
        return HistorialStats(
            total_visitas=0,
            visitas_exitosas=0,
            tasa_exito=0.0,
            nivel_interes_promedio=None,
            tiempo_espera_promedio=None,
        )

    exitosas = sum(1 for v in visitas if v["resultado"] == "exitosa")

    niveles = [v["nivel_interes"] for v in visitas if v.get("nivel_interes")]
    esperas = [v["tiempo_espera"] for v in visitas if v.get("tiempo_espera")]

    return HistorialStats(
        total_visitas=total,
        visitas_exitosas=exitosas,
        tasa_exito=round(exitosas / total, 4),
        nivel_interes_promedio=round(sum(niveles) / len(niveles), 2) if niveles else None,
        tiempo_espera_promedio=round(sum(esperas) / len(esperas), 1) if esperas else None,
    )
