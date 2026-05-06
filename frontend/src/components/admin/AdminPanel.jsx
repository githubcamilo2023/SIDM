import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { C, fontStack, RESULTADOS, NIVEL_INTERES } from '../../constants';
import { SectionTitle, StatCard, ChartCard, ChartLegend, CustomTooltip } from '../shared/index.jsx';

export default function AdminPanel({ apiFetch }) {
  const [visitadores, setVisitadores] = useState([]);
  const [filtroVisitador, setFiltroVisitador] = useState(null); // null = todos
  const [visitas, setVisitas] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsPorRep, setStatsPorRep] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("resumen"); // resumen | visitas | comparativo

  // ── Cargar visitadores ──────────────────────────────────────
  useEffect(() => {
    apiFetch("/admin/visitadores")
      .then(r => r.ok ? r.json() : [])
      .then(setVisitadores)
      .catch(() => {});
  }, [apiFetch]);

  // ── Cargar datos según filtro ───────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const filtro = filtroVisitador ? `?visitador_id=${filtroVisitador}` : "";
      const [resStats, resVisitas] = await Promise.all([
        apiFetch(`/admin/stats${filtro}`),
        apiFetch(`/admin/visitas${filtro}&limite=200`),
      ]);
      if (resStats.ok) setStats(await resStats.json());
      if (resVisitas.ok) setVisitas(await resVisitas.json());
    } catch {}
    setLoading(false);
  }, [apiFetch, filtroVisitador]);

  // ── Cargar comparativo ──────────────────────────────────────
  const cargarComparativo = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/stats/por-visitador");
      if (res.ok) setStatsPorRep(await res.json());
    } catch {}
  }, [apiFetch]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (subTab === "comparativo") cargarComparativo();
  }, [subTab, cargarComparativo]);

  // ── Datos calculados para charts ────────────────────────────
  const datosResultados = useMemo(() => {
    const conteo = {};
    RESULTADOS.forEach(r => { conteo[r.id] = 0; });
    visitas.forEach(h => { if (conteo[h.resultado] !== undefined) conteo[h.resultado]++; });
    return RESULTADOS.map(r => ({ name: r.label.replace("Visita ", ""), valor: conteo[r.id], color: r.color }));
  }, [visitas]);

  const datosResultadoPie = useMemo(() => datosResultados.filter(d => d.valor > 0), [datosResultados]);

  const datosPorDia = useMemo(() => {
    const porDia = {};
    visitas.forEach(h => {
      const f = h.fecha || "Sin fecha";
      if (!porDia[f]) porDia[f] = { fecha: f, total: 0, exitosas: 0 };
      porDia[f].total++;
      if (h.resultado === "exitosa") porDia[f].exitosas++;
    });
    return Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [visitas]);

  // ── Sub-tabs ────────────────────────────────────────────────
  const subTabs = [
    { id: "resumen", label: "Resumen", icon: "📊" },
    { id: "visitas", label: "Visitas", icon: "📋" },
    { id: "comparativo", label: "Por visitador", icon: "👥" },
  ];

  return (
    <div>
      <SectionTitle>Panel Administrativo</SectionTitle>

      {/* Filtro por visitador */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSub, marginBottom: 6 }}>
          Filtrar por visitador
        </label>
        <select
          value={filtroVisitador || ""}
          onChange={e => setFiltroVisitador(e.target.value ? Number(e.target.value) : null)}
          style={{
            width: "100%", padding: "10px 14px", fontSize: 14,
            fontFamily: fontStack, background: C.white,
            border: `1.5px solid ${C.border}`, borderRadius: 10,
            color: C.textMain, outline: "none", cursor: "pointer",
          }}
        >
          <option value="">Todos los visitadores</option>
          {visitadores.map(v => (
            <option key={v.id} value={v.id}>{v.nombre}</option>
          ))}
        </select>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex: 1, padding: "10px 0", fontSize: 12, fontWeight: subTab === t.id ? 600 : 400,
            fontFamily: fontStack, background: subTab === t.id ? `${C.primary}10` : C.white,
            border: `1.5px solid ${subTab === t.id ? C.primary : C.border}`,
            borderRadius: 10, color: subTab === t.id ? C.primary : C.textSub,
            cursor: "pointer", transition: "all .15s",
          }}>
            <span style={{ marginRight: 4 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cargando datos...</div>}

      {!loading && subTab === "resumen" && (
        <ResumenAdmin stats={stats} datosResultados={datosResultados} datosResultadoPie={datosResultadoPie} datosPorDia={datosPorDia} filtroVisitador={filtroVisitador} visitadores={visitadores} />
      )}

      {!loading && subTab === "visitas" && (
        <TablaVisitas visitas={visitas} />
      )}

      {!loading && subTab === "comparativo" && (
        <Comparativo statsPorRep={statsPorRep} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB: RESUMEN
// ══════════════════════════════════════════════════════════════════
function ResumenAdmin({ stats, datosResultados, datosResultadoPie, datosPorDia, filtroVisitador, visitadores }) {
  if (!stats) return null;

  const filtroLabel = filtroVisitador
    ? visitadores.find(v => v.id === filtroVisitador)?.nombre || "Visitador"
    : "Todos";

  if (stats.total_visitas === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>Sin visitas registradas</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>
          {filtroVisitador ? "Este visitador no tiene visitas aún" : "No hay visitas en el laboratorio"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontWeight: 500 }}>
        Mostrando: {filtroLabel}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 20 }}>
        <StatCard label="Total visitas" value={stats.total_visitas} color={C.primary} />
        <StatCard label="Tasa de éxito" value={`${(stats.tasa_exito * 100).toFixed(0)}%`} color={C.success} />
        <StatCard label="Interés promedio" value={stats.nivel_interes_promedio?.toFixed(1) || "—"} color={C.accent} />
        <StatCard label="Espera promedio" value={stats.tiempo_espera_promedio ? `${Math.round(stats.tiempo_espera_promedio)} min` : "—"} color={C.warn} />
      </div>

      <ChartCard title="Resultados por tipo">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={datosResultados} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fill: C.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: `${C.primary}08` }} />
            <Bar dataKey="valor" name="Visitas" radius={[6, 6, 0, 0]}>
              {datosResultados.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {datosResultadoPie.length > 0 && (
        <ChartCard title="Distribución de resultados">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={datosResultadoPie} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                {datosResultadoPie.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 4 }}>
            {datosResultadoPie.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textSub }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} /> {d.name} ({d.valor})
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {datosPorDia.length > 1 && (
        <ChartCard title="Visitas por día">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={datosPorDia} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="fecha" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total" name="Total" stroke={C.primary} strokeWidth={2} dot={{ fill: C.primary, r: 3 }} />
              <Line type="monotone" dataKey="exitosas" name="Exitosas" stroke={C.success} strokeWidth={2} dot={{ fill: C.success, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: C.primary, label: "Total" }, { color: C.success, label: "Exitosas" }]} />
        </ChartCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB: TABLA DE VISITAS
// ══════════════════════════════════════════════════════════════════
function TablaVisitas({ visitas }) {
  if (visitas.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 14 }}>
        No hay visitas para mostrar
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
        {visitas.length} visitas
      </div>
      {visitas.map(h => {
        const res = RESULTADOS.find(r => r.id === h.resultado);
        if (!res) return null;
        return (
          <div key={h.id} style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 8, boxShadow: C.shadow,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.textMain }}>{h.medico_nombre}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {h.consultorio} · {h.fecha}
                </div>
                {h.visitador_nombre && (
                  <div style={{
                    fontSize: 11, color: C.action, fontWeight: 500, marginTop: 3,
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: `${C.action}10`, padding: "2px 8px", borderRadius: 6,
                  }}>
                    👤 {h.visitador_nombre}
                  </div>
                )}
              </div>
              <div style={{
                padding: "4px 10px", background: `${res.color}10`,
                border: `1px solid ${res.color}25`, borderRadius: 8,
                fontSize: 11, fontWeight: 600, color: res.color, whiteSpace: "nowrap",
              }}>
                {res.emoji} {res.label}
              </div>
            </div>
            {h.nivel_interes && (
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: n <= h.nivel_interes ? NIVEL_INTERES[h.nivel_interes - 1].color : C.border,
                  }} />
                ))}
                <span style={{ fontSize: 10, color: NIVEL_INTERES[h.nivel_interes - 1].color, fontWeight: 600 }}>
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
// SUB: COMPARATIVO POR VISITADOR
// ══════════════════════════════════════════════════════════════════
function Comparativo({ statsPorRep }) {
  if (statsPorRep.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 14 }}>
        Sin datos comparativos
      </div>
    );
  }

  const datosBarras = statsPorRep.map(s => ({
    name: s.visitador_nombre?.split(" ")[0] || "?",
    total: s.total_visitas,
    exitosas: s.visitas_exitosas,
  }));

  const datosTasa = statsPorRep.map(s => ({
    name: s.visitador_nombre?.split(" ")[0] || "?",
    tasa: Math.round(s.tasa_exito * 100),
    color: s.tasa_exito >= 0.5 ? C.success : s.tasa_exito >= 0.3 ? C.warn : C.danger,
  }));

  return (
    <div>
      {/* Cards por visitador */}
      {statsPorRep.map(s => (
        <div key={s.visitador_id} style={{
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "14px 16px", marginBottom: 10, boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textMain }}>{s.visitador_nombre}</div>
            <div style={{
              padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              color: s.tasa_exito >= 0.5 ? C.success : s.tasa_exito >= 0.3 ? C.warn : C.danger,
              background: `${s.tasa_exito >= 0.5 ? C.success : s.tasa_exito >= 0.3 ? C.warn : C.danger}12`,
            }}>
              {Math.round(s.tasa_exito * 100)}% éxito
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            <MiniStat label="Visitas" value={s.total_visitas} />
            <MiniStat label="Exitosas" value={s.visitas_exitosas} />
            <MiniStat label="Interés" value={s.nivel_interes_promedio?.toFixed(1) || "—"} />
            <MiniStat label="Espera" value={s.tiempo_espera_promedio ? `${Math.round(s.tiempo_espera_promedio)}m` : "—"} />
          </div>
        </div>
      ))}

      {/* Chart comparativo */}
      <ChartCard title="Visitas por visitador">
        <ResponsiveContainer width="100%" height={Math.max(120, datosBarras.length * 50)}>
          <BarChart data={datosBarras} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: C.textSub, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: `${C.primary}08` }} />
            <Bar dataKey="total" name="Total" fill={C.primary} radius={[0, 6, 6, 0]} barSize={16} />
            <Bar dataKey="exitosas" name="Exitosas" fill={C.success} radius={[0, 6, 6, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
        <ChartLegend items={[{ color: C.primary, label: "Total" }, { color: C.success, label: "Exitosas" }]} />
      </ChartCard>

      {/* Tasa de éxito comparativa */}
      <ChartCard title="Tasa de éxito por visitador">
        <ResponsiveContainer width="100%" height={Math.max(120, datosTasa.length * 50)}>
          <BarChart data={datosTasa} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <YAxis type="category" dataKey="name" tick={{ fill: C.textSub, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: `${C.primary}08` }} />
            <Bar dataKey="tasa" name="Tasa %" radius={[0, 6, 6, 0]} barSize={16}>
              {datosTasa.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.textMain }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
    </div>
  );
}
