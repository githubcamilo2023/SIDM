"""
Rate limiter en memoria para protección anti brute-force.

Para el piloto con 2 usuarios y un solo proceso, esto es suficiente.
En producción con múltiples workers, migrar a Redis.
"""

import time
import logging
from collections import defaultdict
from app.core.config import get_settings

logger = logging.getLogger("sidm.ratelimit")

# Almacén en memoria: {key: [(timestamp, ...),]}
_attempts: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str) -> bool:
    """
    Retorna True si el key tiene permitido intentar.
    Retorna False si se excedió el límite.
    """
    settings = get_settings()
    now = time.time()
    window = settings.login_window_seconds
    max_attempts = settings.login_max_attempts

    # Limpiar intentos viejos fuera de la ventana
    _attempts[key] = [t for t in _attempts[key] if now - t < window]

    if len(_attempts[key]) >= max_attempts:
        logger.warning("Rate limit excedido para: %s (%d intentos en %ds)",
                       key, len(_attempts[key]), window)
        return False

    return True


def record_attempt(key: str):
    """Registra un intento (exitoso o fallido)."""
    _attempts[key].append(time.time())


def reset_attempts(key: str):
    """Limpia los intentos tras login exitoso."""
    _attempts.pop(key, None)
