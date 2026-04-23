# SIDM Backend — Guía de Deploy

## Stack
- **FastAPI** — API REST
- **Supabase** — PostgreSQL + Auth
- **Railway** — Deploy y hosting
- **Python 3.11**

---

## Paso 1 — Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar `scripts/create_tables.sql`
3. Copiar las variables de entorno desde **Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (service_role)

---

## Paso 2 — Generar contraseñas del piloto

```bash
pip install passlib[bcrypt]
python scripts/generar_hashes.py
```

Copiar los hashes generados y ejecutar los UPDATE en Supabase SQL Editor.

---

## Paso 3 — Desarrollo local

```bash
# Clonar e instalar
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Correr el servidor
uvicorn app.main:app --reload --port 8000
```

API disponible en: http://localhost:8000
Documentación: http://localhost:8000/docs

---

## Paso 4 — Deploy en Railway

1. Crear cuenta en [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Agregar variables de entorno en Railway:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
SECRET_KEY=          # string aleatorio largo
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
APP_ENV=production
CORS_ORIGINS=https://tu-frontend.vercel.app
```
4. Railway detecta el Dockerfile automáticamente y despliega.

---

## Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login visitador |
| GET | `/api/v1/auth/me` | Usuario actual |
| GET | `/api/v1/medicos` | Lista médicos con SPP |
| GET | `/api/v1/medicos/{id}/spp` | SPP de un médico |
| POST | `/api/v1/visitas` | Registrar visita |
| GET | `/api/v1/visitas/historial` | Historial del visitador |
| GET | `/api/v1/visitas/stats` | Estadísticas del visitador |

---

## Conectar el frontend React

En tu `sidm-mvp-v2.jsx`, agregar al inicio:

```javascript
const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Login
const res = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
const { access_token, visitador } = await res.json();
localStorage.setItem("sidm_token", access_token);

// Llamadas autenticadas
const headers = {
  "Authorization": `Bearer ${localStorage.getItem("sidm_token")}`,
  "Content-Type": "application/json"
};

// Cargar médicos
const medicos = await fetch(`${API}/medicos`, { headers }).then(r => r.json());

// Registrar visita
await fetch(`${API}/visitas`, {
  method: "POST",
  headers,
  body: JSON.stringify(visitaData)
});
```
