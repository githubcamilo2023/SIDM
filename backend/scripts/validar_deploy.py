#!/usr/bin/env python3
"""
SIDM — Script de validación pre-producción.

Ejecuta una batería de tests contra la API desplegada para verificar
que todo funciona correctamente antes de abrir acceso a los visitadores.

Uso:
    # Contra producción
    python scripts/validar_deploy.py https://sidm-production.up.railway.app

    # Contra local
    python scripts/validar_deploy.py http://localhost:8000

    # Con credenciales custom
    python scripts/validar_deploy.py https://sidm-production.up.railway.app --email visitador1@inbiotech.com --password 'MiPassword1!'

Requisitos:
    pip install httpx rich
"""

import sys
import time
import httpx
import argparse
from dataclasses import dataclass, field

# ── CONFIG ────────────────────────────────────────────────────────
DEFAULT_EMAIL = "visitador1@inbiotech.com"
DEFAULT_PASSWORD = "TestPassword1!"  # Cambiar por la real


@dataclass
class TestResult:
    name: str
    passed: bool
    detail: str = ""
    duration_ms: float = 0


@dataclass
class TestSuite:
    results: list[TestResult] = field(default_factory=list)
    access_token: str = ""
    refresh_token: str = ""
    base_url: str = ""

    def add(self, result: TestResult):
        self.results.append(result)
        status = "✅" if result.passed else "❌"
        timing = f"({result.duration_ms:.0f}ms)" if result.duration_ms else ""
        print(f"  {status} {result.name} {timing}")
        if not result.passed and result.detail:
            print(f"     → {result.detail}")

    def summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r.passed)
        failed = total - passed
        print(f"\n{'='*60}")
        print(f"RESULTADO: {passed}/{total} tests pasaron")
        if failed > 0:
            print(f"\n❌ TESTS FALLIDOS:")
            for r in self.results:
                if not r.passed:
                    print(f"   • {r.name}: {r.detail}")
            print(f"\n⛔ NO ESTÁ LISTO PARA PRODUCCIÓN")
        else:
            print(f"\n✅ TODOS LOS TESTS PASARON — Listo para producción")
        print(f"{'='*60}")
        return failed == 0


def timed_request(client, method, url, **kwargs):
    """Ejecuta un request y mide el tiempo."""
    start = time.time()
    try:
        res = getattr(client, method)(url, **kwargs)
        elapsed = (time.time() - start) * 1000
        return res, elapsed
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return e, elapsed


# ── TESTS ─────────────────────────────────────────────────────────

def test_health(suite: TestSuite, client: httpx.Client):
    """1. Verificar que el servidor responde."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/health")
    if isinstance(res, Exception):
        suite.add(TestResult("Health check", False, f"No se puede conectar: {res}"))
        return False
    suite.add(TestResult("Health check", res.status_code == 200,
                         f"Status: {res.status_code}", ms))
    return res.status_code == 200


def test_root(suite: TestSuite, client: httpx.Client):
    """2. Verificar endpoint raíz."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/")
    ok = res.status_code == 200 and "SIDM" in res.text
    suite.add(TestResult("Root endpoint", ok,
                         f"Status: {res.status_code}", ms))


