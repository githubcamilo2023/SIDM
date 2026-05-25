import logging
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings
from app.core.database import get_supabase

logger = logging.getLogger("sidm.auth")
security = HTTPBearer()

# ── TOKEN BLACKLIST (en memoria — migrar a Redis en producción) ───
# Almacena JTI (JWT ID) de tokens revocados con su expiración
_blacklisted_tokens: dict[str, datetime] = {}


def _cleanup_blacklist():
    """Limpia tokens expirados del blacklist para no acumular memoria."""
    now = datetime.now(timezone.utc)
    expired = [jti for jti, exp in _blacklisted_tokens.items() if exp < now]
    for jti in expired:
        del _blacklisted_tokens[jti]


def blacklist_token(token: str):
    """Revoca un token agregándolo al blacklist local y persistente."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        jti = payload.get("jti")
        exp = datetime.fromtimestamp(payload.get("exp", 0), tz=timezone.utc)
        if jti:
            _blacklisted_tokens[jti] = exp
            _persist_blacklist(payload, exp)
            _cleanup_blacklist()
            logger.info("Token revocado: jti=%s", jti)
    except JWTError:
        pass


def _is_blacklisted(jti: str) -> bool:
    if jti in _blacklisted_tokens:
        return True

    db = get_supabase()
    try:
        result = (
            db.table("token_revocations")
            .select("jti")
            .eq("jti", jti)
            .gt("expires_at", datetime.now(timezone.utc).isoformat())
            .limit(1)
            .execute()
        )
        return bool(result.data)
    except Exception as exc:
        logger.error("Error consultando token_revocations: %s", exc)
        return False


def _persist_blacklist(payload: dict, exp: datetime) -> None:
    jti = payload.get("jti")
    if not jti:
        return

    user_id = payload.get("sub")
    if isinstance(user_id, str) and user_id.isdigit():
        user_id = int(user_id)

    db = get_supabase()
    try:
        db.table("token_revocations").upsert({
            "jti": jti,
            "user_id": user_id,
            "token_type": payload.get("type"),
            "expires_at": exp.isoformat(),
        }).execute()
    except Exception as exc:
        logger.error("Error persistiendo token revocado: %s", exc)

# ── TOKEN CREATION ────────────────────────────────────────────────
def _generate_jti() -> str:
    """Genera un ID único para el token."""
    import secrets
    return secrets.token_urlsafe(16)


def create_access_token(data: dict) -> str:
    settings = get_settings()
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload.update({"exp": expire, "type": "access", "jti": _generate_jti()})
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict) -> str:
    settings = get_settings()
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.refresh_token_expire_minutes
    )
    payload.update({"exp": expire, "type": "refresh", "jti": _generate_jti()})
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


# ── TOKEN DECODE ──────────────────────────────────────────────────
def decode_token(token: str, expected_type: str = "access") -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
    except JWTError:
        logger.warning("Token inválido o expirado recibido")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    if payload.get("type") != expected_type:
        logger.warning("Tipo de token incorrecto: esperado=%s, recibido=%s",
                       expected_type, payload.get("type"))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token incorrecto",
        )

    # Verificar blacklist
    jti = payload.get("jti")
    if jti and _is_blacklisted(jti):
        logger.warning("Token revocado usado: jti=%s", jti)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revocado",
        )

    return payload


# ── USER RETRIEVAL ────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    payload = decode_token(credentials.credentials, expected_type="access")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sin usuario")

    db = get_supabase()
    result = (
        db.table("visitadores")
        .select("id, nombre, email, laboratorio, rol, activo, token_version")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=401, detail="Visitador no encontrado")

    user = result.data
    if not user.get("activo", False):
        logger.warning("Intento de acceso con cuenta desactivada: %s", user_id)
        raise HTTPException(status_code=403, detail="Cuenta desactivada")

    if payload.get("ver") != user.get("token_version", 0):
        raise HTTPException(status_code=401, detail="Token revocado")

    # Guardar el token raw para logout
    user["_raw_token"] = credentials.credentials
    return user


# ── ROLE-BASED AUTHORIZATION ─────────────────────────────────────
def require_role(*allowed_roles: str):
    """
    Dependency factory que restringe acceso por rol.

    Uso:
        @router.get("/admin", dependencies=[Depends(require_role("supervisor", "admin"))])
        async def admin_endpoint(...):

    O inyectando el usuario:
        async def endpoint(user = Depends(require_role("supervisor"))):
    """
    async def _check_role(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        user_rol = current_user.get("rol", "")
        if user_rol not in allowed_roles:
            logger.warning(
                "Acceso denegado: user=%s rol=%s requiere=%s",
                current_user["id"], user_rol, allowed_roles,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return current_user

    return _check_role
