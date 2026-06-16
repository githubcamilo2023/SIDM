import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { C, fontStack, RESULTADOS, NIVEL_INTERES } from '../../constants';
import { SectionTitle, StatCard, ChartCard, ChartLegend, CustomTooltip } from '../shared/index.jsx';
import GestionMedicos from './GestionMedicos';

export default function AdminPanel({ apiFetch }) {
  const [visitadores, setVisitadores] = useState([]);
  const [filtroVisitador, setFiltroVisitador] = useState(null);
  const [visitas, setVisitas] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsPorRep, setStatsPorRep] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("resumen");

  // ── Cargar visitadores ──────────────────────────────────────
  useEffect(() => {
    apiFetch("/admin/visitadores")
      .then(r => r.ok ? r.json() : [])
      .then(setVisitadores)
      .catch(() => {
        setVisitadores([]);
      });
  }, [apiFetch]);

  // ── Cargar datos según filtro ───────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtroVisitador ? `?visitador_id=${filtroVisitador}` : "";
      const visitasParams = filtroVisitador
        ? `?visitador_id=${filtroVisitador}&limite=200`
        : "?limite=200";

      const [resStats, resVisitas] = await Promise.all([
        apiFetch(`/admin/stats${params}`),
        apiFetch(`/admin/visitas${visitasParams}`),
      ]);
      if (resStats.ok) setStats(await resStats.json());
      if (resVisitas.ok) setVisitas(await resVisitas.json());
    } catch {
      setStats(null);
      setVisitas([]);
    }
    setLoading(false);
  }, [apiFetch, filtroVisitador]);

  // ── Cargar comparativo ──────────────────────────────────────
  const cargarComparativo = useCallback(async () => {
    try {
      const res = await apiFetch("/admin/stats/por-visitador");
      if (res.ok) setStatsPorRep(await res.json());
    } catch {
      setStatsPorRep([]);
    }
  }, [apiFetch]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);
  useEffect(() => { if (subTab === "comparativo") cargarComparativo(); }, [subTab, cargarComparativo]);

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

  // Datos de visitas agrupadas por visitador (para resumen)
  const datosPorVisitador = useMemo(() => {
    if (filtroVisitador) return []; // No mostrar si ya hay filtro
    const porVis = {};
    visitas.forEach(h => {
      const nom = h.visitador_nombre || "Desconocido";
      if (!porVis[nom]) porVis[nom] = { name: nom, total: 0, exitosas: 0 };
      porVis[nom].total++;
      if (h.resultado === "exitosa" || h.resultado === "retraso") porVis[nom].exitosas++;
    });
    return Object.values(porVis).sort((a, b) => b.total - a.total);
  }, [visitas, filtroVisitador]);

  // ── Sub-tabs ────────────────────────────────────────────────
  const subTabs = [
    { id: "resumen", label: "Resumen", icon: "📊" },
    { id: "visitas", label: "Visitas", icon: "📋" },
    { id: "comparativo", label: "Por visitador", icon: "👥" },
    { id: "medicos", label: "Médicos", icon: "🩺" },
  ];

  return (
    <div>
      <SectionTitle>Panel Administrativo</SectionTitle>

      {/* Filtro por visitador — estilizado */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.textSub, marginBottom: 6 }}>
          Filtrar por visitador
        </label>
        <div style={{ position: "relative" }}>
          <select
            value={filtroVisitador || ""}
            onChange={e => setFiltroVisitador(e.target.value ? Number(e.target.value) : null)}
            style={{
              width: "100%", padding: "11px 40px 11px 14px", fontSize: 14,
              fontFamily: fontStack, background: C.white,
              border: `1.5px solid ${filtroVisitador ? C.primary : C.border}`,
              borderRadius: 10, color: C.textMain, outline: "none",
              cursor: "pointer", appearance: "none", transition: "border-color 0.2s",
              boxShadow: filtroVisitador ? `0 0 0 3px ${C.primary}10` : "none",
            }}
          >
            <option value="">🏢 Todos los visitadores</option>
            {visitadores.map(v => (
              <option key={v.id} value={v.id}>👤 {v.nombre}</option>
            ))}
          </select>
          <div style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
            pointerEvents: "none", fontSize: 12, color: C.muted,
          }}>▼</div>
        </div>
        {filtroVisitador && (
          <button
            onClick={() => setFiltroVisitador(null)}
            style={{
              marginTop: 6, padding: "4px 12px", fontSize: 12, fontFamily: fontStack,
              background: `${C.primary}08`, border: `1px solid ${C.primary}25`,
              borderRadius: 6, color: C.primary, cursor: "pointer",
            }}
          >
            ✕ Limpiar filtro
          </button>
        )}
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
        <ResumenAdmin
          stats={stats} datosResultados={datosResultados}
          datosResultadoPie={datosResultadoPie} datosPorDia={datosPorDia}
          datosPorVisitador={datosPorVisitador}
          filtroVisitador={filtroVisitador} visitadores={visitadores}
        />
      )}
      {!loading && subTab === "visitas" && <TablaVisitas visitas={visitas} />}
      {!loading && subTab === "comparativo" && <Comparativo statsPorRep={statsPorRep} />}
      {subTab === "medicos" && <GestionMedicos apiFetch={apiFetch} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB: RESUMEN
// ══════════════════════════════════════════════════════════════════
function ResumenAdmin({ stats, datosResultados, datosResultadoPie, datosPorDia, datosPorVisitador, filtroVisitador, visitadores }) {
  if (!stats) return null;

  const filtroLabel = filtroVisitador
    ? visitadores.find(v => v.id === filtroVisitador)?.nombre || "Visitador"
    : "Todo el equipo";

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
      <div style={{
        fontSize: 12, color: C.white, marginBottom: 14, fontWeight: 500,
        background: C.gradientPrimary, padding: "6px 12px", borderRadius: 8,
        display: "inline-block",
      }}>
        📈 {filtroLabel}
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

      {/* Chart de visitas por visitador en resumen (solo cuando no hay filtro) */}
      {datosPorVisitador.length > 1 && (
        <ChartCard title="Visitas por visitador">
          <ResponsiveContainer width="100%" height={Math.max(120, datosPorVisitador.length * 50)}>
            <BarChart data={datosPorVisitador} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textSub, fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: `${C.primary}08` }} />
              <Bar dataKey="total" name="Total" fill={C.primary} radius={[0, 6, 6, 0]} barSize={16} />
              <Bar dataKey="exitosas" name="Efectivas" fill={C.success} radius={[0, 6, 6, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: C.primary, label: "Total" }, { color: C.success, label: "Efectivas" }]} />
        </ChartCard>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB: TABLA DE VISITAS
// ══════════════════════════════════════════════════════════════════
function TablaVisitas({ visitas }) {
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 20;

  const totalPaginas = Math.ceil(visitas.length / POR_PAGINA);
  const visitasPagina = visitas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  if (visitas.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 14 }}>
        No hay visitas para mostrar
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{visitas.length} visitas</span>
        {totalPaginas > 1 && (
          <span>Página {pagina + 1} de {totalPaginas}</span>
        )}
      </div>

      {visitasPagina.map(h => {
        const res = RESULTADOS.find(r => r.id === h.resultado);
        if (!res) return null;
        return (
          <div key={h.id} style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "12px 14px", marginBottom: 8, boxShadow: C.shadow,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.textMain }}>{h.medico_nombre}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {h.consultorio} · {h.fecha} · {h.hora_llegada}
                </div>
                {h.visitador_nombre && (
                  <div style={{
                    fontSize: 11, color: C.action, fontWeight: 500, marginTop: 4,
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: `${C.action}10`, padding: "2px 8px", borderRadius: 6,
                  }}>
                    👤 {h.visitador_nombre}
                  </div>
                )}
                {h.producto && (
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>
                    💊 {h.producto}
                  </div>
                )}
                {h.nota && (
                  <div style={{
                    fontSize: 11, color: C.textSub, marginTop: 4, lineHeight: 1.4,
                    background: C.section, borderRadius: 6, padding: "4px 8px",
                    borderLeft: `2px solid ${C.accent}`,
                  }}>
                    {h.nota}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, marginLeft: 10 }}>
                <div style={{
                  padding: "4px 10px", background: `${res.color}10`,
                  border: `1px solid ${res.color}25`, borderRadius: 8,
                  fontSize: 11, fontWeight: 600, color: res.color, whiteSpace: "nowrap",
                }}>
                  {res.emoji} {res.label}
                </div>
                {h.tiempo_espera !== null && h.tiempo_espera !== undefined && (
                  <div style={{ fontSize: 10, color: C.muted }}>
                    ⏱ {h.tiempo_espera} min
                  </div>
                )}
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
                  {h.nivel_interes}/5 · {NIVEL_INTERES[h.nivel_interes - 1].label}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            disabled={pagina === 0}
            onClick={() => setPagina(p => p - 1)}
            style={{
              padding: "8px 16px", fontSize: 13, fontFamily: fontStack,
              background: pagina === 0 ? C.section : C.white,
              border: `1.5px solid ${C.border}`, borderRadius: 8,
              color: pagina === 0 ? C.muted : C.textMain,
              cursor: pagina === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Anterior
          </button>
          <button
            disabled={pagina >= totalPaginas - 1}
            onClick={() => setPagina(p => p + 1)}
            style={{
              padding: "8px 16px", fontSize: 13, fontFamily: fontStack,
              background: pagina >= totalPaginas - 1 ? C.section : C.white,
              border: `1.5px solid ${C.border}`, borderRadius: 8,
              color: pagina >= totalPaginas - 1 ? C.muted : C.textMain,
              cursor: pagina >= totalPaginas - 1 ? "not-allowed" : "pointer",
            }}
          >
            Siguiente →
          </button>
        </div>
      )}
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
      {/* Cards por visitador con barra de progreso */}
      {statsPorRep.map(s => {
        const tasaPct = Math.round(s.tasa_exito * 100);
        const tasaColor = s.tasa_exito >= 0.5 ? C.success : s.tasa_exito >= 0.3 ? C.warn : C.danger;

        return (
          <div key={s.visitador_id} style={{
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: "14px 16px", marginBottom: 10, boxShadow: C.shadow,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textMain }}>{s.visitador_nombre}</div>
              <div style={{
                padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                color: tasaColor, background: `${tasaColor}12`,
              }}>
                {tasaPct}% éxito
              </div>
            </div>

            {/* Barra de progreso visual */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                width: "100%", height: 6, background: C.section,
                borderRadius: 3, overflow: "hidden",
              }}>
                <div style={{
                  width: `${Math.max(tasaPct, 2)}%`, height: "100%",
                  background: tasaColor, borderRadius: 3,
                  transition: "width 0.5s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 10, color: C.muted }}>0%</span>
                <span style={{ fontSize: 10, color: C.muted }}>100%</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              <MiniStat label="Visitas" value={s.total_visitas} color={C.primary} />
              <MiniStat label="Exitosas" value={s.visitas_exitosas} color={C.success} />
              <MiniStat label="Interés" value={s.nivel_interes_promedio?.toFixed(1) || "—"} color={C.accent} />
              <MiniStat label="Espera" value={s.tiempo_espera_promedio ? `${Math.round(s.tiempo_espera_promedio)}m` : "—"} color={C.warn} />
            </div>
          </div>
        );
      })}

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

function MiniStat({ label, value, color = C.textMain }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
    </div>
  );
}
