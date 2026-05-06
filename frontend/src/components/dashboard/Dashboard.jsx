import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { C, RESULTADOS, NIVEL_INTERES } from '../../constants';
import { SectionTitle, StatCard, ChartCard, ChartLegend, CustomTooltip } from '../shared';

export default function Dashboard({ historial, stats }) {
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
