from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, time, datetime


# ── AUTH ──────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    visitador: dict


# ── MÉDICOS ───────────────────────────────────────────────────────
class MedicoOut(BaseModel):
    id: int
    nombre: str
    especialidad: Optional[str]
    zona: Optional[str]
    consultorios: Optional[list[str]] = []
    spp: Optional[float] = 0.65          # prior neutral si no hay datos
    confianza: Optional[str] = "baja"
    total_visitas: Optional[int] = 0


# ── VISITAS ───────────────────────────────────────────────────────
class VisitaCreate(BaseModel):
    medico_id: int
    consultorio: str
    hora_llegada: str                    # "HH:MM"
    canal_contacto: str                  # sin_aviso | whatsapp | llamada
    resultado: str                       # exitosa | retraso | medico_ausente | agenda_cerrada | reagendada
    tiempo_espera: Optional[int] = None  # minutos
    producto: Optional[str] = None
    novedad_categoria: Optional[str] = None
    nota: Optional[str] = None
    prox_visita: Optional[str] = None
    nivel_interes: Optional[int] = Field(None, ge=1, le=5)
    pacientes_en_sala: Optional[str] = None   # vacio | 1-3 | 4-6 | lleno
    hora_inicio_atencion: Optional[str] = None  # "HH:MM"


class VisitaOut(BaseModel):
    id: int
    medico_id: int
    medico_nombre: Optional[str]
    consultorio: str
    fecha: str
    hora_llegada: str
    resultado: str
    tiempo_espera: Optional[int]
    producto: Optional[str]
    novedad_categoria: Optional[str]
    nota: Optional[str]
    nivel_interes: Optional[int]
    creado_en: datetime


# ── SPP ───────────────────────────────────────────────────────────
class SPPOut(BaseModel):
    medico_id: int
    spp: float
    confianza: str                       # baja | media | alta
    base_datos: int
    mensaje: str
    score_detalle: Optional[dict] = None


# ── HISTORIAL ─────────────────────────────────────────────────────
class HistorialStats(BaseModel):
    total_visitas: int
    visitas_exitosas: int
    tasa_exito: float
    nivel_interes_promedio: Optional[float]
    tiempo_espera_promedio: Optional[float]
