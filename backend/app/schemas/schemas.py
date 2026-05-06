from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal, Optional
from datetime import datetime
import re


# ── TIPOS ENUMERADOS ──────────────────────────────────────────────
ResultadoVisita = Literal[
    "exitosa", "retraso", "medico_ausente", "agenda_cerrada", "reagendada"
]
CanalContacto = Literal["sin_aviso", "whatsapp", "llamada"]
PacientesEnSala = Literal["vacio", "1-3", "4-6", "lleno"]

# Regex para validar formato HH:MM
_HORA_REGEX = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")


# ── AUTH ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    visitador: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validar_fortaleza(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Debe contener al menos una mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("Debe contener al menos un número")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?/" for c in v):
            raise ValueError("Debe contener al menos un carácter especial")
        return v


# ── MÉDICOS ───────────────────────────────────────────────────────
class MedicoOut(BaseModel):
    id: int
    nombre: str
    especialidad: Optional[str] = None
    zona: Optional[str] = None
    consultorios: Optional[list[str]] = []
    spp: Optional[float] = 0.65
    confianza: Optional[str] = "baja"
    total_visitas: Optional[int] = 0


# ── VISITAS ───────────────────────────────────────────────────────
class VisitaCreate(BaseModel):
    medico_id: int
    consultorio: str = Field(..., min_length=1, max_length=150)
    hora_llegada: str                                    # "HH:MM"
    canal_contacto: CanalContacto
    resultado: ResultadoVisita
    tiempo_espera: Optional[int] = Field(None, ge=0, le=480)  # max 8 horas
    producto: Optional[str] = Field(None, max_length=150)
    novedad_categoria: Optional[str] = Field(None, max_length=50)
    nota: Optional[str] = Field(None, max_length=2000)
    prox_visita: Optional[str] = Field(None, max_length=50)
    nivel_interes: Optional[int] = Field(None, ge=1, le=5)
    pacientes_en_sala: Optional[PacientesEnSala] = None
    hora_inicio_atencion: Optional[str] = None           # "HH:MM"

    @field_validator("hora_llegada", "hora_inicio_atencion")
    @classmethod
    def validar_formato_hora(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not _HORA_REGEX.match(v):
            raise ValueError("Formato de hora inválido. Usar HH:MM (ej: 09:30)")
        return v


class VisitaOut(BaseModel):
    id: int
    medico_id: int
    medico_nombre: Optional[str] = None
    visitador_nombre: Optional[str] = None   # ← NUEVO: para vista admin
    consultorio: str
    fecha: str
    hora_llegada: str
    resultado: str
    tiempo_espera: Optional[int] = None
    producto: Optional[str] = None
    novedad_categoria: Optional[str] = None
    nota: Optional[str] = None
    nivel_interes: Optional[int] = None
    creado_en: datetime


# ── SPP ───────────────────────────────────────────────────────────
class SPPOut(BaseModel):
    medico_id: int
    spp: float
    confianza: str
    base_datos: int
    mensaje: str
    score_detalle: Optional[dict] = None


# ── HISTORIAL ─────────────────────────────────────────────────────
class HistorialStats(BaseModel):
    total_visitas: int
    visitas_exitosas: int
    tasa_exito: float
    nivel_interes_promedio: Optional[float] = None
    tiempo_espera_promedio: Optional[float] = None
