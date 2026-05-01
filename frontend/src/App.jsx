import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';

// ── CONFIG ───────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "https://sidm-production.up.railway.app/api/v1";

// ── PALETA ACTUALIZADA (TEAL MÉDICO) ─────────────────────────────
const C = {
  // Primarios - Teal médico
  primary:    "#0f766e",   // teal-700
  action:     "#14b8a6",   // teal-500  ← Botón Continuar
  accent:     "#0d9488",   // teal-600
  success:    "#16a34a",   // green-600
  danger:     "#dc2626",   // red-600
  warn:       "#ea580c",   // orange-600  ← Con retraso
  orange:     "#f97316",   // orange-500  ← Agenda cerrada

  // Neutros
  bg:         "#f8fafc",   // slate-50
  card:       "#ffffff",
  section:    "#f1f5f9",   // slate-100
  border:     "#e2e8f0",   // slate-200
  textMain:   "#0f172a",   // slate-900
  textSub:    "#475569",   // slate-600
  muted:      "#94a3b8",   // slate-400
  white:      "#ffffff",

  // Gradientes y sombras
  gradientPrimary: "linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)",
  gradientAccent:  "linear-gradient(135deg, #14b8a6 0%, #16a34a 100%)",
  shadow:     "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
  shadowMd:   "0 4px 6px rgba(15,23,42,0.07), 0 2px 4px rgba(15,23,42,0.04)",
  shadowLg:   "0 10px 25px rgba(15,23,42,0.1), 0 4px 10px rgba(15,23,42,0.04)",
};

// ── CATÁLOGOS ────────────────────────────────────────────────────
const RESULTADOS = [
  { id:"exitosa",        label:"Visita exitosa",    emoji:"✅", color:C.success  },
  { id:"retraso",        label:"Con retraso",       emoji:"⏱️", color:C.warn     },
  { id:"medico_ausente", label:"Médico ausente",    emoji:"❌", color:C.danger   },
  { id:"agenda_cerrada", label:"Agenda cerrada",    emoji:"🔒", color:C.orange   },
  { id:"reagendada",     label:"Reagendada",        emoji:"📅", color:"#ca8a04" },  // yellow-600
];

const CANALES = [
  { id:"sin_aviso", label:"Sin aviso previo", icon:"📍" },
  { id:"whatsapp",  label:"WhatsApp",         icon:"💬" },
  { id:"llamada",   label:"Llamada",          icon:"📞" },
];

const NOVEDADES = [
  { id:"secretaria_info",      label:"Info de secretaria",     emoji:"💬" },
  { id:"agenda_cambio",        label:"Cambio de agenda",       emoji:"📅" },
  { id:"medico_ocupado",       label:"Médico muy ocupado",     emoji:"⏰" },
  { id:"consultorio_nuevo",    label:"Nuevo consultorio",      emoji:"🏥" },
  { id:"interes_producto",     label:"Interés en producto",    emoji:"💊" },
  { id:"actividad_competencia",label:"Actividad competencia",  emoji:"⚠️" },
  { id:"otro",                 label:"Otro",                   emoji:"📌" },
];

const NIVEL_INTERES = [
  { val:1, label:"Sin interés",     desc:"No escuchó, cortó la visita",                 color:C.danger  },
  { val:2, label:"Escuchó apenas",  desc:"Atendió por compromiso, sin engagement",      color:C.warn    },
  { val:3, label:"Interés normal",  desc:"Escuchó y hizo preguntas básicas",            color:"#ca8a04" },  // yellow-600
  { val:4, label:"Interés alto",    desc:"Pidió más información o muestras",            color:"#16a34a" },  // green-600
  { val:5, label:"Muy interesado",  desc:"Solicitó seguimiento o preguntó prescripción", color:C.success },
];

const ESPERA_OPCIONES = [
  { val: 0,  label: "Sin espera" },
  { val: 5,  label: "~5 min" },
  { val: 15, label: "~15 min" },
  { val: 30, label: "~30 min" },
  { val: 45, label: "~45 min" },
  { val: 60, label: "60+ min" },
];

// ── HELPERS ──────────────────────────────────────────────────────
const novEmoji = (id) => NOVEDADES.find(n=>n.id===id)?.emoji || "📌";
const novLabel = (id) => NOVEDADES.find(n=>n.id===id)?.label || id;

// ── AUTH SERVICE ─────────────────────────────────────────────────
const AuthService = {
  getAccessToken: () => sessionStorage.getItem("sidm_access"),
  getRefreshToken: () => sessionStorage.getItem("sidm_refresh"),

  setTokens: (access, refresh) => {
    sessionStorage.setItem("sidm_access", access);
    if (refresh) sessionStorage.setItem("sidm_refresh", refresh);
  },

  clearTokens: () => {
    sessionStorage.removeItem("sidm_access");
    sessionStorage.removeItem("sidm_refresh");
  },

  refreshAccessToken: async () => {
    const refresh = AuthService.getRefreshToken();
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      sessionStorage.setItem("sidm_access", data.access_token);
      return data.access_token;
    } catch { return null; }
  },

  secureFetch: async (url, options = {}) => {
    let token = AuthService.getAccessToken();
    if (!token) throw new Error("NO_TOKEN");
    const doFetch = (t) => fetch(url, {
      ...options,
      headers: { ...options.headers, "Authorization": `Bearer ${t}` },
    });
    let res = await doFetch(token);
    if (res.status === 401) {
      const newToken = await AuthService.refreshAccessToken();
      if (!newToken) throw new Error("SESSION_EXPIRED");
      res = await doFetch(newToken);
      if (res.status === 401) throw new Error("SESSION_EXPIRED");
    }
    return res;
  },
};

// ── ESTILOS BASE ─────────────────────────────────────────────────
const fontStack = "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

const inputStyle = {
  width:"100%", padding:"11px 14px", fontSize:14,
  fontFamily: fontStack,
  background:C.white, border:`1.5px solid ${C.border}`,
  borderRadius:10, color:C.textMain, outline:"none",
  boxSizing:"border-box", transition:"border-color 0.2s, box-shadow 0.2s",
};

const inputFocusStyle = {
  borderColor: C.action,
  boxShadow: `0 0 0 3px ${C.action}18`,
};

