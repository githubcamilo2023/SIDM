"""
Genera hashes bcrypt para visitadores del piloto.

Uso:
    python scripts/generar_hashes.py

IMPORTANTE: Las contraseñas se ingresan por consola.
NUNCA guardar contraseñas en texto plano en el código.
"""

import getpass
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

visitadores = [
    {"nombre": "Visitador 1 Inbiotech", "email": "visitador1@inbiotech.com"},
    {"nombre": "Visitador 2 Inbiotech", "email": "visitador2@inbiotech.com"},
]

print("\n── Generador de hashes para Supabase ──\n")
print("REQUISITOS de contraseña: mínimo 10 caracteres, al menos 1 mayúscula, 1 número.\n")

for v in visitadores:
    print(f"Visitador: {v['nombre']} ({v['email']})")
    while True:
        password = getpass.getpass("  Contraseña: ")
        if len(password) < 10:
            print("  ✗ Mínimo 10 caracteres. Intenta de nuevo.")
            continue
        if not any(c.isupper() for c in password):
            print("  ✗ Debe contener al menos una mayúscula. Intenta de nuevo.")
            continue
        if not any(c.isdigit() for c in password):
            print("  ✗ Debe contener al menos un número. Intenta de nuevo.")
            continue
        confirm = getpass.getpass("  Confirmar:  ")
        if password != confirm:
            print("  ✗ No coinciden. Intenta de nuevo.")
            continue
        break

    hash_pw = pwd_context.hash(password)
    print(f"  ✓ Hash generado")
    print(f"  SQL:")
    print(f"    UPDATE visitadores SET password_hash = '{hash_pw}' WHERE email = '{v['email']}';")
    print()
