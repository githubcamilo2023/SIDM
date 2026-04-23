from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.core.auth import get_current_user
from app.core.database import get_supabase
from app.core.spp_engine import calcular_spp
from app.schemas.schemas import MedicoOut, SPPOut

router = APIRouter(prefix="/medicos", tags=["medicos"])


@router.get("", response_model=list[MedicoOut])
async def listar_medicos(
    q: Optional[str] = Query(None, description="Filtrar por nombre, especialidad o zona"),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista todos los médicos activos con su SPP calculado
    para la franja horaria actual.
    """
    db = get_supabase()
    query = db.table("medicos").select("*").eq("activo", True)
    result = query.execute()

    medicos = result.data or []

    # Filtro de búsqueda
    if q:
        q_lower = q.lower()
        medicos = [
            m for m in medicos
            if q_lower in (m.get("nombre", "") + m.get("especialidad", "") + m.get("zona", "")).lower()
        ]

    # Enriquecer con SPP actual
    output = []
    for m in medicos:
        spp_data = calcular_spp(m["id"])
        # Contar visitas totales del visitador actual a este médico
        visitas_result = (
            db.table("visitas")
            .select("id", count="exact")
            .eq("medico_id", m["id"])
            .execute()
        )
        output.append(MedicoOut(
            id=m["id"],
            nombre=m["nombre"],
            especialidad=m.get("especialidad"),
            zona=m.get("zona"),
            consultorios=m.get("consultorios", []),
            spp=spp_data["spp"],
            confianza=spp_data["confianza"],
            total_visitas=visitas_result.count or 0,
        ))

    # Ordenar: mayor SPP con alta confianza primero
    output.sort(key=lambda x: (x.confianza == "alta", x.spp), reverse=True)
    return output


@router.get("/{medico_id}/spp", response_model=SPPOut)
async def spp_medico(
    medico_id: int,
    dia: Optional[int] = Query(None, ge=1, le=7),
    hora: Optional[int] = Query(None, ge=0, le=23),
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve el SPP de un médico para una franja horaria específica.
    Si no se proveen dia/hora, usa el momento actual.
    """
    db = get_supabase()
    medico = db.table("medicos").select("id").eq("id", medico_id).execute()
    if not medico.data:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    return calcular_spp(medico_id, dia_semana=dia, franja_hora=hora)
