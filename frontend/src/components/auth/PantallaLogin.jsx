import { useState } from 'react';
import { C, fontStack } from '../../constants';
import { Input, labelStyle } from '../shared';
import { API_URL } from '../../services/auth';

export default function PantallaLogin({ onLogin }) {
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
            <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:C.danger, textAlign:"center" }}>
              ⚠️ {error}
            </div>
          )}
          <button type="submit" disabled={cargando} style={{
            width:"100%", padding:14, fontSize:15, fontWeight:600,
            fontFamily:fontStack, letterSpacing:"0.01em",
            background:cargando?C.muted:C.gradientPrimary,
            color:C.white, border:"none", borderRadius:12,
            cursor:cargando?"not-allowed":"pointer",
            boxShadow:cargando?"none":"0 4px 14px rgba(15,118,110,0.3)",
            transition:"all .2s",
          }}>
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
