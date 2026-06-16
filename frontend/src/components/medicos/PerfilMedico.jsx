import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { C, fontStack, RESULTADOS, NIVEL_INTERES, novEmoji, novLabel } from '../../constants';
import { StatCard, ChartCard, BtnAtras, CustomTooltip } from '../shared/index.jsx';

const DIAS_LABEL = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function PerfilMedico({ medico, apiFetch, onBack }) {
  const [spp, setSpp] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sppPorFranja, setSppPorFranja] = useState([]);

  useEffect(() => {
    if (!medico?.id) return;
    setLoading(true);

    const cargarDatos = async () => {
      try {
        // SPP actual
        const resSpp = await apiFetch(`/medicos/${medico.id}/spp`);
        if (resSpp.ok) setSpp(await resSpp.json());

        // Historial con este médico
        const resHist = await apiFetch(`/visitas/historial?medico_id=${medico.id}&limite=50`);
        if (resHist.ok) setHistorial(await resHist.json());

        // SPP por franjas horarias (mañana, mediodía, tarde)
        const franjas = [
          { label: "8am", hora: 8 },
          { label: "9am", hora: 9 },
          { label: "10am", hora: 10 },
          { label: "11am", hora: 11 },
          { label: "12pm", hora: 12 },
          { label: "1pm", hora: 13 },
          { label: "2pm", hora: 14 },
          { label: "3pm", hora: 15 },
          { label: "4pm", hora: 16 },
          { label: "5pm", hora: 17 },
        ];
        const sppPromises = franjas.map(f =>
          apiFetch(`/medicos/${medico.id}/spp?hora=${f.hora}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        );
        const sppResults = await Promise.all(sppPromises);
        const sppData = franjas.map((f, i) => ({
          franja: f.label,
          spp: sppResults[i]?.spp ? Math.round(sppResults[i].spp * 100) : null,
          confianza: sppResults[i]?.confianza || "baja",
          color: sppResults[i]?.spp >= 0.7 ? C.success : sppResults[i]?.spp >= 0.45 ? C.warn : C.danger,
        })).filter(d => d.spp !== null);
        setSppPorFranja(sppData);
      } catch {
        setSpp(null);
        setHistorial([]);
        setSppPorFranja([]);
      }
      setLoading(false);
    };

    cargarDatos();
  }, [medico?.id, apiFetch]);

  // Stats calculados del historial
  const statsLocal = (() => {
    const total = historial.length;
    if (total === 0) return null;
    const exitosas = historial.filter(v => v.resultado === "exitosa").length;
    const niveles = historial.filter(v => v.nivel_interes).map(v => v.nivel_interes);
    const esperas = historial.filter(v => v.tiempo_espera != null).map(v => v.tiempo_espera);
    return {
      total,
      exitosas,
      tasa: total > 0 ? Math.round((exitosas / total) * 100) : 0,
      interes: niveles.length > 0 ? (niveles.reduce((a, b) => a + b, 0) / niveles.length).toFixed(1) : "—",
      espera: esperas.length > 0 ? Math.round(esperas.reduce((a, b) => a + b, 0) / esperas.length) : null,
    };
  })();

  // Resultados agrupados
  const datosResultados = (() => {
    const conteo = {};
    RESULTADOS.forEach(r => { conteo[r.id] = 0; });
    historial.forEach(h => { if (conteo[h.resultado] !== undefined) conteo[h.resultado]++; });
    return RESULTADOS.map(r => ({ name: r.label.replace("Visita ", ""), valor: conteo[r.id], color: r.color })).filter(d => d.valor > 0);
  })();

  // Días más visitados
  const diasVisitados = (() => {
    const porDia = {};
    historial.forEach(h => {
      if (h.fecha) {
        const date = new Date(h.fecha + "T12:00:00");
        const dia = date.getDay() === 0 ? 7 : date.getDay(); // 1=Lun ... 7=Dom
        const label = DIAS_LABEL[dia] || "?";
        if (!porDia[label]) porDia[label] = { dia: label, visitas: 0, exitosas: 0 };
        porDia[label].visitas++;
        if (h.resultado === "exitosa") porDia[label].exitosas++;
      }
    });
    return Object.values(porDia).sort((a, b) => {
      const order = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
      return order.indexOf(a.dia) - order.indexOf(b.dia);
    });
  })();

  const sppPct = spp?.spp ? Math.round(spp.spp * 100) : null;
  const sppColor = spp?.spp >= 0.7 ? C.success : spp?.spp >= 0.45 ? C.warn : C.danger;

  return (
    <div>
      <BtnAtras onClick={onBack} />

      {/* Header del médico */}
      <div style={{
        background: C.white, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: "20px 18px", marginBottom: 16, boxShadow: C.shadowMd,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.textMain, letterSpacing: "-0.01em" }}>
              {medico.nombre}
            </div>
            <div style={{ fontSize: 14, color: C.textSub, marginTop: 4 }}>
              {medico.especialidad}{medico.zona ? ` · ${medico.zona}` : ""}
            </div>
          </div>
          {sppPct !== null && (
            <div style={{
              padding: "8px 16px", borderRadius: 12, fontSize: 20, fontWeight: 800,
              color: sppColor, background: `${sppColor}12`,
              border: `2px solid ${sppColor}30`,
            }}>
              {sppPct}%
            </div>
          )}
        </div>

        {/* SPP detalle */}
        {spp && (
          <div style={{ marginTop: 14 }}>
            <div style={{
              fontSize: 13, color: C.textSub, lineHeight: 1.5,
              background: `${sppColor}06`, borderRadius: 10,
              padding: "10px 14px", border: `1px solid ${sppColor}15`,
            }}>
              💡 {spp.mensaje}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              <MiniTag label="Confianza" value={spp.confianza} color={spp.confianza === "alta" ? C.success : spp.confianza === "media" ? C.warn : C.muted} />
              <MiniTag label="Base datos" value={`${spp.base_datos} visitas`} color={C.textSub} />
              {spp.score_detalle && (
                <MiniTag label="Score campo" value={`${Math.round(spp.score_detalle.campo * 100)}%`} color={C.primary} />
              )}
            </div>
          </div>
        )}
      </div>

      {loading && <div style={{ color: C.muted, textAlign: "center", padding: 24 }}>Cargando perfil...</div>}

      {!loading && (
        <>
          {/* Stats con este médico */}
          {statsLocal && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
              <StatCard label="Mis visitas" value={statsLocal.total} color={C.primary} />
              <StatCard label="Tasa éxito" value={`${statsLocal.tasa}%`} color={C.success} />
              <StatCard label="Interés prom." value={statsLocal.interes} color={C.accent} />
              <StatCard label="Espera prom." value={statsLocal.espera !== null ? `${statsLocal.espera} min` : "—"} color={C.warn} />
            </div>
          )}

          {/* SPP por franja horaria */}
          {sppPorFranja.length > 0 && (
            <ChartCard title="Disponibilidad por hora">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sppPorFranja} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <XAxis dataKey="franja" tick={{ fill: C.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{
                          background: C.white, border: `1px solid ${C.border}`,
                          borderRadius: 10, padding: "10px 14px", fontSize: 12,
                          boxShadow: C.shadowMd, fontFamily: fontStack,
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                          <div>SPP: <strong>{payload[0].value}%</strong></div>
                          <div style={{ fontSize: 11, color: C.muted }}>{payload[0].payload.confianza} confianza</div>
                        </div>
                      );
                    }}
                    cursor={{ fill: `${C.primary}08` }}
                  />
                  <Bar dataKey="spp" name="SPP %" radius={[6, 6, 0, 0]}>
                    {sppPorFranja.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 4 }}>
                🟢 Alta (&gt;70%) · 🟠 Media (45-70%) · 🔴 Baja (&lt;45%)
              </div>
            </ChartCard>
          )}

          {/* Días visitados */}
          {diasVisitados.length > 0 && (
            <ChartCard title="Visitas por día de la semana">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={diasVisitados} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <XAxis dataKey="dia" tick={{ fill: C.textSub, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: `${C.primary}08` }} />
                  <Bar dataKey="visitas" name="Total" fill={C.primary} radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="exitosas" name="Exitosas" fill={C.success} radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Resultados con este médico */}
          {datosResultados.length > 0 && (
            <ChartCard title="Mis resultados con este médico">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {datosResultados.map(d => (
                  <div key={d.name} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 8,
                    background: `${d.color}10`, border: `1px solid ${d.color}25`,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                    <span style={{ fontSize: 12, color: d.color, fontWeight: 600 }}>{d.valor}</span>
                    <span style={{ fontSize: 12, color: C.textSub }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {/* Historial de visitas */}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.textMain, marginBottom: 10 }}>
              Historial de visitas ({historial.length})
            </div>

            {historial.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 13 }}>
                No has visitado a este médico aún
              </div>
            )}

            {historial.map(h => {
              const res = RESULTADOS.find(r => r.id === h.resultado);
              if (!res) return null;
              return (
                <div key={h.id} style={{
                  background: C.white, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: "10px 14px", marginBottom: 6, boxShadow: C.shadow,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, color: C.textMain, fontWeight: 500 }}>
                        {h.fecha} · {h.hora_llegada}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{h.consultorio}</div>
                      {h.producto && <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>💊 {h.producto}</div>}
                    </div>
                    <div style={{
                      padding: "3px 8px", background: `${res.color}10`,
                      border: `1px solid ${res.color}25`, borderRadius: 6,
                      fontSize: 10, fontWeight: 600, color: res.color, whiteSpace: "nowrap",
                    }}>
                      {res.emoji} {res.label}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {h.nivel_interes && (
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} style={{
                            width: 5, height: 5, borderRadius: "50%",
                            background: n <= h.nivel_interes ? NIVEL_INTERES[h.nivel_interes - 1].color : C.border,
                          }} />
                        ))}
                        <span style={{ fontSize: 10, color: NIVEL_INTERES[h.nivel_interes - 1].color, fontWeight: 600, marginLeft: 2 }}>
                          {h.nivel_interes}/5
                        </span>
                      </div>
                    )}
                    {h.tiempo_espera != null && (
                      <span style={{ fontSize: 10, color: C.muted }}>⏱ {h.tiempo_espera}min</span>
                    )}
                    {h.novedad_categoria && (
                      <span style={{ fontSize: 10, color: C.warn }}>
                        {novEmoji(h.novedad_categoria)} {novLabel(h.novedad_categoria)}
                      </span>
                    )}
                  </div>
                  {h.nota && (
                    <div style={{
                      fontSize: 11, color: C.textSub, marginTop: 6, lineHeight: 1.4,
                      background: C.section, borderRadius: 6, padding: "4px 8px",
                      borderLeft: `2px solid ${C.accent}`,
                    }}>
                      {h.nota}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MiniTag({ label, value, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 6,
      background: `${color}08`, border: `1px solid ${color}20`,
    }}>
      <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}
