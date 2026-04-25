from fastapi import APIRouter, HTTPException, status
from passlib.context import CryptContext
from app.schemas.schemas import LoginRequest, TokenResponse
from app.core.auth import create_access_token
from app.core.database import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    db = get_supabase()

    result = (
        db.table("visitadores")
        .select("id, nombre, email, password_hash, laboratorio, rol, activo")
        .eq("email", body.email)
        .eq("activo", True)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    visitador = result.data

    if not pwd_context.verify(body.password, visitador["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    token = create_access_token({"sub": str(visitador["id"])})

    # No devolver el hash de contraseña al cliente
    visitador.pop("password_hash", None)

    return TokenResponse(access_token=token, visitador=visitador)


@router.get("/me")
async def me(current_user: dict = __import__('fastapi').Depends(
    __import__('app.core.auth', fromlist=['get_current_user']).get_current_user
)):
    return current_user