const labelStyle = {
  display:"block", fontSize:13, fontWeight:500,
  color:C.textSub, marginBottom:6, letterSpacing:"0.01em",
};

const sectionStyle = { marginBottom: 16 };

// ── INPUT CON FOCUS ──────────────────────────────────────────────
function Input({ style: extraStyle, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}), ...extraStyle }}
    />
  );
}

function TextArea({ style: extraStyle, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{ ...inputStyle, resize:"vertical", minHeight:70, ...(focused ? inputFocusStyle : {}), ...extraStyle }}
    />
  );
}

// ── TOOLTIP RECHARTS ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:C.white, border:`1px solid ${C.border}`,
      borderRadius:10, padding:"10px 14px", fontSize:12,
      boxShadow:C.shadowMd, fontFamily:fontStack,
    }}>
      <div style={{color:C.textMain,fontWeight:600,marginBottom:4}}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color||C.action, display:"flex", gap:6, alignItems:"center"}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:p.color||C.action}} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [token, setToken] = useState(AuthService.getAccessToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogin = (accessToken, refreshToken, userData) => {
    AuthService.setTokens(accessToken, refreshToken);
    setToken(accessToken);
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      const t = AuthService.getAccessToken();
      if (t) {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${t}` },
        });
      }
    } catch {}
    AuthService.clearTokens();
    setToken(null);
    setUser(null);
  };

  const handleSessionExpired = useCallback(() => {
    AuthService.clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (token) {
      AuthService.secureFetch(`${API_URL}/auth/me`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => { setUser(data); setLoading(false); })
        .catch(() => { AuthService.clearTokens(); setToken(null); setLoading(false); });
    } else { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!document.getElementById("sidm-fonts")) {
      const link = document.createElement("link");
      link.id = "sidm-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Space+Grotesk:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    document.body.style.margin = "0";
    document.body.style.background = C.bg;
    document.body.style.fontFamily = fontStack;
    document.body.style.WebkitFontSmoothing = "antialiased";
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:fontStack }}>
        <div style={{textAlign:"center"}}>
          <div style={{ fontSize:36, fontWeight:700, letterSpacing:"-0.04em", background:C.gradientPrimary, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:8, fontFamily:"'Space Grotesk', sans-serif" }}>SIDM</div>
          <div style={{fontSize:14,color:C.muted}}>Cargando...</div>
          <div style={{ width:32, height:3, borderRadius:2, background:C.gradientAccent, margin:"16px auto 0", animation:"pulse 1.5s ease-in-out infinite" }}/>
          <style>{`@keyframes pulse { 0%,100% { opacity:0.4; width:32px; } 50% { opacity:1; width:64px; } }`}</style>
        </div>
      </div>
    );
  }

  if (!token) return <PantallaLogin onLogin={handleLogin} />;

  return <AppPrincipal user={user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />;
}

// ══════════════════════════════════════════════════════════════════
// PANTALLA DE LOGIN
// ══════════════════════════════════════════════════════════════════
function PantallaLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) throw new Error("Demasiados intentos. Espera unos minutos.");
        throw new Error(data.detail || "Credenciales incorrectas");
      }
      onLogin(data.access_token, data.refresh_token, data.visitador);
    } catch (err) { setError(err.message); }
    finally { setCargando(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:fontStack }}>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"45vh", background:C.gradientPrimary, borderRadius:"0 0 40px 40px", zIndex:0 }} />
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"45vh", background:"radial-gradient(ellipse at 30% 50%, rgba(20,184,166,0.15) 0%, transparent 60%)", zIndex:0 }} />
      <div style={{ background:C.card, borderRadius:20, padding:"40px 32px", width:"100%", maxWidth:400, position:"relative", zIndex:1, boxShadow:"0 20px 60px rgba(15,23,42,0.15), 0 4px 20px rgba(15,23,42,0.08)" }}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{ fontSize:38, fontWeight:700, letterSpacing:"-0.04em", background:C.gradientPrimary, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:4, fontFamily:"'Space Grotesk', sans-serif" }}>SIDM</div>
          <p style={{fontSize:14,color:C.muted,margin:0,lineHeight:1.5}}>Sistema de Inteligencia de<br/>Disponibilidad Médica</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="visitador@inbiotech.com" required autoComplete="email" />
          </div>
          <div style={{marginBottom:24}}>
            <label style={labelStyle}>Contraseña</label>
            <div style={{position:"relative"}}>
              <Input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" style={{paddingRight:44}} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.muted, padding:4 }}>{showPwd ? "🙈" : "👁️"}</button>
            </div>
          </div>
          {error && (
            <div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:C.danger, display:"flex", alignItems:"center", gap:8 }}>
              <span>⚠️</span> {error}
            </div>
          )}
          <button type="submit" disabled={cargando} style={{ width:"100%", padding:"13px", fontSize:15, fontWeight:600, background:cargando ? C.muted : C.gradientPrimary, color:C.white, fontFamily:fontStack, letterSpacing:"0.01em", border:"none", borderRadius:12, cursor:cargando?"not-allowed":"pointer", boxShadow:cargando ? "none" : "0 4px 14px rgba(15,118,110,0.35)", transition:"all 0.2s" }}>
            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>
        <p style={{ fontSize:11, color:C.muted, marginTop:24, textAlign:"center", letterSpacing:"0.02em" }}>Piloto Inbiotech · v0.2.1</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════
function AppPrincipal({ user, onLogout, onSessionExpired }) {
  const [tab, setTab] = useState("nueva");
  const [paso, setPaso] = useState(1);
  const [medicos, setMedicos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [stats, setStats] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [medicoSeleccionado, setMedicoSeleccionado] = useState(null);
  const [consultorio, setConsultorio] = useState("");
  const [horaLlegada, setHoraLlegada] = useState("");
  const [canalContacto, setCanalContacto] = useState("sin_aviso");
  const [resultado, setResultado] = useState(null);
  const [espera, setEspera] = useState(null);
  const [producto, setProducto] = useState("");
  const [novedadCat, setNovedadCat] = useState(null);
  const [nota, setNota] = useState("");
  const [proxVisita, setProxVisita] = useState("");
  const [nivelInteres, setNivelInteres] = useState(null);
  const [pacientesEnSala, setPacientesEnSala] = useState(null);
  const [horaInicioAtencion, setHoraInicioAtencion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const apiFetch = useCallback(async (path, options = {}) => {
    try { return await AuthService.secureFetch(`${API_URL}${path}`, options); }
    catch (err) { if (err.message === "SESSION_EXPIRED" || err.message === "NO_TOKEN") onSessionExpired(); throw err; }
  }, [onSessionExpired]);

  const cargarMedicos = useCallback(async () => {
    try { const res = await apiFetch("/medicos"); if (res.ok) setMedicos(await res.json()); } catch {}
  }, [apiFetch]);

  const cargarHistorial = useCallback(async () => {
    try {
      const [resH, resS] = await Promise.all([apiFetch("/visitas/historial?limite=100"), apiFetch("/visitas/stats")]);
      if (resH.ok) setHistorial(await resH.json());
      if (resS.ok) setStats(await resS.json());
    } catch {}
  }, [apiFetch]);

  useEffect(() => {
    if (tab === "nueva") cargarMedicos();
    if (tab === "historial" || tab === "dashboard") cargarHistorial();
  }, [tab, cargarMedicos, cargarHistorial]);

  const resetFormulario = () => {
    setPaso(1); setMedicoSeleccionado(null); setConsultorio(""); setHoraLlegada("");
    setCanalContacto("sin_aviso"); setResultado(null); setEspera(null); setProducto("");
    setNovedadCat(null); setNota(""); setProxVisita(""); setNivelInteres(null);
    setPacientesEnSala(null); setHoraInicioAtencion("");
  };

  const handleEnviarVisita = async () => {
    if (!medicoSeleccionado?.id || !consultorio.trim() || !horaLlegada || !resultado) return;
    if ((resultado === "exitosa" || resultado === "retraso") && !nivelInteres) return;
    setEnviando(true);
    try {
      const res = await apiFetch("/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medico_id: medicoSeleccionado.id, consultorio: consultorio.trim(),
          hora_llegada: horaLlegada || null, canal_contacto: canalContacto,
          resultado, tiempo_espera: espera, producto: producto.trim() || null,
          novedad_categoria: novedadCat || null, nota: nota.trim() || null,
          prox_visita: proxVisita || null, nivel_interes: nivelInteres || null,
          pacientes_en_sala: pacientesEnSala, hora_inicio_atencion: horaInicioAtencion || null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Error ${res.status}`); }
      resetFormulario(); setTab("historial");
    } catch (err) { alert(`Error: ${err.message}\n\nLos datos se mantienen. Intenta nuevamente.`); }
    finally { setEnviando(false); }
  };

  if (showChangePassword) return <CambiarPassword apiFetch={apiFetch} onBack={() => setShowChangePassword(false)} onLogout={onLogout} />;

  const tabs = [
    { id:"nueva", label:"Nueva visita", icon:"+" },
    { id:"historial", label:"Historial", icon:"📋" },
    { id:"dashboard", label:"Dashboard", icon:"📊" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.textMain, fontFamily:fontStack }}>
      {/* HEADER */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"0 16px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:20, boxShadow:"0 1px 3px rgba(15,23,42,0.05)" }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.03em", background:C.gradientPrimary, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", fontFamily:"'Space Grotesk', sans-serif" }}>SIDM</span>
          {user && <span style={{ fontSize:13, color:C.muted, fontWeight:400, borderLeft:`1px solid ${C.border}`, paddingLeft:10 }}>{user.nombre?.split(" ")[0] || user.email}</span>}
        </div>
        <div ref={menuRef} style={{position:"relative"}}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ width:36, height:36, borderRadius:"50%", background:C.gradientPrimary, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:14, fontWeight:600, fontFamily:fontStack }}>
            {user?.nombre?.[0]?.toUpperCase() || "U"}
          </button>
          {showMenu && (
            <div style={{ position:"absolute", right:0, top:44, background:C.white, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:C.shadowLg, minWidth:200, overflow:"hidden", zIndex:30 }}>
              <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
                <div style={{fontSize:14,fontWeight:600,color:C.textMain}}>{user?.nombre}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{user?.email}</div>
                <div style={{ fontSize:11, color:C.action, fontWeight:500, marginTop:4, textTransform:"capitalize" }}>{user?.laboratorio} · {user?.rol || "visitador"}</div>
              </div>
              <button onClick={() => { setShowMenu(false); setShowChangePassword(true); }} style={{ width:"100%", padding:"11px 16px", fontSize:13, background:"none", border:"none", textAlign:"left", cursor:"pointer", color:C.textSub, fontFamily:fontStack, borderBottom:`1px solid ${C.border}` }} onMouseEnter={e => e.target.style.background=C.section} onMouseLeave={e => e.target.style.background="none"}>🔒 Cambiar contraseña</button>
              <button onClick={() => { setShowMenu(false); onLogout(); }} style={{ width:"100%", padding:"11px 16px", fontSize:13, background:"none", border:"none", textAlign:"left", cursor:"pointer", color:C.danger, fontFamily:fontStack }} onMouseEnter={e => e.target.style.background="#FEF2F2"} onMouseLeave={e => e.target.style.background="none"}>↩ Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex", background:C.white, borderBottom:`1px solid ${C.border}`, position:"sticky", top:56, zIndex:19 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); if(t.id==="nueva") resetFormulario(); }}
            style={{ flex:1, padding:"12px 0", fontSize:13, fontWeight:tab===t.id?600:400, fontFamily:fontStack, background:tab===t.id?C.bg:C.white, color:tab===t.id?C.primary:C.muted, border:"none", borderBottom:tab===t.id?`2.5px solid ${C.primary}`:"2.5px solid transparent", cursor:"pointer", transition:"all 0.2s", letterSpacing:"0.01em" }}>
            <span style={{marginRight:4}}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{padding:"16px",maxWidth:600,margin:"0 auto"}}>
        {tab === "nueva" && (
          <>
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:20}}>
              {[1,2,3,4].map(p => (
                <div key={p} style={{display:"flex",alignItems:"center",gap:4,flex:p<4?1:"none"}}>
                  <div style={{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, background: p < paso ? C.primary : p === paso ? `${C.primary}12` : C.white, color: p < paso ? C.white : p === paso ? C.primary : C.muted, border: p === paso ? `2px solid ${C.primary}` : p < paso ? "none" : `1.5px solid ${C.border}`, transition:"all 0.3s", boxShadow: p < paso ? `0 2px 8px ${C.primary}40` : "none" }}>
                    {p < paso ? "✓" : p}
                  </div>
                  {p < 4 && <div style={{ flex:1, height:2, borderRadius:1, background: p < paso ? C.primary : C.border, transition:"all 0.3s" }}/>}
                </div>
              ))}
            </div>
            <NuevaVisita
              paso={paso} setPaso={setPaso} medicos={medicos}
              medicoSeleccionado={medicoSeleccionado} setMedicoSeleccionado={setMedicoSeleccionado}
              consultorio={consultorio} setConsultorio={setConsultorio}
              horaLlegada={horaLlegada} setHoraLlegada={setHoraLlegada}
              canalContacto={canalContacto} setCanalContacto={setCanalContacto}
              resultado={resultado} setResultado={setResultado}
              espera={espera} setEspera={setEspera}
              producto={producto} setProducto={setProducto}
              novedadCat={novedadCat} setNovedadCat={setNovedadCat}
              nota={nota} setNota={setNota}
              proxVisita={proxVisita} setProxVisita={setProxVisita}
              nivelInteres={nivelInteres} setNivelInteres={setNivelInteres}
              pacientesEnSala={pacientesEnSala} setPacientesEnSala={setPacientesEnSala}
              horaInicioAtencion={horaInicioAtencion} setHoraInicioAtencion={setHoraInicioAtencion}
              enviando={enviando} onEnviar={handleEnviarVisita}
            />
          </>
        )}
        {tab === "historial" && <Historial historial={historial} stats={stats} />}
        {tab === "dashboard" && <Dashboard historial={historial} stats={stats} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CAMBIAR CONTRASEÑA
// ══════════════════════════════════════════════════════════════════
function CambiarPassword({ apiFetch, onBack, onLogout }) {
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validations = [
    { ok: newPwd.length >= 10, label: "Mínimo 10 caracteres" },
    { ok: /[A-Z]/.test(newPwd), label: "Al menos una mayúscula" },
    { ok: /[0-9]/.test(newPwd), label: "Al menos un número" },
    { ok: /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?/]/.test(newPwd), label: "Al menos un carácter especial" },
    { ok: newPwd && confirm && newPwd === confirm, label: "Las contraseñas coinciden" },
  ];

  const allValid = current.length > 0 && validations.every(v => v.ok);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      const res = await apiFetch("/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cambiar contraseña");
      setSuccess(true); setTimeout(() => onLogout(), 2500);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:fontStack, padding:20, display:"flex", justifyContent:"center" }}>
      <div style={{width:"100%",maxWidth:440,marginTop:40}}>
        <BtnAtras onClick={onBack} />
        <div style={{ background:C.white, borderRadius:16, padding:"28px 24px", boxShadow:C.shadowMd, border:`1px solid ${C.border}` }}>
          <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 4px",color:C.textMain}}>Cambiar contraseña</h2>
          <p style={{fontSize:13,color:C.muted,margin:"0 0 24px"}}>Se cerrará tu sesión al cambiarla</p>
          {success ? (
            <div style={{ background:"#F0FDF4", border:`1px solid #BBF7D0`, borderRadius:10, padding:20, textAlign:"center" }}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:15,fontWeight:600,color:C.success}}>Contraseña actualizada</div>
              <div style={{fontSize:13,color:C.textSub,marginTop:4}}>Redirigiendo al login...</div>
            </div>
          ) : (
            <>
              <div style={sectionStyle}><label style={labelStyle}>Contraseña actual</label><Input type="password" value={current} onChange={e => setCurrent(e.target.value)} /></div>
              <div style={sectionStyle}><label style={labelStyle}>Nueva contraseña</label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></div>
              <div style={sectionStyle}><label style={labelStyle}>Confirmar nueva contraseña</label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
              {newPwd.length > 0 && (
                <div style={{ background:C.section, borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                  {validations.map((v, i) => (
                    <div key={i} style={{ fontSize:12, color: v.ok ? C.success : C.muted, display:"flex", alignItems:"center", gap:6, marginBottom: i < validations.length-1 ? 4 : 0 }}>
                      <span>{v.ok ? "✓" : "○"}</span> {v.label}
                    </div>
                  ))}
                </div>
              )}
              {error && <div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:C.danger }}>⚠️ {error}</div>}
              <BtnPrimario disabled={!allValid || loading} onClick={handleSubmit}>{loading ? "Guardando..." : "Actualizar contraseña"}</BtnPrimario>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NUEVA VISITA — 4 PASOS
// ══════════════════════════════════════════════════════════════════
function NuevaVisita(props) {
  const { paso, setPaso, medicos, medicoSeleccionado, setMedicoSeleccionado, consultorio, setConsultorio, horaLlegada, setHoraLlegada, canalContacto, setCanalContacto, resultado, setResultado, espera, setEspera, producto, setProducto, novedadCat, setNovedadCat, nota, setNota, proxVisita, setProxVisita, nivelInteres, setNivelInteres, pacientesEnSala, setPacientesEnSala, horaInicioAtencion, setHoraInicioAtencion, enviando, onEnviar } = props;
  if (paso === 1) return <PasoMedico medicos={medicos} seleccionado={medicoSeleccionado} onSeleccionar={setMedicoSeleccionado} onSiguiente={()=>setPaso(2)} />;
  if (paso === 2) return <PasoLugar medico={medicoSeleccionado} consultorio={consultorio} setConsultorio={setConsultorio} horaLlegada={horaLlegada} setHoraLlegada={setHoraLlegada} canalContacto={canalContacto} setCanalContacto={setCanalContacto} onAtras={()=>setPaso(1)} onSiguiente={()=>setPaso(3)} />;
  if (paso === 3) return <PasoResultado resultado={resultado} setResultado={setResultado} espera={espera} setEspera={setEspera} producto={producto} setProducto={setProducto} novedadCat={novedadCat} setNovedadCat={setNovedadCat} nota={nota} setNota={setNota} proxVisita={proxVisita} setProxVisita={setProxVisita} nivelInteres={nivelInteres} setNivelInteres={setNivelInteres} pacientesEnSala={pacientesEnSala} setPacientesEnSala={setPacientesEnSala} horaInicioAtencion={horaInicioAtencion} setHoraInicioAtencion={setHoraInicioAtencion} onAtras={()=>setPaso(2)} onSiguiente={()=>setPaso(4)} />;
  if (paso === 4) return <PasoConfirmacion medico={medicoSeleccionado} consultorio={consultorio} horaLlegada={horaLlegada} canalContacto={canalContacto} resultado={resultado} espera={espera} producto={producto} novedadCat={novedadCat} nota={nota} proxVisita={proxVisita} nivelInteres={nivelInteres} pacientesEnSala={pacientesEnSala} horaInicioAtencion={horaInicioAtencion} enviando={enviando} onAtras={()=>setPaso(3)} onEnviar={onEnviar} />;
  return null;
}

// ── PASO 1: MÉDICO ───────────────────────────────────────────────
function PasoMedico({ medicos, seleccionado, onSeleccionar, onSiguiente }) {
  const [buscar, setBuscar] = useState("");
  const filtrados = medicos.filter(m => m.nombre.toLowerCase().includes(buscar.toLowerCase()) || (m.especialidad || "").toLowerCase().includes(buscar.toLowerCase()));

  return (
    <div>
      <SectionTitle>Selecciona el médico</SectionTitle>
      <Input type="text" placeholder="Buscar por nombre o especialidad..." value={buscar} onChange={e => setBuscar(e.target.value)} style={{marginBottom:14}} />
      <div style={{maxHeight:380,overflowY:"auto",marginBottom:14}}>
        {filtrados.length === 0 && <div style={{textAlign:"center",padding:24,color:C.muted,fontSize:14}}>{medicos.length === 0 ? "Cargando médicos..." : "Sin resultados"}</div>}
        {filtrados.map(m => {
          const isSelected = seleccionado?.id === m.id;
          const sppPct = m.spp !== undefined ? (m.spp * 100).toFixed(0) : null;
          const sppColor = m.spp >= 0.7 ? C.success : m.spp >= 0.45 ? C.warn : C.danger;
          return (
            <div key={m.id} onClick={() => onSeleccionar(m)} style={{ background: isSelected ? `${C.primary}08` : C.white, border: `1.5px solid ${isSelected ? C.primary : C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:8, cursor:"pointer", transition:"all 0.15s", boxShadow: isSelected ? `0 0 0 3px ${C.primary}12` : C.shadow }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:15,fontWeight:500,color:C.textMain}}>{m.nombre}</div>
                  <div style={{fontSize:13,color:C.textSub,marginTop:2}}>{m.especialidad} · {m.zona}</div>
                </div>
                {sppPct !== null && <div style={{ background:`${sppColor}12`, border:`1px solid ${sppColor}30`, borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:600, color:sppColor, whiteSpace:"nowrap" }}>{sppPct}%</div>}
              </div>
              {m.total_visitas > 0 && <div style={{fontSize:11,color:C.muted,marginTop:6}}>{m.total_visitas} visitas · confianza {m.confianza}</div>}
            </div>
          );
        })}
      </div>
      <BtnPrimario disabled={!seleccionado} onClick={onSiguiente}>Continuar</BtnPrimario>
    </div>
  );
}

// ── PASO 2: LUGAR ────────────────────────────────────────────────
function PasoLugar({ medico, consultorio, setConsultorio, horaLlegada, setHoraLlegada, canalContacto, setCanalContacto, onAtras, onSiguiente }) {
  const canContinue = consultorio.trim() && horaLlegada;
  return (
    <div>
      <BtnAtras onClick={onAtras} />
      <SectionTitle>{medico.nombre}</SectionTitle>
      <p style={{fontSize:13,color:C.textSub,margin:"-8px 0 20px"}}>{medico.especialidad} · {medico.zona}</p>
      <div style={sectionStyle}>
        <label style={labelStyle}>Consultorio <Req /></label>
        {medico.consultorios?.length > 0 ? (
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:8}}>
            {medico.consultorios.map(c => (
              <button key={c} onClick={() => setConsultorio(c)} style={{ padding:"8px 14px", fontSize:13, fontFamily:fontStack, background:consultorio===c?`${C.primary}10`:C.white, border:`1.5px solid ${consultorio===c?C.primary:C.border}`, borderRadius:8, color:consultorio===c?C.primary:C.textSub, cursor:"pointer", transition:"all .15s" }}>{c}</button>
            ))}
          </div>
        ) : null}
        <Input type="text" value={consultorio} onChange={e => setConsultorio(e.target.value)} placeholder="Ej: Clínica El Rosario" />
      </div>
      <div style={sectionStyle}>
        <label style={labelStyle}>Hora de llegada <Req /></label>
        <Input type="time" value={horaLlegada} onChange={e => setHoraLlegada(e.target.value)} />
      </div>
      <div style={{marginBottom:20}}>
        <label style={labelStyle}>Canal de contacto previo</label>
        <div style={{display:"flex",gap:8}}>
          {CANALES.map(c => (
            <button key={c.id} onClick={() => setCanalContacto(c.id)} style={{ flex:1, padding:"10px 8px", fontSize:13, fontFamily:fontStack, background:canalContacto===c.id?`${C.primary}10`:C.white, border:`1.5px solid ${canalContacto===c.id?C.primary:C.border}`, borderRadius:10, color:canalContacto===c.id?C.primary:C.textSub, cursor:"pointer", transition:"all .15s", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <span style={{fontSize:16}}>{c.icon}</span><span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
      <BtnPrimario disabled={!canContinue} onClick={onSiguiente}>Continuar</BtnPrimario>
    </div>
  );
}

// ── PASO 3: RESULTADO ────────────────────────────────────────────
function PasoResultado({ resultado, setResultado, espera, setEspera, producto, setProducto, novedadCat, setNovedadCat, nota, setNota, proxVisita, setProxVisita, nivelInteres, setNivelInteres, pacientesEnSala, setPacientesEnSala, horaInicioAtencion, setHoraInicioAtencion, onAtras, onSiguiente }) {
  const esConMedico = resultado==="exitosa"||resultado==="retraso";
  const canSubmit = resultado !== null && (!esConMedico || nivelInteres !== null);

  return (
    <div>
      <BtnAtras onClick={onAtras} />
      <SectionTitle>¿Cómo fue la visita?</SectionTitle>

      <div style={sectionStyle}>
        <label style={labelStyle}>Resultado <Req /></label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
          {RESULTADOS.map(r => (
            <button key={r.id} onClick={() => setResultado(r.id)} style={{ padding:"14px 8px", fontSize:13, fontFamily:fontStack, background:resultado===r.id?`${r.color}10`:C.white, border:`1.5px solid ${resultado===r.id?r.color:C.border}`, borderRadius:10, color:resultado===r.id?r.color:C.textSub, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5, transition:"all .15s", boxShadow:resultado===r.id?`0 0 0 3px ${r.color}10`:"none" }}>
              <span style={{fontSize:22}}>{r.emoji}</span>
              <span style={{fontWeight:resultado===r.id?600:400}}>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {esConMedico && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Nivel de interés del médico <Req /></label>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            {NIVEL_INTERES.map(n => (
              <button key={n.val} onClick={() => setNivelInteres(n.val)} style={{ flex:1, background:nivelInteres===n.val?`${n.color}10`:C.white, border:`1.5px solid ${nivelInteres===n.val?n.color:C.border}`, borderRadius:10, padding:"10px 0", cursor:"pointer", fontFamily:fontStack, display:"flex", flexDirection:"column", alignItems:"center", gap:3, transition:"all .15s" }}>
                <span style={{fontSize:16,fontWeight:700,color:nivelInteres===n.val?n.color:C.muted}}>{n.val}</span>
                <div style={{width:nivelInteres===n.val?18:6,height:3,borderRadius:2,background:n.color,opacity:nivelInteres===n.val?1:0.3,transition:"all .2s"}}/>
              </button>
            ))}
          </div>
          {nivelInteres && (
            <div style={{ background:`${NIVEL_INTERES[nivelInteres-1].color}08`, border:`1px solid ${NIVEL_INTERES[nivelInteres-1].color}25`, borderRadius:10, padding:"8px 12px" }}>
              <span style={{fontSize:13,fontWeight:600,color:NIVEL_INTERES[nivelInteres-1].color}}>{NIVEL_INTERES[nivelInteres-1].label}</span>
              <span style={{fontSize:12,color:C.textSub,marginLeft:8}}>{NIVEL_INTERES[nivelInteres-1].desc}</span>
            </div>
          )}
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>Tiempo de espera</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {ESPERA_OPCIONES.map(e => (
            <button key={e.val} onClick={() => setEspera(espera===e.val?null:e.val)} style={{ padding:"8px 14px", fontSize:12, fontFamily:fontStack, background:espera===e.val?`${C.accent}10`:C.white, border:`1.5px solid ${espera===e.val?C.accent:C.border}`, borderRadius:8, color:espera===e.val?C.accent:C.textSub, cursor:"pointer", transition:"all .15s" }}>{e.label}</button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Pacientes en sala de espera</label>
        <div style={{display:"flex",gap:6}}>
          {[{val:"vacio",label:"Vacío"},{val:"1-3",label:"1-3"},{val:"4-6",label:"4-6"},{val:"lleno",label:"Lleno"}].map(op => (
            <button key={op.val} onClick={() => setPacientesEnSala(pacientesEnSala===op.val?null:op.val)} style={{ flex:1, padding:"9px 0", fontSize:13, fontFamily:fontStack, background:pacientesEnSala===op.val?`${C.accent}10`:C.white, border:`1.5px solid ${pacientesEnSala===op.val?C.accent:C.border}`, borderRadius:8, color:pacientesEnSala===op.val?C.accent:C.textSub, cursor:"pointer", transition:"all .15s" }}>{op.label}</button>
          ))}
        </div>
      </div>

      {esConMedico && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Hora inicio atención del médico</label>
          <Input type="time" value={horaInicioAtencion} onChange={e => setHoraInicioAtencion(e.target.value)} />
        </div>
      )}

      {esConMedico && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Producto presentado</label>
          <Input type="text" value={producto} onChange={e => setProducto(e.target.value)} placeholder="Ej: Amoxicilina 500mg" />
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>Novedades</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
          {NOVEDADES.map(n => (
            <button key={n.id} onClick={() => setNovedadCat(novedadCat===n.id?null:n.id)} style={{ padding:"8px 10px", fontSize:12, textAlign:"left", fontFamily:fontStack, background:novedadCat===n.id?`${C.warn}10`:C.white, border:`1.5px solid ${novedadCat===n.id?C.warn:C.border}`, borderRadius:8, color:novedadCat===n.id?C.warn:C.textSub, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all .15s" }}>
              <span style={{fontSize:16}}>{n.emoji}</span><span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Notas adicionales</label>
        <TextArea value={nota} onChange={e => setNota(e.target.value)} placeholder="Observaciones, comentarios del médico..." rows={3} />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Fecha próxima visita</label>
        <Input type="date" value={proxVisita} onChange={e => setProxVisita(e.target.value)} />
      </div>

      <BtnPrimario disabled={!canSubmit} onClick={onSiguiente}>Continuar</BtnPrimario>
    </div>
  );
}

// ── PASO 4: CONFIRMACIÓN ─────────────────────────────────────────
function PasoConfirmacion({ medico, consultorio, horaLlegada, canalContacto, resultado, espera, producto, novedadCat, nota, proxVisita, nivelInteres, pacientesEnSala, horaInicioAtencion, enviando, onAtras, onEnviar }) {
  const res = RESULTADOS.find(r=>r.id===resultado);
  const canalLabel = CANALES.find(c=>c.id===canalContacto)?.label || canalContacto;

  return (
    <div>
      <BtnAtras onClick={onAtras} />
      <SectionTitle>Confirmar visita</SectionTitle>

      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:16, boxShadow:C.shadow }}>
        <div style={{fontSize:16,fontWeight:600,color:C.textMain}}>{medico.nombre}</div>
        <div style={{fontSize:13,color:C.textSub,marginTop:2}}>{medico.especialidad} · {medico.zona}</div>

        <Divider />
        <ConfirmRow label="Consultorio" value={consultorio} />
        <ConfirmRow label="Hora llegada" value={horaLlegada} />
        <ConfirmRow label="Canal" value={canalLabel} />
        <Divider />

        <div style={{marginBottom:8}}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 14px", background:`${res.color}10`, border:`1px solid ${res.color}30`, borderRadius:8, fontSize:13, fontWeight:500, color:res.color }}>
            {res.emoji} {res.label}
          </div>
        </div>

        {nivelInteres && (() => {
          const ni = NIVEL_INTERES[nivelInteres-1];
          return (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:`${ni.color}08`, border:`1px solid ${ni.color}20`, borderRadius:10, padding:"8px 12px", marginBottom:8 }}>
              <span style={{fontSize:12,color:C.textSub}}>Nivel de interés</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{display:"flex",gap:3}}>
                  {[1,2,3,4,5].map(n => <div key={n} style={{width:7,height:7,borderRadius:"50%",background:n<=nivelInteres?ni.color:C.border}}/>)}
                </div>
                <span style={{fontSize:12,fontWeight:700,color:ni.color}}>{nivelInteres}/5 · {ni.label}</span>
              </div>
            </div>
          );
        })()}

        {espera !== null && espera !== undefined && <ConfirmRow label="Espera" value={ESPERA_OPCIONES.find(e=>e.val===espera)?.label || `${espera} min`} />}
        {pacientesEnSala && <ConfirmRow label="Pacientes en sala" value={pacientesEnSala} />}
        {horaInicioAtencion && <ConfirmRow label="Inicio atención" value={horaInicioAtencion} />}
        {producto && <ConfirmRow label="Producto" value={producto} />}
        {novedadCat && <ConfirmRow label="Novedad" value={`${novEmoji(novedadCat)} ${novLabel(novedadCat)}`} />}
        {nota && (
          <div style={{marginTop:10}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:3}}>Notas</div>
            <div style={{ fontSize:13, color:C.textSub, lineHeight:1.5, background:C.section, borderRadius:8, padding:"8px 12px", borderLeft:`3px solid ${C.accent}` }}>{nota}</div>
          </div>
        )}
        {proxVisita && <ConfirmRow label="Próxima visita" value={proxVisita} />}
      </div>

      <button disabled={enviando} onClick={onEnviar} style={{ width:"100%", padding:14, fontSize:16, fontWeight:700, fontFamily:fontStack, letterSpacing:"0.01em", background:enviando?C.muted:C.gradientPrimary, color:C.white, border:"none", borderRadius:12, cursor:enviando?"not-allowed":"pointer", boxShadow:enviando?"none":"0 4px 14px rgba(15,118,110,0.35)", transition:"all .2s" }}>
        {enviando ? "Guardando..." : "✅ Guardar visita"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════════════════════════
function Historial({ historial, stats }) {
  if (!stats) return <div style={{color:C.muted,textAlign:"center",padding:24}}>Cargando historial...</div>;

  return (
    <div>
      <SectionTitle>Tu historial</SectionTitle>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
        <StatCard label="Visitas" value={stats.total_visitas} color={C.primary} />
        <StatCard label="Exitosas" value={stats.visitas_exitosas} color={C.success} />
        <StatCard label="Tasa éxito" value={`${(stats.tasa_exito*100).toFixed(0)}%`} color={C.accent} />
      </div>

      {historial.length === 0 && <div style={{textAlign:"center",padding:30,color:C.muted,fontSize:14}}>Aún no tienes visitas registradas</div>}

      {historial.map(h => {
        const res = RESULTADOS.find(r=>r.id===h.resultado);
        if (!res) return null;
        return (
          <div key={h.id} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:8, boxShadow:C.shadow }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:14,fontWeight:500,color:C.textMain}}>{h.medico_nombre}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{h.consultorio} · {h.fecha}</div>
              </div>
              <div style={{ padding:"4px 10px", background:`${res.color}10`, border:`1px solid ${res.color}25`, borderRadius:8, fontSize:11, fontWeight:600, color:res.color, whiteSpace:"nowrap" }}>
                {res.emoji} {res.label}
              </div>
            </div>
            {h.nivel_interes && (
              <div style={{marginTop:8,display:"flex",alignItems:"center",gap:4}}>
                {[1,2,3,4,5].map(n => <div key={n} style={{width:6,height:6,borderRadius:"50%",background:n<=h.nivel_interes?NIVEL_INTERES[h.nivel_interes-1].color:C.border}}/>)}
                <span style={{fontSize:10,color:NIVEL_INTERES[h.nivel_interes-1].color,fontWeight:600}}>{h.nivel_interes}/5</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
function Dashboard({ historial, stats }) {
  const datosResultados = useMemo(() => {
    const conteo = {};
    RESULTADOS.forEach(r => { conteo[r.id] = 0; });
    historial.forEach(h => { if (conteo[h.resultado] !== undefined) conteo[h.resultado]++; });
    return RESULTADOS.map(r => ({ name:r.label.replace("Visita ",""), valor:conteo[r.id], color:r.color }));
  }, [historial]);

  const datosResultadoPie = useMemo(() => datosResultados.filter(d => d.valor > 0), [datosResultados]);

  const datosPorDia = useMemo(() => {
    const porDia = {};
    historial.forEach(h => {
      const f = h.fecha || "Sin fecha";
      if (!porDia[f]) porDia[f] = { fecha:f, total:0, exitosas:0 };
      porDia[f].total++;
      if (h.resultado === "exitosa") porDia[f].exitosas++;
    });
    return Object.values(porDia).sort((a,b) => a.fecha.localeCompare(b.fecha));
  }, [historial]);

  const datosInteres = useMemo(() => {
    const conteo = [0,0,0,0,0];
    historial.forEach(h => { if (h.nivel_interes >= 1 && h.nivel_interes <= 5) conteo[h.nivel_interes-1]++; });
    return NIVEL_INTERES.map((n,i) => ({ name:n.label, valor:conteo[i], color:n.color }));
  }, [historial]);

  const datosPorMedico = useMemo(() => {
    const pm = {};
    historial.forEach(h => {
      const nom = h.medico_nombre || "Desconocido";
      if (!pm[nom]) pm[nom] = { name:nom, total:0, efectivas:0 };
      pm[nom].total++;
      if (h.resultado === "exitosa" || h.resultado === "retraso") pm[nom].efectivas++;
    });
    return Object.values(pm).sort((a,b) => b.total - a.total).slice(0,10);
  }, [historial]);

  if (!stats) return <div style={{color:C.muted,textAlign:"center",padding:24}}>Cargando dashboard...</div>;

  if (historial.length === 0) {
    return (
      <div style={{textAlign:"center",padding:40,color:C.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>📊</div>
        <div style={{fontSize:16,fontWeight:500}}>Aún no hay datos para mostrar</div>
        <div style={{fontSize:13,marginTop:6}}>Registra visitas para ver tus estadísticas</div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Dashboard</SectionTitle>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
        <StatCard label="Total visitas" value={stats.total_visitas} color={C.primary} />
        <StatCard label="Tasa de éxito" value={`${(stats.tasa_exito*100).toFixed(0)}%`} color={C.success} />
        <StatCard label="Interés promedio" value={stats.nivel_interes_promedio?.toFixed(1) || "—"} color={C.accent} />
        <StatCard label="Espera promedio" value={stats.tiempo_espera_promedio ? `${Math.round(stats.tiempo_espera_promedio)} min` : "—"} color={C.warn} />
      </div>

      <ChartCard title="Resultados por tipo">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={datosResultados} margin={{top:5,right:10,left:-15,bottom:5}}>
            <XAxis dataKey="name" tick={{fill:C.textSub,fontSize:11}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.primary}08`}} />
            <Bar dataKey="valor" name="Visitas" radius={[6,6,0,0]}>
              {datosResultados.map((d,i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {datosResultadoPie.length > 0 && (
        <ChartCard title="Distribución de resultados">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={datosResultadoPie} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                {datosResultadoPie.map((d,i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip/>} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center",marginTop:4}}>
            {datosResultadoPie.map(d => (
              <div key={d.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textSub}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:d.color}} /> {d.name} ({d.valor})
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {datosPorDia.length > 1 && (
        <ChartCard title="Visitas por día">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={datosPorDia} margin={{top:5,right:10,left:-15,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="fecha" tick={{fill:C.textSub,fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip/>} />
              <Line type="monotone" dataKey="total" name="Total" stroke={C.primary} strokeWidth={2} dot={{fill:C.primary,r:3}} />
              <Line type="monotone" dataKey="exitosas" name="Exitosas" stroke={C.success} strokeWidth={2} dot={{fill:C.success,r:3}} />
            </LineChart>
          </ResponsiveContainer>
          <ChartLegend items={[{color:C.primary,label:"Total"},{color:C.success,label:"Exitosas"}]} />
        </ChartCard>
      )}

      {datosInteres.some(d => d.valor > 0) && (
        <ChartCard title="Distribución nivel de interés">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosInteres} margin={{top:5,right:10,left:-15,bottom:5}}>
              <XAxis dataKey="name" tick={{fill:C.textSub,fontSize:10}} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.primary}08`}} />
              <Bar dataKey="valor" name="Visitas" radius={[6,6,0,0]}>
                {datosInteres.map((d,i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {datosPorMedico.length > 0 && (
        <ChartCard title="Visitas por médico">
          <ResponsiveContainer width="100%" height={Math.max(150, datosPorMedico.length * 45)}>
            <BarChart data={datosPorMedico} layout="vertical" margin={{top:5,right:10,left:10,bottom:5}}>
              <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{fill:C.textSub,fontSize:11}} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.primary}08`}} />
              <Bar dataKey="total" name="Total" fill={C.primary} radius={[0,6,6,0]} barSize={14} />
              <Bar dataKey="efectivas" name="Efectivas" fill={C.success} radius={[0,6,6,0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{color:C.primary,label:"Total"},{color:C.success,label:"Efectivas"}]} />
        </ChartCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTES REUTILIZABLES
// ══════════════════════════════════════════════════════════════════
function SectionTitle({ children }) {
  return <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px",color:C.textMain,letterSpacing:"-0.01em"}}>{children}</h2>;
}

function StatCard({ label, value, color = C.primary }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 12px", textAlign:"center", boxShadow:C.shadow }}>
      <div style={{fontSize:22,fontWeight:700,color,letterSpacing:"-0.02em"}}>{value}</div>
      <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:500,letterSpacing:"0.02em"}}>{label}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 12px", marginBottom:14, boxShadow:C.shadow }}>
      <div style={{fontSize:14,fontWeight:600,color:C.textMain,marginBottom:12,paddingLeft:4}}>{title}</div>
      {children}
    </div>
  );
}

function ChartLegend({ items }) {
  return (
    <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:8}}>
      {items.map(i => (
        <div key={i.label} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.textSub}}>
          <div style={{width:12,height:3,borderRadius:2,background:i.color}} /> {i.label}
        </div>
      ))}
    </div>
  );
}

function BtnAtras({ onClick }) {
  return (
    <button onClick={onClick} style={{ background:"none",border:"none",color:C.primary, fontSize:14,cursor:"pointer",marginBottom:12,padding:0, fontFamily:fontStack,fontWeight:500 }}>
      ← Atrás
    </button>
  );
}

function BtnPrimario({ disabled, onClick, children }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      width:"100%",padding:13,fontSize:15,fontWeight:600,
      fontFamily:fontStack,letterSpacing:"0.01em",
      background:disabled?C.muted:C.gradientPrimary,
      color:disabled?C.textSub:C.white,
      border:"none",borderRadius:12,
      cursor:disabled?"not-allowed":"pointer",
      boxShadow:disabled?"none":"0 4px 14px rgba(15,118,110,0.3)",
      transition:"all .2s", marginTop:4,
    }}>
      {children}
    </button>
  );
}

function Req() {
  return <span style={{color:C.danger,marginLeft:2}}>*</span>;
}

function Divider() {
  return <div style={{borderTop:`1px solid ${C.border}`,margin:"10px 0"}} />;
}

function ConfirmRow({ label, value }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
      <span style={{fontSize:12,color:C.muted}}>{label}</span>
      <span style={{fontSize:13,color:C.textMain,fontWeight:500}}>{value}</span>
    </div>
  );
}
