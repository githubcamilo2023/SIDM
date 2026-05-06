// ── PALETA ACTUALIZADA (TEAL MÉDICO) ─────────────────────────────
export const C = {
  primary:    "#0f766e",
  action:     "#14b8a6",
  accent:     "#0d9488",
  success:    "#16a34a",
  danger:     "#dc2626",
  warn:       "#ea580c",
  orange:     "#f97316",

  bg:         "#f8fafc",
  card:       "#ffffff",
  section:    "#f1f5f9",
  border:     "#e2e8f0",
  textMain:   "#0f172a",
  textSub:    "#475569",
  muted:      "#94a3b8",
  white:      "#ffffff",

  gradientPrimary: "linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)",
  gradientAccent:  "linear-gradient(135deg, #14b8a6 0%, #16a34a 100%)",
  shadow:     "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
  shadowMd:   "0 4px 6px rgba(15,23,42,0.07), 0 2px 4px rgba(15,23,42,0.04)",
  shadowLg:   "0 10px 25px rgba(15,23,42,0.1), 0 4px 10px rgba(15,23,42,0.04)",
};

export const fontStack = "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

// ── CATÁLOGOS ────────────────────────────────────────────────────
export const RESULTADOS = [
  { id:"exitosa",        label:"Visita exitosa",    emoji:"✅", color:C.success  },
  { id:"retraso",        label:"Con retraso",       emoji:"⏱️", color:C.warn     },
  { id:"medico_ausente", label:"Médico ausente",    emoji:"❌", color:C.danger   },
  { id:"agenda_cerrada", label:"Agenda cerrada",    emoji:"🔒", color:C.orange   },
  { id:"reagendada",     label:"Reagendada",        emoji:"📅", color:"#ca8a04" },
];

export const CANALES = [
  { id:"sin_aviso", label:"Sin aviso previo", icon:"📍" },
  { id:"whatsapp",  label:"WhatsApp",         icon:"💬" },
  { id:"llamada",   label:"Llamada",          icon:"📞" },
];

export const NOVEDADES = [
  { id:"secretaria_info",      label:"Info de secretaria",     emoji:"💬" },
  { id:"agenda_cambio",        label:"Cambio de agenda",       emoji:"📅" },
  { id:"medico_ocupado",       label:"Médico muy ocupado",     emoji:"⏰" },
  { id:"consultorio_nuevo",    label:"Nuevo consultorio",      emoji:"🏥" },
  { id:"interes_producto",     label:"Interés en producto",    emoji:"💊" },
  { id:"actividad_competencia",label:"Actividad competencia",  emoji:"⚠️" },
  { id:"otro",                 label:"Otro",                   emoji:"📌" },
];

export const NIVEL_INTERES = [
  { val:1, label:"Sin interés",     desc:"No escuchó, cortó la visita",                 color:C.danger  },
  { val:2, label:"Escuchó apenas",  desc:"Atendió por compromiso, sin engagement",      color:C.warn    },
  { val:3, label:"Interés normal",  desc:"Escuchó y hizo preguntas básicas",            color:"#ca8a04" },
  { val:4, label:"Interés alto",    desc:"Pidió más información o muestras",            color:"#16a34a" },
  { val:5, label:"Muy interesado",  desc:"Solicitó seguimiento o preguntó prescripción", color:C.success },
];

export const ESPERA_OPCIONES = [
  { val: 0,  label: "Sin espera" },
  { val: 5,  label: "~5 min" },
  { val: 15, label: "~15 min" },
  { val: 30, label: "~30 min" },
  { val: 45, label: "~45 min" },
  { val: 60, label: "60+ min" },
];

// ── HELPERS ──────────────────────────────────────────────────────
export const novEmoji = (id) => NOVEDADES.find(n=>n.id===id)?.emoji || "📌";
export const novLabel = (id) => NOVEDADES.find(n=>n.id===id)?.label || id;
