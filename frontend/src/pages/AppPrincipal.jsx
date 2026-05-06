import { useState, useEffect, useCallback, useRef } from 'react';
import { C, fontStack } from '../constants';
import AuthService, { API_URL } from '../services/auth';
import NuevaVisita from '../components/visita/NuevaVisita';
import Historial from '../components/historial/Historial';
import Dashboard from '../components/dashboard/Dashboard';
import CambiarPassword from '../components/auth/CambiarPassword';

export default function AppPrincipal({ user, onLogout, onSessionExpired }) {
  const [tab, setTab] = useState("nueva");
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Estado de médicos y visitas
  const [medicos, setMedicos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [stats, setStats] = useState(null);

  // Estado del formulario de nueva visita
  const [paso, setPaso] = useState(1);
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