def test_docs_disabled(suite: TestSuite, client: httpx.Client):
    """3. Verificar que /docs no está expuesto en producción."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/docs")
    # En producción debe ser 404, en dev puede ser 200
    is_prod = res.status_code == 404
    suite.add(TestResult("Docs ocultos (producción)",
                         is_prod,
                         f"Status: {res.status_code} — {'Oculto ✓' if is_prod else 'EXPUESTO (ok si app_env=development)'}",
                         ms))


def test_login_success(suite: TestSuite, client: httpx.Client, email: str, password: str):
    """4. Login exitoso."""
    res, ms = timed_request(client, "post", f"{suite.base_url}/api/v1/auth/login",
                             json={"email": email, "password": password})
    if res.status_code == 200:
        data = res.json()
        suite.access_token = data.get("access_token", "")
        suite.refresh_token = data.get("refresh_token", "")
        has_refresh = bool(suite.refresh_token)
        has_visitador = "visitador" in data
        ok = has_refresh and has_visitador and suite.access_token
        detail = []
        if not has_refresh: detail.append("Sin refresh_token")
        if not has_visitador: detail.append("Sin datos de visitador")
        if "password_hash" in str(data.get("visitador", {})): detail.append("⚠️ password_hash expuesto!")
        suite.add(TestResult("Login exitoso", ok,
                             "; ".join(detail) if detail else "OK", ms))
    else:
        suite.add(TestResult("Login exitoso", False,
                             f"Status: {res.status_code} — {res.text[:100]}", ms))


def test_login_wrong_password(suite: TestSuite, client: httpx.Client, email: str):
    """5. Login con contraseña incorrecta."""
    res, ms = timed_request(client, "post", f"{suite.base_url}/api/v1/auth/login",
                             json={"email": email, "password": "contraseña_incorrecta"})
    ok = res.status_code == 401
    detail = res.json().get("detail", "") if res.status_code != 200 else "DEBERÍA FALLAR"
    # Verificar que no revela si el email existe
    is_generic = "incorrecta" in detail.lower() or "invalid" in detail.lower()
    suite.add(TestResult("Login contraseña incorrecta → 401",
                         ok and is_generic,
                         f"Status: {res.status_code}, msg: '{detail}'", ms))


def test_login_nonexistent_email(suite: TestSuite, client: httpx.Client):
    """6. Login con email inexistente — no debe revelar si existe."""
    res, ms = timed_request(client, "post", f"{suite.base_url}/api/v1/auth/login",
                             json={"email": "noexiste@fake.com", "password": "test123"})
    ok = res.status_code == 401
    suite.add(TestResult("Login email inexistente → 401 genérico",
                         ok, f"Status: {res.status_code}", ms))


def test_rate_limit(suite: TestSuite, client: httpx.Client, email: str):
    """7. Rate limiting en login."""
    # Hacer 6 intentos rápidos con contraseña incorrecta
    got_429 = False
    for i in range(7):
        res, _ = timed_request(client, "post", f"{suite.base_url}/api/v1/auth/login",
                                json={"email": email, "password": f"wrong_{i}x"})
        if res.status_code == 429:
            got_429 = True
            break
    suite.add(TestResult("Rate limiting login (6+ intentos → 429)",
                         got_429,
                         "Rate limit activado" if got_429 else "No se activó rate limit después de 7 intentos"))
    if got_429:
        print("     ⏳ Esperando 10s para que expire el rate limit...")
        time.sleep(10)


def test_auth_me(suite: TestSuite, client: httpx.Client):
    """8. GET /auth/me con token válido."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/api/v1/auth/me",
                             headers={"Authorization": f"Bearer {suite.access_token}"})
    if res.status_code == 200:
        data = res.json()
        has_fields = all(k in data for k in ["id", "nombre", "email", "laboratorio", "rol"])
        no_hash = "password_hash" not in data and "_raw_token" not in data
        suite.add(TestResult("GET /auth/me", has_fields and no_hash,
                             "Campos sensibles expuestos!" if not no_hash else "OK", ms))
    else:
        suite.add(TestResult("GET /auth/me", False, f"Status: {res.status_code}", ms))


def test_auth_me_no_token(suite: TestSuite, client: httpx.Client):
    """9. GET /auth/me sin token → 401/403."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/api/v1/auth/me")
    suite.add(TestResult("GET /auth/me sin token → 401/403",
                         res.status_code in (401, 403),
                         f"Status: {res.status_code}", ms))


def test_auth_me_bad_token(suite: TestSuite, client: httpx.Client):
    """10. GET /auth/me con token falso → 401."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/api/v1/auth/me",
                             headers={"Authorization": "Bearer token.falso.invalido"})
    suite.add(TestResult("GET /auth/me con token falso → 401",
                         res.status_code in (401, 403),
                         f"Status: {res.status_code}", ms))


def test_refresh_token(suite: TestSuite, client: httpx.Client):
    """11. POST /auth/refresh — renovar access token."""
    if not suite.refresh_token:
        suite.add(TestResult("Refresh token", False, "No hay refresh token para probar"))
        return
    res, ms = timed_request(client, "post", f"{suite.base_url}/api/v1/auth/refresh",
                             json={"refresh_token": suite.refresh_token})
    if res.status_code == 200:
        data = res.json()
        has_new = "access_token" in data
        # Actualizar token para los siguientes tests
        if has_new:
            suite.access_token = data["access_token"]
        suite.add(TestResult("Refresh token", has_new, "OK", ms))
    else:
        suite.add(TestResult("Refresh token", False, f"Status: {res.status_code}", ms))


