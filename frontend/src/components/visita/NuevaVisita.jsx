import { useState } from 'react';
import { C, fontStack, RESULTADOS, CANALES, NOVEDADES, NIVEL_INTERES, ESPERA_OPCIONES, novEmoji, novLabel } from '../../constants';
import { Input, TextArea, SectionTitle, BtnAtras, BtnPrimario, Req, Divider, ConfirmRow, labelStyle, sectionStyle } from '../shared';

// ── NUEVA VISITA — ROUTER DE PASOS ──────────────────────────────
export default function NuevaVisita(props) {
  const { paso, setPaso } = props;
  if (paso === 1) return <PasoMedico {...props} onSiguiente={()=>setPaso(2)} />;
  if (paso === 2) return <PasoLugar {...props} onAtras={()=>setPaso(1)} onSiguiente={()=>setPaso(3)} />;
  if (paso === 3) return <PasoResultado {...props} onAtras={()=>setPaso(2)} onSiguiente={()=>setPaso(4)} />;
  if (paso === 4) return <PasoConfirmacion {...props} onAtras={()=>setPaso(3)} />;
  return null;
}

// ── PASO 1: MÉDICO ───────────────────────────────────────────────
function PasoMedico({ medicos, medicoSeleccionado, setMedicoSeleccionado, onSiguiente }) {
  const [buscar, setBuscar] = useState("");
  const filtrados = medicos.filter(m => m.nombre.toLowerCase().includes(buscar.toLowerCase()) || (m.especialidad || "").toLowerCase().includes(buscar.toLowerCase()));

  return (
    <div>
      <SectionTitle>Selecciona el médico</SectionTitle>
      <Input type="text" placeholder="Buscar por nombre o especialidad..." value={buscar} onChange={e => setBuscar(e.target.value)} style={{marginBottom:14}} />
      <div style={{maxHeight:380,overflowY:"auto",marginBottom:14}}>
        {filtrados.length === 0 && <div style={{textAlign:"center",padding:24,color:C.muted,fontSize:14}}>{medicos.length === 0 ? "Cargando médicos..." : "Sin resultados"}</div>}
        {filtrados.map(m => {
          const isSelected = medicoSeleccionado?.id === m.id;
          const sppPct = m.spp !== undefined ? (m.spp * 100).toFixed(0) : null;
          const sppColor = m.spp >= 0.7 ? C.success : m.spp >= 0.45 ? C.warn : C.danger;
          return (
            <button key={m.id} onClick={() => setMedicoSeleccionado(m)} style={{
              width:"100%", textAlign:"left", padding:"12px 14px", marginBottom:6,
              background:isSelected?`${C.primary}08`:C.white,
              border:`1.5px solid ${isSelected?C.primary:C.border}`,
              borderRadius:12, cursor:"pointer", fontFamily:fontStack,
              transition:"all .15s", boxShadow:isSelected?`0 0 0 3px ${C.primary}12`:"none",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:isSelected?600:500,color:C.textMain}}>{m.nombre}</div>
                  <div style={{fontSize:12,color:C.textSub,marginTop:2}}>{m.especialidad}{m.zona ? ` · ${m.zona}` : ""}</div>
                </div>
                {sppPct !== null && (
                  <div style={{ padding:"4px 10px", borderRadius:8, fontSize:12, fontWeight:700, color:sppColor, background:`${sppColor}12` }}>
                    {sppPct}%
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <BtnPrimario disabled={!medicoSeleccionado} onClick={onSiguiente}>Continuar</BtnPrimario>
    </div>
  );
}

// ── PASO 2: LUGAR Y HORA ────────────────────────────────────────
function PasoLugar({ medicoSeleccionado: medico, consultorio, setConsultorio, horaLlegada, setHoraLlegada, canalContacto, setCanalContacto, onAtras, onSiguiente }) {
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
function PasoConfirmacion({ medicoSeleccionado: medico, consultorio, horaLlegada, canalContacto, resultado, espera, producto, novedadCat, nota, proxVisita, nivelInteres, pacientesEnSala, horaInicioAtencion, enviando, onAtras, onEnviar }) {
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
