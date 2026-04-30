import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.core.auth import get_current_user
from app.core.database import get_supabase
from app.core.spp_engine import calcular_spp, calcular_spp_batch
from app.schemas.schemas import MedicoOut, SPPOut

logger = logging.getLogger("sidm.router.medicos")
router = APIRouter(prefix="/medicos", tags=["medicos"])


def _filtrar_por_laboratorio(medicos: list[dict], user: dict) -> list[dict]:
    """
    Aislamiento por laboratorio: cada visitador solo ve médicos
    de su propio laboratorio. Supervisores ven todos.
    """
    rol = user.get("rol", "visitador")
    if rol in ("supervisor", "admin"):
        return medicos

    lab = user.get("laboratorio")
    if not lab:
        logger.warning("Visitador %s sin laboratorio asignado", user["id"])
        return []

    return [m for m in medicos if m.get("laboratorio") == lab]


@router.get("", response_model=list[MedicoOut])
async def listar_medicos(
    q: Optional[str] = Query(None, description="Filtrar por nombre, especialidad o zona"),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista médicos activos con SPP calculado para la franja actual.
    Filtrado por laboratorio del visitador autenticado.
    """
    db = get_supabase()
    query = db.table("medicos").select("*").eq("activo", True)

    # ── Filtro por laboratorio a nivel de query (si existe la columna) ─
    user_lab = current_user.get("laboratorio")
    user_rol = current_user.get("rol", "visitador")
    if user_lab and user_rol not in ("supervisor", "admin"):
        query = query.eq("laboratorio", user_lab)

    result = query.execute()
    medicos = result.data or []

    # ── Fallback: filtro en memoria si la columna no existe aún ───
    medicos = _filtrar_por_laboratorio(medicos, current_user)

    # Filtro de búsqueda libre
    if q:
        q_lower = q.lower()
        medicos = [
            m for m in medicos
            if q_lower in (
                m.get("nombre", "") + " " +
                m.get("especialidad", "") + " " +
                m.get("zona", "")
            ).lower()
        ]

    if not medicos:
        return []

    # ── Batch SPP: una sola query en vez de N ─────────────────────
    medico_ids = [m["id"] for m in medicos]
    spp_batch = calcular_spp_batch(medico_ids)

    # ── Batch conteo de visitas: una sola query ───────────────────
    visitas_result = (
        db.table("visitas")
        .select("medico_id")
        .in_("medico_id", medico_ids)
        .execute()
    )
    visitas_count: dict[int, int] = {}
    for v in (visitas_result.data or []):
        mid = v["medico_id"]
        visitas_count[mid] = visitas_count.get(mid, 0) + 1

    # ── Ensamblar respuesta ───────────────────────────────────────
    output = []
    for m in medicos:
        spp_data = spp_batch.get(m["id"], {
            "spp": 0.65, "confianza": "baja"
        })
        output.append(MedicoOut(
            id=m["id"],
            nombre=m["nombre"],
            especialidad=m.get("especialidad"),
            zona=m.get("zona"),
            consultorios=m.get("consultorios", []),
            spp=spp_data["spp"],
            confianza=spp_data["confianza"],
            total_visitas=visitas_count.get(m["id"], 0),
        ))

    output.sort(key=lambda x: (x.confianza == "alta", x.spp), reverse=True)

    logger.info("Listado médicos: %d resultados (user=%s lab=%s)",
                len(output), current_user["id"], user_lab)
    return output


@router.get("/{medico_id}/spp", response_model=SPPOut)
async def spp_medico(
    medico_id: int,
    dia: Optional[int] = Query(None, ge=1, le=7),
    hora: Optional[int] = Query(None, ge=0, le=23),
    current_user: dict = Depends(get_current_user),
):
    """
    SPP de un médico para una franja específica.
    Verifica que el médico pertenezca al laboratorio del visitador.
    """
    db = get_supabase()
    medico = db.table("medicos").select("id, laboratorio").eq("id", medico_id).execute()
    if not medico.data:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    # Verificar acceso por laboratorio
    user_rol = current_user.get("rol", "visitador")
    if user_rol not in ("supervisor", "admin"):
        medico_lab = medico.data[0].get("laboratorio")
        user_lab = current_user.get("laboratorio")
        if medico_lab and user_lab and medico_lab != user_lab:
            raise HTTPException(status_code=403, detail="No tienes acceso a este médico")

    return calcular_spp(medico_id, dia_semana=dia, franja_hora=hora)
