import { useState, useEffect } from 'react';

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
  { id:"secretaria_info", label:"Info de secretaria",     emoji:"💬" },
  { id:"agenda_cambio",   label:"Cambio de agenda",       emoji:"📅" },
  { id:"medico_ocupado",  label:"Médico muy ocupado",     emoji:"⏰" },
  { id:"consultorio_nuevo", label:"Nuevo consultorio",   emoji:"🏥" },
  { id:"interes_producto", label:"Interés en producto",  emoji:"💊" },
  { id:"actividad_competencia", label:"Actividad competencia", emoji:"⚠️" },
  { id:"otro",            label:"Otro",                   emoji:"📌" },
];

const NIVEL_INTERES = [
  { val:1, label:"Sin interés",     desc:"No escuchó, cortó la visita",               color:C.danger  },
  { val:2, label:"Escuchó apenas",  desc:"Atendió por compromiso, sin engagement",     color:"#FF8C42" },
  { val:3, label:"Interés normal",  desc:"Escuchó y hizo preguntas básicas",           color:C.warn    },
  { val:4, label:"Interés alto",    desc:"Pidió más información o muestras",           color:"#8BC34A" },
  { val:5, label:"Muy interesado",  desc:"Solicitó seguimiento o preguntó prescripción", color:C.accent},
];

// ── HELPERS ───────────────────────────────────────────────────────
const novEmoji = (id) => NOVEDADES.find(n=>n.id===id)?.emoji || "📌";
const novLabel = (id) => NOVEDADES.find(n=>n.id===id)?.label || id;

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("sidm_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verificar token y cargar usuario
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
        alignItems:"center",justifyContent:"center",color:C.white
      }}>
        Cargando...
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
      alignItems:"center",justifyContent:"center",padding:"20px"
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
            <label style={{display:"block",fontSize:13,color:C.textSub,marginBottom:6}}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="visitador@inbiotech.com"
              required
              style={{
                width:"100%",padding:"10px 12px",fontSize:14,
                background:C.bg,border:`1px solid ${C.border}`,
                borderRadius:8,color:C.white,outline:"none"
              }}
            />
          </div>

          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:13,color:C.textSub,marginBottom:6}}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width:"100%",padding:"10px 12px",fontSize:14,
                background:C.bg,border:`1px solid ${C.border}`,
                borderRadius:8,color:C.white,outline:"none"
              }}
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
    if (tab === "historial") cargarHistorial();
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

//   const handleEnviarVisita = async () => {
//     setEnviando(true);
//     try {
//       const visitaData = {
//         medico_id: medicoSeleccionado.id,
//         consultorio,
//         hora_llegada: horaLlegada,
//         canal_contacto: canalContacto,
//         resultado,
//         tiempo_espera: espera,
//         producto,
//         novedad_categoria: novedadCat,
//         nota,
//         prox_visita: proxVisita,
//         nivel_interes: nivelInteres,
//         pacientes_en_sala: pacientesEnSala,
//         hora_inicio_atencion: horaInicioAtencion
//       };

//       const res = await fetch(`${API_URL}/visitas`, {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${token}`,
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify(visitaData)
//       });

//       if (!res.ok) throw new Error("Error guardando visita");

//       // Reset
//       setPaso(1);
//       setMedicoSeleccionado(null);
//       setConsultorio("");
//       setResultado(null);
//       setNivelInteres(null);
//       setTab("historial");
//     } catch (err) {
//       alert("Error al guardar la visita: " + err.message);
//     } finally {
//       setEnviando(false);
//     }
//   };

//   return (
//     <div style={{minHeight:"100vh",background:C.bg,color:C.white}}>
//       {/* Header */}
//       <div style={{
//         background:C.card,borderBottom:`1px solid ${C.border}`,
//         padding:"12px 16px",display:"flex",alignItems:"center",
//         justifyContent:"space-between"
//       }}>
//         <div>
//           <div style={{fontSize:18,fontWeight:700,color:C.accent}}>SIDM</div>
//           <div style={{fontSize:12,color:C.textSub}}>{user?.nombre}</div>
//         </div>
//         <button onClick={onLogout} style={{
//           padding:"8px 14px",fontSize:13,background:C.danger,
//           color:C.white,border:"none",borderRadius:8,cursor:"pointer"
//         }}>
//           Salir
//         </button>
//       </div>

//       {/* Tabs */}
//       <div style={{display:"flex",background:C.card,borderBottom:`1px solid ${C.border}`}}>
//         <TabButton active={tab==="nueva"} onClick={()=>setTab("nueva")}>
//           Nueva Visita
//         </TabButton>
//         <TabButton active={tab==="historial"} onClick={()=>setTab("historial")}>
//           Historial
//         </TabButton>
//       </div>

