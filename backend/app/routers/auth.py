import logging
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from app.schemas.schemas import (
    LoginRequest, TokenResponse, RefreshRequest, LogoutRequest, ChangePasswordRequest,
)
from app.core.auth import (
    create_access_token, create_refresh_token, decode_token,
    get_current_user, blacklist_token,
)
from app.core.database import get_supabase
from app.core.rate_limit import check_rate_limit, record_attempt, reset_attempts

logger = logging.getLogger("sidm.router.auth")
router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    # ── Rate limiting por email ─────────────────────────────────
    # No usar IP: Railway proxy asigna IP diferente por request
    rate_key = f"login:{body.email}"

    if not check_rate_limit(rate_key):
        logger.warning("Login bloqueado por rate limit: email=%s", body.email)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera unos minutos.",
        )

    record_attempt(rate_key)

    db = get_supabase()
    try:
        result = (
            db.table("visitadores")
            .select("id, nombre, email, password_hash, laboratorio, rol, activo, token_version")
            .eq("email", body.email)
            .eq("activo", True)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    visitador = result.data[0]

    if not pwd_context.verify(body.password, visitador["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    # Login exitoso — limpiar rate limit
    reset_attempts(rate_key)

    token_data = {"sub": str(visitador["id"]), "ver": visitador.get("token_version", 0)}
    access_token  = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    visitador.pop("password_hash", None)
    visitador.pop("token_version", None)

    logger.info("Login exitoso: visitador_id=%s email=%s", visitador["id"], body.email)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        visitador=visitador,
    )


@router.post("/refresh", response_model=dict)
async def refresh(body: RefreshRequest):
    """Renueva el access token usando un refresh token válido."""
    payload = decode_token(body.refresh_token, expected_type="refresh")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    db = get_supabase()
    result = (
        db.table("visitadores")
        .select("id, activo, token_version")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data or not result.data.get("activo", False):
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    token_version = result.data.get("token_version", 0)
    if payload.get("ver") != token_version:
        raise HTTPException(status_code=401, detail="Refresh token revocado")

    new_access = create_access_token({"sub": user_id, "ver": token_version})
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    body: LogoutRequest | None = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Revoca el access token actual y el refresh token si el cliente lo envía.
    """
    raw_token = current_user.get("_raw_token")
    if raw_token:
        blacklist_token(raw_token)
    if body and body.refresh_token:
        blacklist_token(body.refresh_token)

    logger.info("Logout: visitador_id=%s", current_user["id"])
    return {"ok": True, "mensaje": "Sesión cerrada"}


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Cambia la contraseña del visitador autenticado.
    Requiere la contraseña actual como verificación.
    """
    db = get_supabase()

    # Obtener hash actual
    result = (
        db.table("visitadores")
        .select("password_hash, token_version")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Visitador no encontrado")

    # Verificar contraseña actual
    if not pwd_context.verify(body.current_password, result.data["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña actual incorrecta",
        )

    # No permitir reusar la misma contraseña
    if pwd_context.verify(body.new_password, result.data["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La nueva contraseña no puede ser igual a la actual",
        )

    # Actualizar
    new_hash = pwd_context.hash(body.new_password)
    db.table("visitadores").update({
        "password_hash": new_hash,
        "token_version": result.data.get("token_version", 0) + 1,
    }).eq("id", current_user["id"]).execute()

    # Revocar token actual — forzar re-login con nueva contraseña
    raw_token = current_user.get("_raw_token")
    if raw_token:
        blacklist_token(raw_token)

    logger.info("Contraseña cambiada: visitador_id=%s", current_user["id"])

    return {
        "ok": True,
        "mensaje": "Contraseña actualizada. Inicia sesión nuevamente.",
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    # No exponer el token raw al cliente
    user = {
        k: v
        for k, v in current_user.items()
        if not k.startswith("_") and k != "token_version"
    }
    return user
