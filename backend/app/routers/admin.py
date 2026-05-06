import logging
from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.core.auth import require_role
from app.core.database import get_supabase
from app.schemas.schemas import VisitaOut, HistorialStats

logger = logging.getLogger("sidm.router.admin")
router = APIRouter(prefix="/admin", tags=["admin"])


# ── LISTAR VISITADORES ────────────────────────────────────────────
@router.get("/visitadores")
async def listar_visitadores(
    current_user: dict = Depends(require_role("admin", "supervisor")),
):
    """
    Lista todos los visitadores del mismo laboratorio.
    Solo accesible por admin/supervisor.
    """
    db = get_supabase()
    query = (
        db.table("visitadores")
        .select("id, nombre, email, laboratorio, rol, activo, created_en")
        .eq("activo", True)
    )

    # Filtrar por laboratorio (admin solo ve su lab)
    user_lab = current_user.get("laboratorio")
    if user_lab:
        query = query.eq("laboratorio", user_lab)

    result = query.order("nombre").execute()
    return result.data or []


# ── HISTORIAL GLOBAL DE VISITAS ───────────────────────────────────
@router.get("/visitas", response_model=list[VisitaOut])
async def historial_global(
    limite: int = Query(100, ge=1, le=500),
    visitador_id: Optional[int] = Query(None, description="Filtrar por visitador"),
    current_user: dict = Depends(require_role("admin", "supervisor")),
):
    """
    Historial de visitas de TODOS los visitadores del laboratorio.
    Opcionalmente filtrable por visitador_id.
    """
    db = get_supabase()

    query = (
        db.table("visitas")
        .select("*, medicos(nombre), visitadores(nombre)")
    )

    # Filtrar por visitador específico si se provee
    if visitador_id:
        query = query.eq("visitador_id", visitador_id)
    else:
        # Filtrar por laboratorio: obtener IDs de visitadores del lab
        user_lab = current_user.get("laboratorio")
        if user_lab:
            vis_result = (
                db.table("visitadores")
                .select("id")
                .eq("laboratorio", user_lab)
                .eq("activo", True)
                .execute()
            )
            vis_ids = [v["id"] for v in (vis_result.data or [])]
            if vis_ids:
                query = query.in_("visitador_id", vis_ids)
            else:
                return []

    result = query.order("creado_en", desc=True).limit(limite).execute()

    visitas = []
    for v in (result.data or []):
        medico_nombre = v.get("medicos", {}).get("nombre") if v.get("medicos") else None
        visitador_nombre = v.get("visitadores", {}).get("nombre") if v.get("visitadores") else None
        visitas.append(VisitaOut(
            id=v["id"],
            medico_id=v["medico_id"],
            medico_nombre=medico_nombre,
            visitador_nombre=visitador_nombre,
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

    logger.info("Admin historial: %d visitas (user=%s filtro_visitador=%s)",
                len(visitas), current_user["id"], visitador_id)
    return visitas


# ── STATS GLOBALES ────────────────────────────────────────────────
@router.get("/stats", response_model=HistorialStats)
async def stats_global(
    visitador_id: Optional[int] = Query(None, description="Stats de un visitador específico"),
    current_user: dict = Depends(require_role("admin", "supervisor")),
):
    """
    Estadísticas globales del laboratorio o de un visitador específico.
    """
    db = get_supabase()

    if visitador_id:
        # Stats de un visitador específico
        result = (
            db.table("visitas")
            .select("resultado, nivel_interes, tiempo_espera")
            .eq("visitador_id", visitador_id)
            .execute()
        )
    else:
        # Stats globales del laboratorio
        user_lab = current_user.get("laboratorio")
        if user_lab:
            vis_result = (
                db.table("visitadores")
                .select("id")
                .eq("laboratorio", user_lab)
                .eq("activo", True)
                .execute()
            )
            vis_ids = [v["id"] for v in (vis_result.data or [])]
            if not vis_ids:
                return HistorialStats(
                    total_visitas=0, visitas_exitosas=0, tasa_exito=0.0,
                )
            result = (
                db.table("visitas")
                .select("resultado, nivel_interes, tiempo_espera")
                .in_("visitador_id", vis_ids)
                .execute()
            )
        else:
            result = (
                db.table("visitas")
                .select("resultado, nivel_interes, tiempo_espera")
                .execute()
            )

    visitas = result.data or []
    total = len(visitas)

    if total == 0:
        return HistorialStats(
            total_visitas=0, visitas_exitosas=0, tasa_exito=0.0,
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


# ── STATS POR VISITADOR (comparativo) ────────────────────────────
@router.get("/stats/por-visitador")
async def stats_por_visitador(
    current_user: dict = Depends(require_role("admin", "supervisor")),
):
    """
    Estadísticas desglosadas por cada visitador.
    Útil para el dashboard comparativo del admin.
    """
    db = get_supabase()
    user_lab = current_user.get("laboratorio")

    # Obtener visitadores del lab
    vis_query = db.table("visitadores").select("id, nombre").eq("activo", True)
    if user_lab:
        vis_query = vis_query.eq("laboratorio", user_lab)
    vis_result = vis_query.execute()
    visitadores = vis_result.data or []

    if not visitadores:
        return []

    vis_ids = [v["id"] for v in visitadores]
    vis_nombres = {v["id"]: v["nombre"] for v in visitadores}

    # Todas las visitas del lab
    result = (
        db.table("visitas")
        .select("visitador_id, resultado, nivel_interes, tiempo_espera")
        .in_("visitador_id", vis_ids)
        .execute()
    )

    # Agrupar por visitador
    por_visitador = {vid: [] for vid in vis_ids}
    for v in (result.data or []):
        vid = v["visitador_id"]
        if vid in por_visitador:
            por_visitador[vid].append(v)

    stats_list = []
    for vid, visitas in por_visitador.items():
        total = len(visitas)
        exitosas = sum(1 for v in visitas if v["resultado"] == "exitosa")
        niveles = [v["nivel_interes"] for v in visitas if v.get("nivel_interes")]
        esperas = [v["tiempo_espera"] for v in visitas if v.get("tiempo_espera")]

        stats_list.append({
            "visitador_id": vid,
            "visitador_nombre": vis_nombres.get(vid, ""),
            "total_visitas": total,
            "visitas_exitosas": exitosas,
            "tasa_exito": round(exitosas / total, 4) if total > 0 else 0.0,
            "nivel_interes_promedio": round(sum(niveles) / len(niveles), 2) if niveles else None,
            "tiempo_espera_promedio": round(sum(esperas) / len(esperas), 1) if esperas else None,
        })

    stats_list.sort(key=lambda x: x["total_visitas"], reverse=True)
    return stats_list