//       {/* Contenido */}
//       <div style={{padding:16}}>
//         {tab === "nueva" && (
//           <NuevaVisita
//             paso={paso}
//             setPaso={setPaso}
//             medicos={medicos}
//             medicoSeleccionado={medicoSeleccionado}
//             setMedicoSeleccionado={setMedicoSeleccionado}
//             consultorio={consultorio}
//             setConsultorio={setConsultorio}
//             horaLlegada={horaLlegada}
//             setHoraLlegada={setHoraLlegada}
//             canalContacto={canalContacto}
//             setCanalContacto={setCanalContacto}
//             resultado={resultado}
//             setResultado={setResultado}
//             espera={espera}
//             setEspera={setEspera}
//             producto={producto}
//             setProducto={setProducto}
//             novedadCat={novedadCat}
//             setNovedadCat={setNovedadCat}
//             nota={nota}
//             setNota={setNota}
//             proxVisita={proxVisita}
//             setProxVisita={setProxVisita}
//             nivelInteres={nivelInteres}
//             setNivelInteres={setNivelInteres}
//             pacientesEnSala={pacientesEnSala}
//             setPacientesEnSala={setPacientesEnSala}
//             horaInicioAtencion={horaInicioAtencion}
//             setHoraInicioAtencion={setHoraInicioAtencion}
//             enviando={enviando}
//             onEnviar={handleEnviarVisita}
//           />
//         )}

//         {tab === "historial" && (
//           <Historial historial={historial} stats={stats} />
//         )}
//       </div>
//     </div>
//   );
// }