def test_listar_medicos(suite: TestSuite, client: httpx.Client):
    """12. GET /medicos — lista de médicos."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/api/v1/medicos",
                             headers={"Authorization": f"Bearer {suite.access_token}"})
    if res.status_code == 200:
        data = res.json()
        is_list = isinstance(data, list)
        has_spp = all("spp" in m for m in data) if data else True
        suite.add(TestResult(f"Listar médicos ({len(data)} encontrados)",
                             is_list and has_spp,
                             "SPP faltante en algunos médicos" if not has_spp else "OK", ms))
    else:
        suite.add(TestResult("Listar médicos", False, f"Status: {res.status_code}", ms))


def test_listar_medicos_no_auth(suite: TestSuite, client: httpx.Client):
    """13. GET /medicos sin auth → 401."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/api/v1/medicos")
    suite.add(TestResult("Listar médicos sin auth → 401/403",
                         res.status_code in (401, 403),
                         f"Status: {res.status_code}", ms))


def test_spp_medico(suite: TestSuite, client: httpx.Client):
    """14. GET /medicos/{id}/spp — SPP de un médico."""
    # Primero obtener un médico válido
    res, _ = timed_request(client, "get", f"{suite.base_url}/api/v1/medicos",
                            headers={"Authorization": f"Bearer {suite.access_token}"})
    if res.status_code != 200 or not res.json():
        suite.add(TestResult("SPP médico", False, "No hay médicos para probar"))
        return

    medico_id = res.json()[0]["id"]
    res, ms = timed_request(client, "get",
                             f"{suite.base_url}/api/v1/medicos/{medico_id}/spp",
                             headers={"Authorization": f"Bearer {suite.access_token}"})
    if res.status_code == 200:
        data = res.json()
        has_fields = all(k in data for k in ["spp", "confianza", "mensaje"])
        spp_range = 0 <= data.get("spp", -1) <= 1
        suite.add(TestResult(f"SPP médico {medico_id}",
                             has_fields and spp_range,
                             f"SPP={data.get('spp')} conf={data.get('confianza')}", ms))
    else:
        suite.add(TestResult("SPP médico", False, f"Status: {res.status_code}", ms))


def test_historial(suite: TestSuite, client: httpx.Client):
    """15. GET /visitas/historial — historial del visitador."""
    res, ms = timed_request(client, "get",
                             f"{suite.base_url}/api/v1/visitas/historial?limite=5",
                             headers={"Authorization": f"Bearer {suite.access_token}"})
    if res.status_code == 200:
        data = res.json()
        suite.add(TestResult(f"Historial ({len(data)} visitas)", True, "OK", ms))
    else:
        suite.add(TestResult("Historial", False, f"Status: {res.status_code}", ms))


def test_stats(suite: TestSuite, client: httpx.Client):
    """16. GET /visitas/stats — estadísticas."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/api/v1/visitas/stats",
                             headers={"Authorization": f"Bearer {suite.access_token}"})
    if res.status_code == 200:
        data = res.json()
        has_fields = all(k in data for k in ["total_visitas", "tasa_exito"])
        suite.add(TestResult("Stats visitador", has_fields,
                             f"total={data.get('total_visitas')} tasa={data.get('tasa_exito')}", ms))
    else:
        suite.add(TestResult("Stats visitador", False, f"Status: {res.status_code}", ms))


def test_security_headers(suite: TestSuite, client: httpx.Client):
    """17. Verificar security headers."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/health")
    headers = res.headers
    checks = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Cache-Control": "no-store",
    }
    missing = []
    for h, expected in checks.items():
        actual = headers.get(h, "")
        if expected not in actual:
            missing.append(f"{h} (esperado: {expected}, actual: {actual or 'ausente'})")

    suite.add(TestResult("Security headers",
                         len(missing) == 0,
                         "; ".join(missing) if missing else "OK", ms))


