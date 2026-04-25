import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';

// ── CONFIGURACIÓN API ─────────────────────────────────────────────
const API_URL = "https://sidm-production.up.railway.app/api/v1";

// ── COLORES ───────────────────────────────────────────────────────
const C = {
  bg:       "#0A0E1A",
  card:     "#1A2235",
  border:   "#243048",
  accent:   "#00C87A",
  accent2:  "#00A8E8",
  warn:     "#FFAA00",
  danger:   "#FF4060",
  white:    "#FFFFFF",
  textSub:  "#8B9BB4",
  muted:    "#5A6B88",
};

// ── DATA MOCK (se reemplaza con API real) ─────────────────────────
const RESULTADOS = [
  { id:"exitosa",        label:"Visita exitosa",    emoji:"✅", color:C.accent  },
  { id:"retraso",        label:"Con retraso",       emoji:"⏱", color:C.warn    },
  { id:"medico_ausente", label:"Médico ausente",    emoji:"❌", color:C.danger  },
  { id:"agenda_cerrada", label:"Agenda cerrada",    emoji:"🔒", color:C.danger  },
  { id:"reagendada",     label:"Reagendada",        emoji:"📅", color:C.accent2 },
];

const CANALES = [
  { id:"sin_aviso", label:"Sin aviso previo" },
  { id:"whatsapp",  label:"WhatsApp"         },
  { id:"llamada",   label:"Llamada"          },
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
  { val:1, label:"Sin interés",     desc:"No escuchó, cortó la visita",               color:C.danger  },
  { val:2, label:"Escuchó apenas",  desc:"Atendió por compromiso, sin engagement",     color:"#FF8C42" },
  { val:3, label:"Interés normal",  desc:"Escuchó y hizo preguntas básicas",           color:C.warn    },
  { val:4, label:"Interés alto",    desc:"Pidió más información o muestras",           color:"#8BC34A" },
  { val:5, label:"Muy interesado",  desc:"Solicitó seguimiento o preguntó prescripción", color:C.accent},
];

const ESPERA_OPCIONES = [
  { val: 0,  label: "Sin espera" },
  { val: 5,  label: "~5 min" },
  { val: 15, label: "~15 min" },
  { val: 30, label: "~30 min" },
  { val: 45, label: "~45 min" },
  { val: 60, label: "60+ min" },
];

// ── HELPERS ───────────────────────────────────────────────────────
const novEmoji = (id) => NOVEDADES.find(n=>n.id===id)?.emoji || "📌";
const novLabel = (id) => NOVEDADES.find(n=>n.id===id)?.label || id;

// ── ESTILOS REUTILIZABLES ─────────────────────────────────────────
const inputStyle = {
  width:"100%",padding:"10px 12px",fontSize:14,
  background:C.card,border:`1px solid ${C.border}`,
  borderRadius:8,color:C.white,outline:"none",
  boxSizing:"border-box",
};

const labelStyle = {
  display:"block",fontSize:13,color:C.textSub,marginBottom:6,
};

const sectionStyle = {
  marginBottom: 14,
};

// ── TOOLTIP RECHARTS ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:8,padding:"8px 12px",fontSize:12,
    }}>
      <div style={{color:C.white,fontWeight:600,marginBottom:4}}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color||C.accent}}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("sidm_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => { 
        localStorage.removeItem("sidm_token"); 
        setToken(null); 
        setLoading(false); 
      });
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("sidm_token");
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight:"100vh",background:C.bg,display:"flex",
        alignItems:"center",justifyContent:"center",color:C.white,
        fontFamily:"'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:28,fontWeight:700,color:C.accent,marginBottom:8}}>SIDM</div>
          <div style={{fontSize:14,color:C.textSub}}>Cargando...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return <PantallaLogin onLogin={setToken} />;
  }

  return <AppPrincipal user={user} onLogout={handleLogout} />;
}

