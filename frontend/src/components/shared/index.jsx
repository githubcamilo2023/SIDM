import { useState } from 'react';
import { C, fontStack } from '../../constants';

// ── ESTILOS BASE ─────────────────────────────────────────────────
export const inputStyle = {
  width:"100%", padding:"11px 14px", fontSize:14,
  fontFamily: fontStack,
  background:C.white, border:`1.5px solid ${C.border}`,
  borderRadius:10, color:C.textMain, outline:"none",
  boxSizing:"border-box", transition:"border-color 0.2s, box-shadow 0.2s",
};

export const inputFocusStyle = {
  borderColor: C.action,
  boxShadow: `0 0 0 3px ${C.action}18`,
};

export const labelStyle = {
  display:"block", fontSize:13, fontWeight:500,
  color:C.textSub, marginBottom:6, letterSpacing:"0.01em",
};

export const sectionStyle = { marginBottom: 16 };

// ── INPUT CON FOCUS ──────────────────────────────────────────────
export function Input({ style: extraStyle, ...props }) {
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

export function TextArea({ style: extraStyle, ...props }) {
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

// ── COMPONENTES REUTILIZABLES ────────────────────────────────────
export function SectionTitle({ children }) {
  return <h2 style={{fontSize:20,fontWeight:600,margin:"0 0 16px",color:C.textMain,letterSpacing:"-0.01em"}}>{children}</h2>;
}

export function StatCard({ label, value, color = C.primary }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 12px", textAlign:"center", boxShadow:C.shadow }}>
      <div style={{fontSize:22,fontWeight:700,color,letterSpacing:"-0.02em"}}>{value}</div>
      <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:500,letterSpacing:"0.02em"}}>{label}</div>
    </div>
  );
}

export function ChartCard({ title, children }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 12px", marginBottom:14, boxShadow:C.shadow }}>
      <div style={{fontSize:14,fontWeight:600,color:C.textMain,marginBottom:12,paddingLeft:4}}>{title}</div>
      {children}
    </div>
  );
}

export function ChartLegend({ items }) {
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

export function BtnAtras({ onClick }) {
  return (
    <button onClick={onClick} style={{ background:"none",border:"none",color:C.primary, fontSize:14,cursor:"pointer",marginBottom:12,padding:0, fontFamily:fontStack,fontWeight:500 }}>
      ← Atrás
    </button>
  );
}

export function BtnPrimario({ disabled, onClick, children }) {
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

export function Req() {
  return <span style={{color:C.danger,marginLeft:2}}>*</span>;
}

export function Divider() {
  return <div style={{borderTop:`1px solid ${C.border}`,margin:"10px 0"}} />;
}

export function ConfirmRow({ label, value }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
      <span style={{fontSize:12,color:C.muted}}>{label}</span>
      <span style={{fontSize:13,color:C.textMain,fontWeight:500}}>{value}</span>
    </div>
  );
}

// ── TOOLTIP RECHARTS ─────────────────────────────────────────────
export const CustomTooltip = ({ active, payload, label }) => {
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