def test_cors(suite: TestSuite, client: httpx.Client):
    """18. Verificar que CORS no está abierto a todos."""
    res, ms = timed_request(client, "options", f"{suite.base_url}/api/v1/auth/login",
                             headers={
                                 "Origin": "https://evil-site.com",
                                 "Access-Control-Request-Method": "POST",
                             })
    cors_origin = res.headers.get("access-control-allow-origin", "")
    is_open = cors_origin == "*"
    allows_evil = cors_origin == "https://evil-site.com"
    suite.add(TestResult("CORS no abierto a todos",
                         not is_open and not allows_evil,
                         f"Allow-Origin: '{cors_origin}'" if cors_origin else "Sin header CORS (ok)", ms))


def test_response_time(suite: TestSuite, client: httpx.Client):
    """19. Tiempo de respuesta del endpoint más pesado."""
    res, ms = timed_request(client, "get", f"{suite.base_url}/api/v1/medicos",
                             headers={"Authorization": f"Bearer {suite.access_token}"})
    ok = ms < 3000  # 3 segundos máx
    suite.add(TestResult(f"Tiempo respuesta /medicos < 3s",
                         ok, f"{ms:.0f}ms", ms))


def test_logout(suite: TestSuite, client: httpx.Client):
    """20. POST /auth/logout — revocar token."""
    old_token = suite.access_token
    res, ms = timed_request(client, "post", f"{suite.base_url}/api/v1/auth/logout",
                             headers={"Authorization": f"Bearer {old_token}"})
    if res.status_code == 200:
        # Verificar que el token viejo ya no funciona
        res2, _ = timed_request(client, "get", f"{suite.base_url}/api/v1/auth/me",
                                 headers={"Authorization": f"Bearer {old_token}"})
        revoked = res2.status_code == 401
        suite.add(TestResult("Logout + token revocado",
                             revoked,
                             "Token sigue activo después de logout!" if not revoked else "OK", ms))
    else:
        suite.add(TestResult("Logout", False, f"Status: {res.status_code}", ms))


# ── MAIN ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SIDM — Validación pre-producción")
    parser.add_argument("base_url", help="URL base del servidor (ej: https://sidm-production.up.railway.app)")
    parser.add_argument("--email", default=DEFAULT_EMAIL, help="Email del visitador de prueba")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Contraseña del visitador de prueba")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    suite = TestSuite(base_url=base_url)

    print(f"\n{'='*60}")
    print(f"SIDM — Validación pre-producción")
    print(f"Servidor: {base_url}")
    print(f"Email:    {args.email}")
    print(f"{'='*60}\n")

    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        # ── Conectividad ──────────────────────────────────────
        print("📡 Conectividad")
        if not test_health(suite, client):
            print("\n⛔ No se puede conectar al servidor. Abortando.")
            sys.exit(1)
        test_root(suite, client)
        test_docs_disabled(suite, client)

        # ── Autenticación ─────────────────────────────────────
        print("\n🔐 Autenticación")
        test_login_wrong_password(suite, client, args.email)
        test_login_nonexistent_email(suite, client)
        test_rate_limit(suite, client, f"ratelimit_test_{int(time.time())}@test.com")

        # Re-login con credenciales reales (después del rate limit test con otro email)
        test_login_success(suite, client, args.email, args.password)
        if not suite.access_token:
            print("\n⛔ No se pudo autenticar. Verifica email/password. Abortando.")
            sys.exit(1)

        test_auth_me(suite, client)
        test_auth_me_no_token(suite, client)
        test_auth_me_bad_token(suite, client)
        test_refresh_token(suite, client)

        # ── Endpoints de negocio ──────────────────────────────
        print("\n📋 Endpoints de negocio")
        test_listar_medicos(suite, client)
        test_listar_medicos_no_auth(suite, client)
        test_spp_medico(suite, client)
        test_historial(suite, client)
        test_stats(suite, client)

        # ── Seguridad ─────────────────────────────────────────
        print("\n🛡️  Seguridad")
        test_security_headers(suite, client)
        test_cors(suite, client)
        test_response_time(suite, client)
        test_logout(suite, client)

    # Resumen
    all_passed = suite.summary()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
