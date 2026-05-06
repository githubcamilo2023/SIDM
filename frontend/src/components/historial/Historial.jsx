import { C, RESULTADOS, NIVEL_INTERES } from '../../constants';
import { SectionTitle, StatCard } from '../shared';

export default function Historial({ historial, stats }) {
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
