import { useState } from 'react';
import { C, fontStack } from '../../constants';
import { Input, BtnAtras, BtnPrimario, labelStyle, sectionStyle } from '../shared';

export default function CambiarPassword({ apiFetch, onBack, onLogout }) {
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
            <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:20, textAlign:"center" }}>
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
              {error && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:C.danger }}>⚠️ {error}</div>}
              <BtnPrimario disabled={!allValid || loading} onClick={handleSubmit}>{loading ? "Guardando..." : "Actualizar contraseña"}</BtnPrimario>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