// ══════════════════════════════════════════════════════════════════
// PANTALLA DE LOGIN
// ══════════════════════════════════════════════════════════════════
function PantallaLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error de autenticación");
      }

      const data = await res.json();
      localStorage.setItem("sidm_token", data.access_token);
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh",background:C.bg,display:"flex",
      alignItems:"center",justifyContent:"center",padding:"20px",
      fontFamily:"'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background:C.card,border:`1px solid ${C.border}`,
        borderRadius:16,padding:"32px",width:"100%",maxWidth:400,
        boxShadow:"0 10px 40px rgba(0,0,0,0.3)"
      }}>
        <h1 style={{
          fontSize:32,fontWeight:700,color:C.accent,
          margin:"0 0 8px",textAlign:"center"
        }}>SIDM</h1>
        <p style={{
          fontSize:14,color:C.textSub,margin:"0 0 24px",textAlign:"center"
        }}>Sistema de Inteligencia de Disponibilidad Médica</p>

        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:16}}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="visitador@inbiotech.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{marginBottom:20}}>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background:"#FF406015",border:`1px solid ${C.danger}`,
              borderRadius:8,padding:"10px 12px",marginBottom:16,
              fontSize:13,color:C.danger
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              width:"100%",padding:"12px",fontSize:15,fontWeight:600,
              background:cargando ? C.muted : C.accent,
              color:cargando ? C.textSub : C.bg,
              border:"none",borderRadius:8,cursor:cargando ? "not-allowed" : "pointer"
            }}
          >
            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        <p style={{
          fontSize:12,color:C.muted,marginTop:20,textAlign:"center"
        }}>
          Piloto Inbiotech · MVP 2025
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// APP PRINCIPAL (después del login)
// ══════════════════════════════════════════════════════════════════
function AppPrincipal({ user, onLogout }) {
  const [tab, setTab] = useState("nueva");
  const [paso, setPaso] = useState(1);
  const [medicos, setMedicos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [stats, setStats] = useState(null);

  // Estado del reporte de visita
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

  const token = localStorage.getItem("sidm_token");

  // Cargar médicos al montar
  useEffect(() => {
    if (tab === "nueva") cargarMedicos();
    if (tab === "historial" || tab === "dashboard") cargarHistorial();
  }, [tab]);

  const cargarMedicos = async () => {
    try {
      const res = await fetch(`${API_URL}/medicos`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setMedicos(data);
    } catch (err) {
      console.error("Error cargando médicos:", err);
    }
  };

  const cargarHistorial = async () => {
    try {
      const [resH, resS] = await Promise.all([
        fetch(`${API_URL}/visitas/historial?limite=50`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${API_URL}/visitas/stats`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);
      const dataH = await resH.json();
      const dataS = await resS.json();
      setHistorial(dataH);
      setStats(dataS);
    } catch (err) {
      console.error("Error cargando historial:", err);
    }
  };

  const resetFormulario = () => {
    setPaso(1);
    setMedicoSeleccionado(null);
    setConsultorio("");
    setHoraLlegada("");
    setCanalContacto("sin_aviso");
    setResultado(null);
    setEspera(null);
    setProducto("");
    setNovedadCat(null);
    setNota("");
    setProxVisita("");
    setNivelInteres(null);
    setPacientesEnSala(null);
    setHoraInicioAtencion("");
  };

  const handleEnviarVisita = async () => {
    if (!medicoSeleccionado?.id) {
      alert("⚠️ Debes seleccionar un médico");
      return;
    }
    if (!consultorio.trim()) {
      alert("⚠️ Debes indicar el consultorio");
      return;
    }
    if (!horaLlegada) {
      alert("⚠️ Debes indicar la hora de llegada");
      return;
    }
    if (!resultado) {
      alert("⚠️ Debes seleccionar el resultado de la visita");
      return;
    }
    if ((resultado === "exitosa" || resultado === "retraso") && !nivelInteres) {
      alert("⚠️ Debes indicar el nivel de interés del médico");
      return;
    }

    const nombreMedico = medicoSeleccionado.nombre;
    const resultadoLabel = RESULTADOS.find(r => r.id === resultado)?.label;
    const confirmacion = window.confirm(
      `¿Confirmar envío de visita?\n\n${nombreMedico}\n${consultorio} - ${horaLlegada}\nResultado: ${resultadoLabel}`
    );
    
    if (!confirmacion) return;

    setEnviando(true);
    try {
      const visitaData = {
        medico_id: medicoSeleccionado.id,
        consultorio: consultorio.trim(),
        hora_llegada: horaLlegada || null,
        canal_contacto: canalContacto,
        resultado,
        tiempo_espera: espera,
        producto: producto.trim() || null,
        novedad_categoria: novedadCat || null,
        nota: nota.trim() || null,
        prox_visita: proxVisita || null,
        nivel_interes: nivelInteres || null,
        pacientes_en_sala: pacientesEnSala,
        hora_inicio_atencion: horaInicioAtencion || null,
      };

      const res = await fetch(`${API_URL}/visitas`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(visitaData)
      });

      if (!res.ok) {
        let errorMsg = "Error guardando visita";
        try {
          const errorData = await res.json();
          errorMsg = errorData.detail || errorData.message || errorMsg;
        } catch {}
        throw new Error(`${res.status}: ${errorMsg}`);
      }

      const data = await res.json();
      alert(`✅ Visita guardada exitosamente (ID: ${data.id || 'confirmado'})`);
      resetFormulario();
      setTab("historial");
    } catch (err) {
      console.error("Error en handleEnviarVisita:", err);
      alert(`❌ Error: ${err.message}\n\nLos datos se mantienen. Intenta nuevamente.`);
    } finally {
      setEnviando(false);
    }
  };

  // ── RENDER DE APP PRINCIPAL ──────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh",background:C.bg,color:C.white,
      fontFamily:"'Segoe UI', system-ui, sans-serif",
    }}>
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{
        background:C.card,borderBottom:`1px solid ${C.border}`,
        padding:"12px 16px",display:"flex",
        alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:10,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20,fontWeight:700,color:C.accent}}>SIDM</span>
          {user && (
            <span style={{fontSize:13,color:C.textSub}}>
              {user.nombre || user.email}
            </span>
          )}
        </div>
        <button onClick={onLogout} style={{
          background:"none",border:`1px solid ${C.border}`,
          borderRadius:6,padding:"6px 12px",fontSize:12,
          color:C.textSub,cursor:"pointer",
        }}>
          Salir
        </button>
      </div>

      {/* ── TABS ───────────────────────────────────────────────── */}
      <div style={{
        display:"flex",background:C.card,
        borderBottom:`1px solid ${C.border}`,
      }}>
        <TabButton active={tab==="nueva"} onClick={() => { setTab("nueva"); }}>
          + Nueva visita
        </TabButton>
        <TabButton active={tab==="historial"} onClick={() => { setTab("historial"); }}>
          Historial
        </TabButton>
        <TabButton active={tab==="dashboard"} onClick={() => { setTab("dashboard"); }}>
          Dashboard
        </TabButton>
      </div>

      {/* ── CONTENIDO ──────────────────────────────────────────── */}
      <div style={{padding:"16px",maxWidth:600,margin:"0 auto"}}>
        {tab === "nueva" && (
          <>
            {/* Indicador de paso */}
            <div style={{
              display:"flex",alignItems:"center",gap:6,
              marginBottom:16,
            }}>
              {[1,2,3,4].map(p => (
                <div key={p} style={{display:"flex",alignItems:"center",gap:6,flex: p<4?1:"none"}}>
                  <div style={{
                    width:28,height:28,borderRadius:"50%",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:13,fontWeight:600,
                    background: p < paso ? C.accent : p === paso ? `${C.accent}25` : C.card,
                    color: p < paso ? C.bg : p === paso ? C.accent : C.muted,
                    border: p === paso ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
                    transition:"all .2s",
                  }}>
                    {p < paso ? "✓" : p}
                  </div>
                  {p < 4 && (
                    <div style={{
                      flex:1,height:2,
                      background: p < paso ? C.accent : C.border,
                      borderRadius:1,transition:"all .2s",
                    }}/>
                  )}
                </div>
              ))}
            </div>

            <NuevaVisita
              paso={paso} setPaso={setPaso}
              medicos={medicos}
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
              enviando={enviando}
              onEnviar={handleEnviarVisita}
            />
          </>
        )}

        {tab === "historial" && (
          <Historial historial={historial} stats={stats} />
        )}

        {tab === "dashboard" && (
          <Dashboard historial={historial} stats={stats} />
        )}
      </div>
    </div>
  );
}

// ── TAB BUTTON ────────────────────────────────────────────────────
function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      flex:1,padding:"12px",fontSize:14,fontWeight:active?600:400,
      background:active?C.bg:C.card,color:active?C.accent:C.textSub,
      border:"none",borderBottom:active?`2px solid ${C.accent}`:"2px solid transparent",
      cursor:"pointer",transition:"all .2s"
    }}>
      {children}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════
// NUEVA VISITA (4 pasos)
// ══════════════════════════════════════════════════════════════════
function NuevaVisita(props) {
  const {
    paso, setPaso, medicos, medicoSeleccionado, setMedicoSeleccionado,
    consultorio, setConsultorio, horaLlegada, setHoraLlegada,
    canalContacto, setCanalContacto, resultado, setResultado,
    espera, setEspera, producto, setProducto, novedadCat, setNovedadCat,
    nota, setNota, proxVisita, setProxVisita, nivelInteres, setNivelInteres,
    pacientesEnSala, setPacientesEnSala,
    horaInicioAtencion, setHoraInicioAtencion,
    enviando, onEnviar
  } = props;

  if (paso === 1) {
    return (
      <PasoMedico
        medicos={medicos}
        seleccionado={medicoSeleccionado}
        onSeleccionar={setMedicoSeleccionado}
        onSiguiente={() => setPaso(2)}
      />
    );
  }

  if (paso === 2) {
    return (
      <PasoLugar
        medico={medicoSeleccionado}
        consultorio={consultorio}
        setConsultorio={setConsultorio}
        horaLlegada={horaLlegada}
        setHoraLlegada={setHoraLlegada}
        canalContacto={canalContacto}
        setCanalContacto={setCanalContacto}
        onAtras={() => setPaso(1)}
        onSiguiente={() => setPaso(3)}
      />
    );
  }

  if (paso === 3) {
    return (
      <PasoResultado
        resultado={resultado} setResultado={setResultado}
        espera={espera} setEspera={setEspera}
        producto={producto} setProducto={setProducto}
        novedadCat={novedadCat} setNovedadCat={setNovedadCat}
        nota={nota} setNota={setNota}
        proxVisita={proxVisita} setProxVisita={setProxVisita}
        nivelInteres={nivelInteres} setNivelInteres={setNivelInteres}
        pacientesEnSala={pacientesEnSala} setPacientesEnSala={setPacientesEnSala}
        horaInicioAtencion={horaInicioAtencion} setHoraInicioAtencion={setHoraInicioAtencion}
        onAtras={() => setPaso(2)}
        onSiguiente={() => setPaso(4)}
      />
    );
  }

  if (paso === 4) {
    return (
      <PasoConfirmacion
        medico={medicoSeleccionado}
        consultorio={consultorio}
        horaLlegada={horaLlegada}
        canalContacto={canalContacto}
        resultado={resultado}
        espera={espera}
        producto={producto}
        novedadCat={novedadCat}
        nota={nota}
        proxVisita={proxVisita}
        nivelInteres={nivelInteres}
        pacientesEnSala={pacientesEnSala}
        horaInicioAtencion={horaInicioAtencion}
        enviando={enviando}
        onAtras={() => setPaso(3)}
        onEnviar={onEnviar}
      />
    );
  }

  return null;
}

// ── PASO 1: SELECCIONAR MÉDICO ────────────────────────────────────
function PasoMedico({ medicos, seleccionado, onSeleccionar, onSiguiente }) {
  const [buscar, setBuscar] = useState("");

  const filtrados = medicos.filter(m =>
    m.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    (m.especialidad || "").toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px"}}>
        Selecciona el médico
      </h2>

      <input
        type="text"
        placeholder="Buscar por nombre o especialidad..."
        value={buscar}
        onChange={e => setBuscar(e.target.value)}
        style={{...inputStyle, marginBottom:16}}
      />

      <div style={{marginBottom:16,maxHeight:400,overflowY:"auto"}}>
        {filtrados.length === 0 && (
          <div style={{textAlign:"center",padding:20,color:C.textSub,fontSize:14}}>
            {medicos.length === 0 ? "Cargando médicos..." : "Sin resultados"}
          </div>
        )}
        {filtrados.map(m => (
          <div
            key={m.id}
            onClick={() => onSeleccionar(m)}
            style={{
              background:seleccionado?.id===m.id?`${C.accent}15`:C.card,
              border:`1px solid ${seleccionado?.id===m.id?C.accent:C.border}`,
              borderRadius:8,padding:12,marginBottom:8,cursor:"pointer",
              transition:"all .15s",
            }}
          >
            <div style={{fontSize:15,fontWeight:500,color:C.white}}>{m.nombre}</div>
            <div style={{fontSize:13,color:C.textSub,marginTop:2}}>
              {m.especialidad} · {m.zona}
            </div>
            {m.spp !== undefined && (
              <div style={{fontSize:12,color:C.accent,marginTop:4}}>
                SPP: {(m.spp * 100).toFixed(0)}% · {m.confianza}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        disabled={!seleccionado}
        onClick={onSiguiente}
        style={{
          width:"100%",padding:12,fontSize:15,fontWeight:600,
          background:seleccionado?C.accent:C.muted,
          color:seleccionado?C.bg:C.textSub,
          border:"none",borderRadius:8,
          cursor:seleccionado?"pointer":"not-allowed"
        }}
      >
        Continuar
      </button>
    </div>
  );
}

// ── PASO 2: LUGAR ─────────────────────────────────────────────────
function PasoLugar({
  medico, consultorio, setConsultorio, horaLlegada, setHoraLlegada,
  canalContacto, setCanalContacto, onAtras, onSiguiente
}) {
  const canContinue = consultorio.trim() && horaLlegada;

  return (
    <div>
      <BtnAtras onClick={onAtras} />

      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 8px"}}>
        {medico.nombre}
      </h2>
      <p style={{fontSize:13,color:C.textSub,margin:"0 0 16px"}}>
        {medico.especialidad} · {medico.zona}
      </p>

      <div style={sectionStyle}>
        <label style={labelStyle}>
          Consultorio <Req />
        </label>
        <input
          type="text"
          value={consultorio}
          onChange={e => setConsultorio(e.target.value)}
          placeholder="Ej: Sura Laureles"
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>
          Hora de llegada <Req />
        </label>
        <input
          type="time"
          value={horaLlegada}
          onChange={e => setHoraLlegada(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{marginBottom:16}}>
        <label style={labelStyle}>Canal de contacto previo</label>
        <div style={{display:"flex",gap:8}}>
          {CANALES.map(c => (
            <button
              key={c.id}
              onClick={() => setCanalContacto(c.id)}
              style={{
                flex:1,padding:10,fontSize:13,
                background:canalContacto===c.id?`${C.accent}25`:C.card,
                border:`1px solid ${canalContacto===c.id?C.accent:C.border}`,
                borderRadius:8,color:canalContacto===c.id?C.accent:C.textSub,
                cursor:"pointer",transition:"all .15s",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <BtnContinuar disabled={!canContinue} onClick={onSiguiente} />
    </div>
  );
}

// ── PASO 3: RESULTADO (COMPLETO) ──────────────────────────────────
function PasoResultado({
  resultado, setResultado, espera, setEspera, producto, setProducto,
  novedadCat, setNovedadCat, nota, setNota, proxVisita, setProxVisita,
  nivelInteres, setNivelInteres,
  pacientesEnSala, setPacientesEnSala,
  horaInicioAtencion, setHoraInicioAtencion,
  onAtras, onSiguiente
}) {
  const esVisitaConMedico = resultado==="exitosa"||resultado==="retraso";
  const canSubmit = resultado !== null && (!esVisitaConMedico || nivelInteres !== null);

  return (
    <div>
      <BtnAtras onClick={onAtras} />

      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px"}}>
        ¿Cómo fue la visita?
      </h2>

      {/* ── Resultado ───────────────────────────────────────── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Resultado <Req /></label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
          {RESULTADOS.map(r => (
            <button
              key={r.id}
              onClick={() => setResultado(r.id)}
              style={{
                padding:"12px 8px",fontSize:13,
                background:resultado===r.id?`${r.color}15`:C.card,
                border:`1.5px solid ${resultado===r.id?r.color:C.border}`,
                borderRadius:8,color:resultado===r.id?r.color:C.textSub,
                cursor:"pointer",display:"flex",flexDirection:"column",
                alignItems:"center",gap:4,transition:"all .15s",
              }}
            >
              <span style={{fontSize:20}}>{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Nivel de interés (solo si vio al médico) ────────── */}
      {esVisitaConMedico && (
        <div style={sectionStyle}>
          <label style={labelStyle}>
            Nivel de interés del médico <Req />
          </label>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            {NIVEL_INTERES.map(n=>(
              <button key={n.val} onClick={()=>setNivelInteres(n.val)}
                style={{
                  flex:1,background:nivelInteres===n.val?`${n.color}25`:C.card,
                  border:`1.5px solid ${nivelInteres===n.val?n.color:C.border}`,
                  borderRadius:10,padding:"10px 0",cursor:"pointer",
                  display:"flex",flexDirection:"column",
                  alignItems:"center",gap:3,transition:"all .15s",
                }}>
                <span style={{
                  fontSize:16,fontWeight:700,
                  color:nivelInteres===n.val?n.color:C.textSub,
                }}>{n.val}</span>
                <div style={{
                  width:nivelInteres===n.val?20:6,height:4,
                  borderRadius:2,background:n.color,
                  opacity:nivelInteres===n.val?1:0.3,
                  transition:"all .2s",
                }}/>
              </button>
            ))}
          </div>
          {nivelInteres && (
            <div style={{
              background:`${NIVEL_INTERES[nivelInteres-1].color}15`,
              border:`1px solid ${NIVEL_INTERES[nivelInteres-1].color}40`,
              borderRadius:9,padding:"7px 12px",
            }}>
              <span style={{fontSize:12,fontWeight:600,color:NIVEL_INTERES[nivelInteres-1].color}}>
                {NIVEL_INTERES[nivelInteres-1].label}
              </span>
              <span style={{fontSize:11,color:C.textSub,marginLeft:8}}>
                {NIVEL_INTERES[nivelInteres-1].desc}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Tiempo de espera ────────────────────────────────── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Tiempo de espera</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {ESPERA_OPCIONES.map(e => (
            <button
              key={e.val}
              onClick={() => setEspera(espera === e.val ? null : e.val)}
              style={{
                padding:"8px 12px",fontSize:12,
                background:espera===e.val?`${C.accent2}25`:C.card,
                border:`1px solid ${espera===e.val?C.accent2:C.border}`,
                borderRadius:6,color:espera===e.val?C.accent2:C.textSub,
                cursor:"pointer",transition:"all .15s",
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pacientes en sala ───────────────────────────────── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Pacientes en sala de espera</label>
        <div style={{display:"flex",gap:6}}>
          {[
            { val:"vacio", label:"Vacío" },
            { val:"1-3",   label:"1-3" },
            { val:"4-6",   label:"4-6" },
            { val:"lleno", label:"Lleno" },
          ].map(op => (
            <button
              key={op.val}
              onClick={() => setPacientesEnSala(pacientesEnSala === op.val ? null : op.val)}
              style={{
                flex:1,padding:"8px 0",fontSize:13,
                background:pacientesEnSala===op.val?`${C.accent2}25`:C.card,
                border:`1px solid ${pacientesEnSala===op.val?C.accent2:C.border}`,
                borderRadius:6,color:pacientesEnSala===op.val?C.accent2:C.textSub,
                cursor:"pointer",transition:"all .15s",
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hora inicio atención ────────────────────────────── */}
      {esVisitaConMedico && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Hora inicio atención del médico</label>
          <input
            type="time"
            value={horaInicioAtencion}
            onChange={e => setHoraInicioAtencion(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {/* ── Producto presentado ─────────────────────────────── */}
      {esVisitaConMedico && (
        <div style={sectionStyle}>
          <label style={labelStyle}>Producto presentado</label>
          <input
            type="text"
            value={producto}
            onChange={e => setProducto(e.target.value)}
            placeholder="Ej: Amoxicilina 500mg"
            style={inputStyle}
          />
        </div>
      )}

      {/* ── Novedades ───────────────────────────────────────── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Novedades</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
          {NOVEDADES.map(n => (
            <button
              key={n.id}
              onClick={() => setNovedadCat(novedadCat === n.id ? null : n.id)}
              style={{
                padding:"8px 10px",fontSize:12,textAlign:"left",
                background:novedadCat===n.id?`${C.warn}15`:C.card,
                border:`1px solid ${novedadCat===n.id?C.warn:C.border}`,
                borderRadius:6,color:novedadCat===n.id?C.warn:C.textSub,
                cursor:"pointer",transition:"all .15s",
                display:"flex",alignItems:"center",gap:6,
              }}
            >
              <span style={{fontSize:16}}>{n.emoji}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Nota libre ──────────────────────────────────────── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Notas adicionales</label>
        <textarea
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Observaciones, comentarios del médico..."
          rows={3}
          style={{
            ...inputStyle,
            resize:"vertical",
            minHeight:60,
          }}
        />
      </div>

      {/* ── Próxima visita ──────────────────────────────────── */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Fecha próxima visita</label>
        <input
          type="date"
          value={proxVisita}
          onChange={e => setProxVisita(e.target.value)}
          style={inputStyle}
        />
      </div>

      <BtnContinuar disabled={!canSubmit} onClick={onSiguiente} />
    </div>
  );
}

// ── PASO 4: CONFIRMACIÓN ──────────────────────────────────────────
function PasoConfirmacion({
  medico, consultorio, horaLlegada, canalContacto, resultado,
  espera, producto, novedadCat, nota, proxVisita, nivelInteres,
  pacientesEnSala, horaInicioAtencion,
  enviando, onAtras, onEnviar
}) {
  const res = RESULTADOS.find(r=>r.id===resultado);
  const canalLabel = CANALES.find(c=>c.id===canalContacto)?.label || canalContacto;

  return (
    <div>
      <BtnAtras onClick={onAtras} />

      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px"}}>
        Confirmar visita
      </h2>

      <div style={{
        background:C.card,border:`1px solid ${C.border}`,
        borderRadius:10,padding:14,marginBottom:16,
      }}>
        {/* Médico */}
        <div style={{fontSize:16,fontWeight:600,color:C.white}}>{medico.nombre}</div>
        <div style={{fontSize:13,color:C.textSub,marginTop:2}}>
          {medico.especialidad} · {medico.zona}
        </div>

        <Divider />

        {/* Lugar y hora */}
        <ConfirmRow label="Consultorio" value={consultorio} />
        <ConfirmRow label="Hora llegada" value={horaLlegada} />
        <ConfirmRow label="Canal" value={canalLabel} />

        <Divider />

        {/* Resultado */}
        <div style={{marginBottom:8}}>
          <div style={{
            display:"inline-block",padding:"5px 12px",
            background:`${res.color}15`,border:`1px solid ${res.color}`,
            borderRadius:6,fontSize:13,fontWeight:500,color:res.color,
          }}>
            {res.emoji} {res.label}
          </div>
        </div>

        {/* Nivel interés */}
        {nivelInteres && (() => {
          const ni = NIVEL_INTERES[nivelInteres-1];
          return (
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              background:`${ni.color}15`,border:`1px solid ${ni.color}40`,
              borderRadius:9,padding:"8px 12px",marginBottom:8,
            }}>
              <span style={{fontSize:12,color:C.textSub}}>Nivel de interés</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{display:"flex",gap:3}}>
                  {[1,2,3,4,5].map(n=>(
                    <div key={n} style={{
                      width:7,height:7,borderRadius:"50%",
                      background: n<=nivelInteres ? ni.color : C.border,
                    }}/>
                  ))}
                </div>
                <span style={{fontSize:12,fontWeight:700,color:ni.color}}>
                  {nivelInteres}/5 · {ni.label}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Campos opcionales */}
        {espera !== null && espera !== undefined && (
          <ConfirmRow label="Espera" value={ESPERA_OPCIONES.find(e=>e.val===espera)?.label || `${espera} min`} />
        )}
        {pacientesEnSala && (
          <ConfirmRow label="Pacientes en sala" value={pacientesEnSala} />
        )}
        {horaInicioAtencion && (
          <ConfirmRow label="Inicio atención" value={horaInicioAtencion} />
        )}
        {producto && (
          <ConfirmRow label="Producto" value={producto} />
        )}
        {novedadCat && (
          <ConfirmRow label="Novedad" value={`${novEmoji(novedadCat)} ${novLabel(novedadCat)}`} />
        )}
        {nota && (
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:2}}>Notas</div>
            <div style={{
              fontSize:13,color:C.textSub,
              background:C.bg,borderRadius:6,padding:"8px 10px",
              borderLeft:`3px solid ${C.accent2}`,
            }}>
              {nota}
            </div>
          </div>
        )}
        {proxVisita && (
          <ConfirmRow label="Próxima visita" value={proxVisita} />
        )}
      </div>

      <button
        disabled={enviando}
        onClick={onEnviar}
        style={{
          width:"100%",padding:14,fontSize:16,fontWeight:700,
          background:enviando?C.muted:C.accent,
          color:enviando?C.textSub:C.bg,
          border:"none",borderRadius:10,
          cursor:enviando?"not-allowed":"pointer",
          transition:"all .15s",
        }}
      >
        {enviando ? "Guardando..." : "✅ Guardar visita"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════════════════════════
function Historial({ historial, stats }) {
  if (!stats) return <div style={{color:C.textSub,textAlign:"center",padding:20}}>Cargando historial...</div>;

  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px"}}>
        Tu historial
      </h2>

      <div style={{
        display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16
      }}>
        <StatCard label="Visitas" value={stats.total_visitas} />
        <StatCard label="Exitosas" value={stats.visitas_exitosas} />
        <StatCard label="Tasa éxito" value={`${(stats.tasa_exito*100).toFixed(0)}%`} />
      </div>

      {historial.length === 0 && (
        <div style={{textAlign:"center",padding:30,color:C.textSub,fontSize:14}}>
          Aún no tienes visitas registradas
        </div>
      )}

      {historial.map(h => {
        const res = RESULTADOS.find(r=>r.id===h.resultado);
        if (!res) return null;
        return (
          <div key={h.id} style={{
            background:C.card,border:`1px solid ${C.border}`,
            borderRadius:8,padding:12,marginBottom:8
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:14,fontWeight:500,color:C.white}}>
                  {h.medico_nombre}
                </div>
                <div style={{fontSize:12,color:C.textSub,marginTop:2}}>
                  {h.consultorio} · {h.fecha}
                </div>
              </div>
              <div style={{
                padding:"4px 8px",background:`${res.color}15`,
                border:`1px solid ${res.color}`,borderRadius:6,
                fontSize:11,fontWeight:500,color:res.color
              }}>
                {res.emoji} {res.label}
              </div>
            </div>

            {h.nivel_interes && (
              <div style={{marginTop:8,display:"flex",alignItems:"center",gap:4}}>
                {[1,2,3,4,5].map(n=>(
                  <div key={n} style={{
                    width:6,height:6,borderRadius:"50%",
                    background: n<=h.nivel_interes ? NIVEL_INTERES[h.nivel_interes-1].color : C.border,
                  }}/>
                ))}
                <span style={{fontSize:10,color:NIVEL_INTERES[h.nivel_interes-1].color,fontWeight:600}}>
                  {h.nivel_interes}/5
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD (GRÁFICAS)
// ══════════════════════════════════════════════════════════════════
function Dashboard({ historial, stats }) {
  // ── Datos: resultados por tipo ──────────────────────────────────
  const datosResultados = useMemo(() => {
    const conteo = {};
    RESULTADOS.forEach(r => { conteo[r.id] = 0; });
    historial.forEach(h => { if (conteo[h.resultado] !== undefined) conteo[h.resultado]++; });
    return RESULTADOS.map(r => ({
      name: r.label.replace("Visita ", ""),
      valor: conteo[r.id],
      color: r.color,
    }));
  }, [historial]);

  // ── Datos: pie chart ────────────────────────────────────────────
  const datosResultadoPie = useMemo(() => {
    return datosResultados.filter(d => d.valor > 0);
  }, [datosResultados]);

  // ── Datos: visitas por día ──────────────────────────────────────
  const datosPorDia = useMemo(() => {
    const porDia = {};
    historial.forEach(h => {
      const f = h.fecha || "Sin fecha";
      if (!porDia[f]) porDia[f] = { fecha: f, total: 0, exitosas: 0 };
      porDia[f].total++;
      if (h.resultado === "exitosa") porDia[f].exitosas++;
    });
    return Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [historial]);

  // ── Datos: nivel de interés ─────────────────────────────────────
  const datosInteres = useMemo(() => {
    const conteo = [0, 0, 0, 0, 0];
    historial.forEach(h => {
      if (h.nivel_interes >= 1 && h.nivel_interes <= 5) conteo[h.nivel_interes - 1]++;
    });
    return NIVEL_INTERES.map((n, i) => ({
      name: n.label,
      valor: conteo[i],
      color: n.color,
    }));
  }, [historial]);

  // ── Datos: visitas por médico ───────────────────────────────────
  const datosPorMedico = useMemo(() => {
    const pm = {};
    historial.forEach(h => {
      const nom = h.medico_nombre || "Desconocido";
      if (!pm[nom]) pm[nom] = { name: nom, total: 0, efectivas: 0 };
      pm[nom].total++;
      if (h.resultado === "exitosa" || h.resultado === "retraso") pm[nom].efectivas++;
    });
    return Object.values(pm).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [historial]);

  if (!stats) return <div style={{color:C.textSub,textAlign:"center",padding:20}}>Cargando dashboard...</div>;

  if (historial.length === 0) {
    return (
      <div style={{textAlign:"center",padding:40,color:C.textSub}}>
        <div style={{fontSize:40,marginBottom:12}}>📊</div>
        <div style={{fontSize:16}}>Aún no hay datos para mostrar</div>
        <div style={{fontSize:13,marginTop:6}}>Registra visitas para ver tus estadísticas</div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px"}}>Dashboard</h2>

      {/* ── KPIs ────────────────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
        <StatCard label="Total visitas" value={stats.total_visitas} />
        <StatCard label="Tasa de éxito" value={`${(stats.tasa_exito * 100).toFixed(0)}%`} />
        <StatCard
          label="Interés promedio"
          value={stats.nivel_interes_promedio ? stats.nivel_interes_promedio.toFixed(1) : "—"}
        />
        <StatCard
          label="Espera promedio"
          value={stats.tiempo_espera_promedio ? `${Math.round(stats.tiempo_espera_promedio)} min` : "—"}
        />
      </div>

      {/* ── Barras: resultados por tipo ─────────────────────────── */}
      <ChartCard title="Resultados por tipo">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={datosResultados} margin={{top:5,right:10,left:-15,bottom:5}}>
            <XAxis dataKey="name" tick={{fill:C.textSub,fontSize:11}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.accent}10`}} />
            <Bar dataKey="valor" name="Visitas" radius={[4,4,0,0]}>
              {datosResultados.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Pie: distribución ───────────────────────────────────── */}
      {datosResultadoPie.length > 0 && (
        <ChartCard title="Distribución de resultados">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={datosResultadoPie} dataKey="valor" nameKey="name"
                cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                paddingAngle={3} strokeWidth={0}>
                {datosResultadoPie.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip/>} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginTop:4}}>
            {datosResultadoPie.map(d => (
              <div key={d.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textSub}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:d.color}} />
                {d.name} ({d.valor})
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* ── Línea: visitas por día ──────────────────────────────── */}
      {datosPorDia.length > 1 && (
        <ChartCard title="Visitas por día">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={datosPorDia} margin={{top:5,right:10,left:-15,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="fecha" tick={{fill:C.textSub,fontSize:10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip/>} />
              <Line type="monotone" dataKey="total" name="Total" stroke={C.accent2}
                strokeWidth={2} dot={{fill:C.accent2,r:4}} />
              <Line type="monotone" dataKey="exitosas" name="Exitosas" stroke={C.accent}
                strokeWidth={2} dot={{fill:C.accent,r:4}} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:6}}>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textSub}}>
              <div style={{width:12,height:3,borderRadius:2,background:C.accent2}} /> Total
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textSub}}>
              <div style={{width:12,height:3,borderRadius:2,background:C.accent}} /> Exitosas
            </div>
          </div>
        </ChartCard>
      )}

      {/* ── Barras: nivel de interés ────────────────────────────── */}
      {datosInteres.some(d => d.valor > 0) && (
        <ChartCard title="Distribución nivel de interés">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosInteres} margin={{top:5,right:10,left:-15,bottom:5}}>
              <XAxis dataKey="name" tick={{fill:C.textSub,fontSize:10}} axisLine={false} tickLine={false}
                angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.accent}10`}} />
              <Bar dataKey="valor" name="Visitas" radius={[4,4,0,0]}>
                {datosInteres.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Barras horizontales: por médico ─────────────────────── */}
      {datosPorMedico.length > 0 && (
        <ChartCard title="Visitas por médico">
          <ResponsiveContainer width="100%" height={Math.max(150, datosPorMedico.length * 45)}>
            <BarChart data={datosPorMedico} layout="vertical" margin={{top:5,right:10,left:10,bottom:5}}>
              <XAxis type="number" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{fill:C.textSub,fontSize:11}} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip/>} cursor={{fill:`${C.accent}10`}} />
              <Bar dataKey="total" name="Total" fill={C.accent2} radius={[0,4,4,0]} barSize={14} />
              <Bar dataKey="efectivas" name="Efectivas" fill={C.accent} radius={[0,4,4,0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:6}}>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textSub}}>
              <div style={{width:12,height:6,borderRadius:2,background:C.accent2}} /> Total
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textSub}}>
              <div style={{width:12,height:6,borderRadius:2,background:C.accent}} /> Efectivas
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTES REUTILIZABLES
// ══════════════════════════════════════════════════════════════════
function StatCard({ label, value }) {
  return (
    <div style={{
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:8,padding:12,textAlign:"center"
    }}>
      <div style={{fontSize:20,fontWeight:700,color:C.accent}}>{value}</div>
      <div style={{fontSize:12,color:C.textSub,marginTop:2}}>{label}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background:C.card,border:`1px solid ${C.border}`,
      borderRadius:10,padding:"14px 10px",marginBottom:14,
    }}>
      <div style={{fontSize:14,fontWeight:600,color:C.white,marginBottom:10,paddingLeft:4}}>
        {title}
      </div>
      {children}
    </div>
  );
}

function BtnAtras({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background:"none",border:"none",color:C.accent,
      fontSize:14,cursor:"pointer",marginBottom:12,padding:0,
    }}>
      ← Atrás
    </button>
  );
}

function BtnContinuar({ disabled, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        width:"100%",padding:12,fontSize:15,fontWeight:600,
        background:disabled?C.muted:C.accent,
        color:disabled?C.textSub:C.bg,
        border:"none",borderRadius:8,
        cursor:disabled?"not-allowed":"pointer",
        marginTop:4,
      }}
    >
      Continuar
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
      <span style={{fontSize:13,color:C.white,fontWeight:500}}>{value}</span>
    </div>
  );
}
