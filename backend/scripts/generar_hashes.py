"""
Ejecutar este script una sola vez para generar los hashes
de contraseña de los visitadores del piloto.

Uso:
    python scripts/generar_hashes.py
"""
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

visitadores = [
    {"nombre": "Visitador 1 Inbiotech", "email": "visitador1@inbiotech.com", "password": "sidm2024v1"},
    {"nombre": "Visitador 2 Inbiotech", "email": "visitador2@inbiotech.com", "password": "sidm2024v2"},
]

print("\n── Hashes generados para Supabase ──\n")
for v in visitadores:
    hash_pw = pwd_context.hash(v["password"])
    print(f"Nombre:   {v['nombre']}")
    print(f"Email:    {v['email']}")
    print(f"Password: {v['password']}")
    print(f"Hash:     {hash_pw}")
    print(f"SQL:")
    print(f"  UPDATE visitadores SET password_hash = '{hash_pw}' WHERE email = '{v['email']}';\n")
