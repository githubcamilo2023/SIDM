import { useState, useEffect, useCallback } from 'react';
import { C, fontStack } from '../../constants';
import { Input, BtnPrimario, BtnAtras, labelStyle, sectionStyle } from '../shared/index.jsx';

export default function GestionMedicos({ apiFetch }) {
  const [medicos, setMedicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista"); // lista | crear | editar
  const [medicoEditando, setMedicoEditando] = useState(null);
  const [buscar, setBuscar] = useState("");
  const [mensaje, setMensaje] = useState(null);

  const cargarMedicos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/medicos");
      if (res.ok) setMedicos(await res.json());
    } catch {
      setMedicos([]);
    }
    setLoading(false);
  }, [apiFetch]);

  useEffect(() => { cargarMedicos(); }, [cargarMedicos]);

  const mostrarMensaje = (texto, tipo = "success") => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleCrear = async (data) => {
    try {
      const res = await apiFetch("/admin/medicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al crear médico");
      }
      mostrarMensaje("Médico creado exitosamente");
      setVista("lista");
      cargarMedicos();
    } catch (err) {
      mostrarMensaje(err.message, "error");
    }
  };

  const handleEditar = async (medicoId, data) => {
    try {
      const res = await apiFetch(`/admin/medicos/${medicoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al actualizar médico");
      }
      mostrarMensaje("Médico actualizado exitosamente");
      setVista("lista");
      setMedicoEditando(null);
      cargarMedicos();
    } catch (err) {
      mostrarMensaje(err.message, "error");
    }
  };

  const handleDesactivar = async (medico) => {
    if (!confirm(`¿Desactivar a ${medico.nombre}? No aparecerá en la lista de médicos activos.`)) return;
    try {
      const res = await apiFetch(`/admin/medicos/${medico.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al desactivar");
      }
      mostrarMensaje(`${medico.nombre} desactivado`);
      cargarMedicos();
    } catch (err) {
      mostrarMensaje(err.message, "error");
    }
  };

  const filtrados = medicos.filter(m =>
    m.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    (m.especialidad || "").toLowerCase().includes(buscar.toLowerCase()) ||
    (m.zona || "").toLowerCase().includes(buscar.toLowerCase())
  );

  // ── Vista crear/editar ──────────────────────────────────────
  if (vista === "crear") {
    return (
      <FormularioMedico
        titulo="Nuevo médico"
        onSubmit={handleCrear}
        onBack={() => setVista("lista")}
        mensaje={mensaje}
      />
    );
  }

  if (vista === "editar" && medicoEditando) {
    return (
      <FormularioMedico
        titulo="Editar médico"
        medico={medicoEditando}
        onSubmit={(data) => handleEditar(medicoEditando.id, data)}
        onBack={() => { setVista("lista"); setMedicoEditando(null); }}
        mensaje={mensaje}
      />
    );
  }

  // ── Vista lista ─────────────────────────────────────────────
  return (
    <div>
      {/* Mensaje toast */}
      {mensaje && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          fontFamily: fontStack, zIndex: 50, boxShadow: C.shadowLg,
          background: mensaje.tipo === "error" ? "#FEF2F2" : "#F0FDF4",
          color: mensaje.tipo === "error" ? C.danger : C.success,
          border: `1px solid ${mensaje.tipo === "error" ? "#FECACA" : "#BBF7D0"}`,
        }}>
          {mensaje.tipo === "error" ? "⚠️" : "✅"} {mensaje.texto}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.textMain }}>
          Gestión de médicos
        </div>
        <button onClick={() => setVista("crear")} style={{
          padding: "8px 16px", fontSize: 13, fontWeight: 600,
          fontFamily: fontStack, background: C.gradientPrimary,
          color: C.white, border: "none", borderRadius: 8,
          cursor: "pointer", boxShadow: `0 2px 8px ${C.primary}30`,
        }}>
          + Agregar médico
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar médico..."
        value={buscar}
        onChange={e => setBuscar(e.target.value)}
        style={{
          width: "100%", padding: "10px 14px", fontSize: 14,
          fontFamily: fontStack, background: C.white,
          border: `1.5px solid ${C.border}`, borderRadius: 10,
          color: C.textMain, outline: "none", boxSizing: "border-box",
          marginBottom: 12,
        }}
        onFocus={e => e.target.style.borderColor = C.action}
        onBlur={e => e.target.style.borderColor = C.border}
      />

      {loading && <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cargando...</div>}

      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
        {filtrados.length} médicos activos
      </div>

      {filtrados.map(m => (
        <div key={m.id} style={{
          background: C.white, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "12px 14px", marginBottom: 8,
          boxShadow: C.shadow, display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.textMain }}>{m.nombre}</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
              {m.especialidad || "Sin especialidad"}{m.zona ? ` · ${m.zona}` : ""}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {m.total_visitas || 0} visitas · SPP {m.spp ? `${Math.round(m.spp * 100)}%` : "—"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { setMedicoEditando(m); setVista("editar"); }} style={{
              padding: "6px 12px", fontSize: 12, fontFamily: fontStack,
              background: `${C.primary}08`, border: `1px solid ${C.primary}25`,
              borderRadius: 6, color: C.primary, cursor: "pointer",
            }}>
              ✏️ Editar
            </button>
            <button onClick={() => handleDesactivar(m)} style={{
              padding: "6px 12px", fontSize: 12, fontFamily: fontStack,
              background: `${C.danger}08`, border: `1px solid ${C.danger}25`,
              borderRadius: 6, color: C.danger, cursor: "pointer",
            }}>
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// FORMULARIO CREAR/EDITAR MÉDICO
// ══════════════════════════════════════════════════════════════════
function FormularioMedico({ titulo, medico = null, onSubmit, onBack, mensaje }) {
  const [nombre, setNombre] = useState(medico?.nombre || "");
  const [especialidad, setEspecialidad] = useState(medico?.especialidad || "");
  const [zona, setZona] = useState(medico?.zona || "");
  const [consultorio, setConsultorio] = useState(medico?.consultorio || "");
  const [ips, setIps] = useState(medico?.ips || "");
  const [guardando, setGuardando] = useState(false);

  const canSubmit = nombre.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setGuardando(true);
    const data = {
      nombre: nombre.trim(),
      especialidad: especialidad.trim() || null,
      zona: zona.trim() || null,
      consultorio: consultorio.trim() || null,
      ips: ips.trim() || null,
    };
    await onSubmit(data);
    setGuardando(false);
  };

  return (
    <div>
      {/* Mensaje toast */}
      {mensaje && (
        <div style={{
          position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          fontFamily: fontStack, zIndex: 50, boxShadow: C.shadowLg,
          background: mensaje.tipo === "error" ? "#FEF2F2" : "#F0FDF4",
          color: mensaje.tipo === "error" ? C.danger : C.success,
          border: `1px solid ${mensaje.tipo === "error" ? "#FECACA" : "#BBF7D0"}`,
        }}>
          {mensaje.tipo === "error" ? "⚠️" : "✅"} {mensaje.texto}
        </div>
      )}

      <BtnAtras onClick={onBack} />

      <div style={{
        background: C.white, borderRadius: 16, padding: "24px 20px",
        boxShadow: C.shadowMd, border: `1px solid ${C.border}`,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px", color: C.textMain }}>
          {titulo}
        </h2>

        <div style={sectionStyle}>
          <label style={labelStyle}>Nombre completo *</label>
          <Input
            type="text" value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Dr. Juan Pérez"
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Especialidad</label>
          <Input
            type="text" value={especialidad}
            onChange={e => setEspecialidad(e.target.value)}
            placeholder="Ej: Cardiología"
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Zona</label>
          <Input
            type="text" value={zona}
            onChange={e => setZona(e.target.value)}
            placeholder="Ej: El Poblado"
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Consultorio</label>
          <Input
            type="text" value={consultorio}
            onChange={e => setConsultorio(e.target.value)}
            placeholder="Ej: Clínica El Rosario, Cons. 305"
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>IPS</label>
          <Input
            type="text" value={ips}
            onChange={e => setIps(e.target.value)}
            placeholder="Ej: Hospital San Vicente"
          />
        </div>

        <BtnPrimario disabled={!canSubmit || guardando} onClick={handleSubmit}>
          {guardando ? "Guardando..." : medico ? "Actualizar médico" : "Crear médico"}
        </BtnPrimario>
      </div>
    </div>
  );
}