const handleEnviarVisita = async () => {
  setEnviando(true);
  try {
    // Helper: convierte strings vacíos a null
    const clean = (val) => (val === "" ? null : val);

    const visitaData = {
      medico_id: medicoSeleccionado.id,
      consultorio: clean(consultorio),
      hora_llegada: clean(horaLlegada),           // ← este era el culpable
      canal_contacto: canalContacto || "sin_aviso",
      resultado,
      tiempo_espera: espera,
      producto: clean(producto),
      novedad_categoria: novedadCat,
      nota: clean(nota),
      prox_visita: clean(proxVisita),
      nivel_interes: nivelInteres,
      pacientes_en_sala: pacientesEnSala,
      hora_inicio_atencion: clean(horaInicioAtencion)  // ← y este también
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
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Error ${res.status}`);
    }

    // Reset
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
    setTab("historial");
  } catch (err) {
    alert("Error al guardar la visita: " + err.message);
  } finally {
    setEnviando(false);
  }
}
};

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
        resultado={resultado}
        setResultado={setResultado}
        espera={espera}
        setEspera={setEspera}
        producto={producto}
        setProducto={setProducto}
        novedadCat={novedadCat}
        setNovedadCat={setNovedadCat}
        nota={nota}
        setNota={setNota}
        proxVisita={proxVisita}
        setProxVisita={setProxVisita}
        nivelInteres={nivelInteres}
        setNivelInteres={setNivelInteres}
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
        style={{
          width:"100%",padding:"10px 12px",fontSize:14,marginBottom:16,
          background:C.card,border:`1px solid ${C.border}`,
          borderRadius:8,color:C.white,outline:"none"
        }}
      />

      <div style={{marginBottom:16}}>
        {filtrados.map(m => (
          <div
            key={m.id}
            onClick={() => onSeleccionar(m)}
            style={{
              background:seleccionado?.id===m.id?`${C.accent}15`:C.card,
              border:`1px solid ${seleccionado?.id===m.id?C.accent:C.border}`,
              borderRadius:8,padding:12,marginBottom:8,cursor:"pointer"
            }}
          >
            <div style={{fontSize:15,fontWeight:500,color:C.white}}>{m.nombre}</div>
            <div style={{fontSize:13,color:C.textSub,marginTop:2}}>
              {m.especialidad} · {m.zona}
            </div>
            <div style={{fontSize:12,color:C.accent,marginTop:4}}>
              SPP: {(m.spp * 100).toFixed(0)}% · {m.confianza}
            </div>
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
  const canContinue = consultorio && horaLlegada;

  return (
    <div>
      <button onClick={onAtras} style={{
        background:"none",border:"none",color:C.accent,
        fontSize:14,cursor:"pointer",marginBottom:12
      }}>
        ← Atrás
      </button>

      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 8px"}}>
        {medico.nombre}
      </h2>
      <p style={{fontSize:13,color:C.textSub,margin:"0 0 16px"}}>
        {medico.especialidad} · {medico.zona}
      </p>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:13,color:C.textSub,marginBottom:6,display:"block"}}>
          Consultorio
        </label>
        <input
          type="text"
          value={consultorio}
          onChange={e => setConsultorio(e.target.value)}
          placeholder="Ej: Sura Laureles"
          style={{
            width:"100%",padding:"10px 12px",fontSize:14,
            background:C.card,border:`1px solid ${C.border}`,
            borderRadius:8,color:C.white,outline:"none"
          }}
        />
      </div>

      <div style={{marginBottom:12}}>
        <label style={{fontSize:13,color:C.textSub,marginBottom:6,display:"block"}}>
          Hora de llegada
        </label>
        <input
          type="time"
          value={horaLlegada}
          onChange={e => setHoraLlegada(e.target.value)}
          style={{
            width:"100%",padding:"10px 12px",fontSize:14,
            background:C.card,border:`1px solid ${C.border}`,
            borderRadius:8,color:C.white,outline:"none"
          }}
        />
      </div>

      <div style={{marginBottom:16}}>
        <label style={{fontSize:13,color:C.textSub,marginBottom:6,display:"block"}}>
          Canal de contacto previo
        </label>
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
                cursor:"pointer"
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <button
        disabled={!canContinue}
        onClick={onSiguiente}
        style={{
          width:"100%",padding:12,fontSize:15,fontWeight:600,
          background:canContinue?C.accent:C.muted,
          color:canContinue?C.bg:C.textSub,
          border:"none",borderRadius:8,
          cursor:canContinue?"pointer":"not-allowed"
        }}
      >
        Continuar
      </button>
    </div>
  );
}

// ── PASO 3: RESULTADO ─────────────────────────────────────────────
function PasoResultado({
  resultado, setResultado, espera, setEspera, producto, setProducto,
  novedadCat, setNovedadCat, nota, setNota, proxVisita, setProxVisita,
  nivelInteres, setNivelInteres, onAtras, onSiguiente
}) {
  const res = RESULTADOS.find(r=>r.id===resultado);
  const esVisitaConMedico = resultado==="exitosa"||resultado==="retraso";
  const canSubmit = resultado !== null && (!esVisitaConMedico || nivelInteres !== null);

  return (
    <div>
      <button onClick={onAtras} style={{
        background:"none",border:"none",color:C.accent,
        fontSize:14,cursor:"pointer",marginBottom:12
      }}>
        ← Atrás
      </button>

      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px"}}>
        ¿Cómo fue la visita?
      </h2>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:16}}>
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
              alignItems:"center",gap:4
            }}
          >
            <span style={{fontSize:20}}>{r.emoji}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>

      {esVisitaConMedico && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:13,color:C.textSub,marginBottom:6}}>
            Nivel de interés del médico <span style={{color:C.danger}}>*</span>
          </div>
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

      <button
        disabled={!canSubmit}
        onClick={onSiguiente}
        style={{
          width:"100%",padding:12,fontSize:15,fontWeight:600,
          background:canSubmit?C.accent:C.muted,
          color:canSubmit?C.bg:C.textSub,
          border:"none",borderRadius:8,
          cursor:canSubmit?"pointer":"not-allowed"
        }}
      >
        Continuar
      </button>
    </div>
  );
}

// ── PASO 4: CONFIRMACIÓN ──────────────────────────────────────────
function PasoConfirmacion({
  medico, consultorio, horaLlegada, canalContacto, resultado,
  espera, producto, novedadCat, nota, proxVisita, nivelInteres,
  enviando, onAtras, onEnviar
}) {
  const res = RESULTADOS.find(r=>r.id===resultado);

  return (
    <div>
      <button onClick={onAtras} style={{
        background:"none",border:"none",color:C.accent,
        fontSize:14,cursor:"pointer",marginBottom:12
      }}>
        ← Atrás
      </button>

      <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px"}}>
        Confirmar visita
      </h2>

      <div style={{
        background:C.card,border:`1px solid ${C.border}`,
        borderRadius:8,padding:12,marginBottom:16
      }}>
        <div style={{fontSize:15,fontWeight:500,color:C.white}}>{medico.nombre}</div>
        <div style={{fontSize:13,color:C.textSub,marginTop:2}}>
          {consultorio} · {horaLlegada}
        </div>
        <div style={{
          display:"inline-block",marginTop:8,padding:"4px 10px",
          background:`${res.color}15`,border:`1px solid ${res.color}`,
          borderRadius:6,fontSize:12,fontWeight:500,color:res.color
        }}>
          {res.emoji} {res.label}
        </div>

        {nivelInteres && (() => {
          const ni = NIVEL_INTERES[nivelInteres-1];
          return (
            <div style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              background:`${ni.color}15`,border:`1px solid ${ni.color}40`,
              borderRadius:9,padding:"8px 12px",marginTop:10,
            }}>
              <span style={{fontSize:12,color:C.textSub}}>⭐ Nivel de interés</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{display:"flex",gap:3}}>
                  {[1,2,3,4,5].map(n=>(
                    <div key={n} style={{
                      width:8,height:8,borderRadius:"50%",
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
      </div>

      <button
        disabled={enviando}
        onClick={onEnviar}
        style={{
          width:"100%",padding:12,fontSize:15,fontWeight:600,
          background:enviando?C.muted:C.accent,
          color:enviando?C.textSub:C.bg,
          border:"none",borderRadius:8,
          cursor:enviando?"not-allowed":"pointer"
        }}
      >
        {enviando ? "Guardando..." : "Guardar visita"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// HISTORIAL
// ══════════════════════════════════════════════════════════════════
function Historial({ historial, stats }) {
  if (!stats) return <div style={{color:C.textSub}}>Cargando...</div>;

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

      {historial.map(h => {
        const res = RESULTADOS.find(r=>r.id===h.resultado);
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
