import { useState, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY = "sk-a95aa6a8edcd405cb221e16bb93cf5cb";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const RESTAURANTS = [
  { id: "jolene", nom: "Jolene",  taux: 0.60, couleur: "#E85D4A" },
  { id: "molo",   nom: "Molo",    taux: 0.65, couleur: "#2563EB" },
  { id: "aina",   nom: "Aina",    taux: 0.65, couleur: "#059669" },
];

const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// formule: brut / 1.07 * taux
const calculerMontant = (brut, taux) => Math.round((brut / 1.07) * taux * 1000) / 1000;

// ─── DONNÉES INITIALES ────────────────────────────────────────────────────────
const INIT_CLIENTS = [
  { id: 1, nom: "Jolene Restaurant", email: "jolene@example.tn", tel: "+216 71 000 001", adresse: "Tunis" },
  { id: 2, nom: "Molo Restaurant",   email: "molo@example.tn",   tel: "+216 71 000 002", adresse: "Tunis" },
  { id: 3, nom: "Aina Restaurant",   email: "aina@example.tn",   tel: "+216 71 000 003", adresse: "Tunis" },
];
const INIT_FOURNISSEURS = [
  { id: 1, nom: "Fournisseur A", email: "fa@example.tn", tel: "+216 71 000 010" },
  { id: 2, nom: "Fournisseur B", email: "fb@example.tn", tel: "+216 71 000 011" },
  { id: 3, nom: "Fournisseur C", email: "fc@example.tn", tel: "+216 71 000 012" },
  { id: 4, nom: "Fournisseur D", email: "fd@example.tn", tel: "+216 71 000 013" },
  { id: 5, nom: "Fournisseur E", email: "fe@example.tn", tel: "+216 71 000 014" },
  { id: 6, nom: "Fournisseur F", email: "ff@example.tn", tel: "+216 71 000 015" },
];
const INIT_ARTICLES = [
  { id: 1, nom: "Article 1", prix: 10.000 },
  { id: 2, nom: "Article 2", prix: 15.000 },
];
const INIT_VENTES = [
  { id: 1, ref:"FACT-001", restaurant:"Jolene", client:"Jolene Restaurant", date:"2025-04-02", brut:8000, montant:4486.000, statut:"Payée",    mois:3 },
  { id: 2, ref:"FACT-002", restaurant:"Molo",   client:"Molo Restaurant",   date:"2025-04-06", brut:5000, montant:3037.383, statut:"En attente", mois:3 },
];
const INIT_ACHATS = [
  { id: 1, ref:"ACH-001", fournisseur:"Fournisseur A", date:"2025-03-28", montant:1200, statut:"Payée",      mois:2 },
  { id: 2, ref:"ACH-002", fournisseur:"Fournisseur B", date:"2025-04-01", montant:850,  statut:"En attente", mois:3 },
  { id: 3, ref:"ACH-003", fournisseur:"Fournisseur C", date:"2025-04-03", montant:3200, statut:"Payée",      mois:3 },
];

const CHART_DATA = [
  { m:"Jan", v:8200,  a:4100 },
  { m:"Fév", v:7500,  a:3800 },
  { m:"Mar", v:9800,  a:5200 },
  { m:"Avr", v:6800,  a:4050 },
];

// ─── AI ──────────────────────────────────────────────────────────────────────
async function analyserTableauVentes(imageBase64) {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat", max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          { type:"text", text:`Analyse ce tableau de ventes. Trouve la colonne "brut" ou "Brut" et extrais le montant total. Réponds UNIQUEMENT en JSON sans texte autour : {"brut": nombre, "restaurant": "nom du restaurant si visible ou null", "periode": "période si visible ou null"}` },
          { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${imageBase64}` } },
        ],
      }],
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

async function analyserFactureAchat(imageBase64, fournisseurs) {
  const noms = fournisseurs.map(f=>f.nom).join(", ");
  const res = await fetch(DEEPSEEK_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model:"deepseek-chat", max_tokens:300,
      messages:[{ role:"user", content:[
        { type:"text", text:`Analyse cette facture. Réponds UNIQUEMENT en JSON : {"fournisseur":"parmi: ${noms}","montant":0,"date":"YYYY-MM-DD","ref":"ref"}` },
        { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${imageBase64}` } },
      ]}],
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content||"{}";
  return JSON.parse(text.replace(/```json|```/g,"").trim());
}

function toBase64(file) {
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── ICÔNES ──────────────────────────────────────────────────────────────────
const Ic = ({ n, s=20, c="currentColor" }) => {
  const map = {
    dash:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    buy:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
    sell:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    archive: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
    cog:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    plus:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    cam:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
    trash:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
    check:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    ai:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    mail:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    warn:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    calc:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>,
    up:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    down:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
    eye:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    tag:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  };
  return map[n] || null;
};

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Card = ({ children, style={} }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #F0F0F0", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, ...style }}>{children}</div>
);

const Badge = ({ label, onClick }) => {
  const map = {
    "Payée":      { bg:"#DCFCE7", text:"#166534", dot:"#22C55E" },
    "En attente": { bg:"#FEF3C7", text:"#92400E", dot:"#F59E0B" },
    "Envoyée":    { bg:"#DBEAFE", text:"#1E40AF", dot:"#3B82F6" },
  };
  const s = map[label] || { bg:"#F3F4F6", text:"#374151", dot:"#9CA3AF" };
  return (
    <span onClick={onClick} style={{ display:"inline-flex", alignItems:"center", gap:5, background:s.bg, color:s.text, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, cursor:onClick?"pointer":"default", userSelect:"none" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, display:"inline-block" }}/>
      {label}
    </span>
  );
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:540, padding:"20px 20px 36px", maxHeight:"92vh", overflowY:"auto", animation:"slideUp 0.22s ease" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:36, height:4, borderRadius:4, background:"#E5E7EB", margin:"0 auto 20px" }}/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontSize:17, fontWeight:800, color:"#111", margin:0, fontFamily:"'Outfit',sans-serif" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"#F5F5F5", border:"none", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><Ic n="x" s={14} c="#666"/></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type="text", placeholder, readOnly=false }) => (
  <div style={{ marginBottom:12 }}>
    <label style={{ display:"block", color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
    <input type={type} value={value} onChange={e=>onChange&&onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly}
      style={{ width:"100%", background:readOnly?"#F9FAFB":"#fff", border:"1.5px solid #E5E7EB", borderRadius:10, padding:"10px 12px", color:"#111", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"'Outfit',sans-serif", cursor:readOnly?"default":"text" }}/>
  </div>
);

const SelField = ({ label, value, onChange, options }) => (
  <div style={{ marginBottom:12 }}>
    <label style={{ display:"block", color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:10, padding:"10px 12px", color:"#111", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"'Outfit',sans-serif" }}>
      <option value="">-- Sélectionner --</option>
      {options.map(o=><option key={o.id} value={o.id}>{o.nom||o.name}</option>)}
    </select>
  </div>
);

const Btn = ({ label, icon, onClick, variant="primary", sm=false, disabled=false, full=false }) => {
  const v = {
    primary: { bg:"#111", color:"#fff", border:"none" },
    outline: { bg:"transparent", color:"#111", border:"1.5px solid #E5E7EB" },
    soft:    { bg:"#F5F5F5", color:"#111", border:"none" },
    danger:  { bg:"#FEE2E2", color:"#DC2626", border:"none" },
    success: { bg:"#DCFCE7", color:"#166534", border:"none" },
  }[variant];
  return (
    <button onClick={disabled?undefined:onClick} style={{ ...v, borderRadius:10, padding:sm?"7px 14px":"11px 18px", fontSize:sm?12:14, fontWeight:700, cursor:disabled?"not-allowed":"pointer", display:"inline-flex", alignItems:"center", gap:6, fontFamily:"'Outfit',sans-serif", opacity:disabled?0.5:1, width:full?"100%":"auto", justifyContent:full?"center":"flex-start", boxSizing:"border-box" }}>
      {icon&&<Ic n={icon} s={sm?13:15} c={v.color}/>}{label}
    </button>
  );
};

const AiLoader = ({ msg="Analyse IA en cours…" }) => (
  <div style={{ textAlign:"center", padding:"32px 0" }}>
    <div style={{ width:52, height:52, borderRadius:"50%", background:"#F0F0FF", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", animation:"spin 1.4s linear infinite" }}>
      <Ic n="ai" s={22} c="#6366F1"/>
    </div>
    <p style={{ fontWeight:700, color:"#111", fontSize:15, marginBottom:4 }}>{msg}</p>
    <p style={{ color:"#9CA3AF", fontSize:12 }}>DeepSeek analyse ta photo…</p>
  </div>
);

const Alert = ({ type, msg }) => {
  const ok = type==="success";
  return (
    <div style={{ background:ok?"#F0FDF4":"#FFF7F7", border:`1px solid ${ok?"#BBF7D0":"#FECACA"}`, borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", gap:8, alignItems:"flex-start" }}>
      <Ic n={ok?"check":"warn"} s={15} c={ok?"#16A34A":"#DC2626"}/>
      <span style={{ color:ok?"#15803D":"#B91C1C", fontSize:13, lineHeight:1.4 }}>{msg}</span>
    </div>
  );
};

// ─── REST TAG ─────────────────────────────────────────────────────────────────
const RestTag = ({ nom }) => {
  const r = RESTAURANTS.find(r=>r.nom===nom);
  return <span style={{ background:r?.couleur+"18", color:r?.couleur||"#666", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{nom}</span>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const Dashboard = ({ ventes, achats }) => {
  const tv = ventes.reduce((s,v)=>s+v.montant,0);
  const ta = achats.reduce((s,a)=>s+a.montant,0);
  const impayees = ventes.filter(v=>v.statut!=="Payée").length;
  const marge = tv - ta;

  const kpis = [
    { label:"Ventes",       val:`${tv.toFixed(3)} TND`,  icon:"up",   bg:"#F0FDF4", ic:"#16A34A" },
    { label:"Achats",       val:`${ta.toFixed(3)} TND`,  icon:"down", bg:"#EFF6FF", ic:"#2563EB" },
    { label:"Marge",        val:`${marge.toFixed(3)} TND`, icon:"calc", bg:"#FFFBEB", ic:"#D97706" },
    { label:"Impayées",     val:impayees,                icon:"mail", bg:"#FFF7ED", ic:"#EA580C" },
  ];

  return (
    <div style={{ padding:"0 16px 16px" }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {kpis.map((k,i)=>(
          <Card key={i} style={{ padding:"14px 12px" }}>
            <div style={{ width:32, height:32, borderRadius:10, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
              <Ic n={k.icon} s={15} c={k.ic}/>
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:"#111" }}>{k.val}</div>
            <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card style={{ marginBottom:16 }}>
        <p style={{ fontWeight:800, fontSize:14, color:"#111", marginBottom:14 }}>Ventes vs Achats</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={CHART_DATA} barGap={4}>
            <CartesianGrid stroke="#F3F4F6" vertical={false}/>
            <XAxis dataKey="m" tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"#9CA3AF",fontSize:11}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:"#fff",border:"1px solid #F0F0F0",borderRadius:10,boxShadow:"0 4px 12px rgba(0,0,0,0.08)"}} itemStyle={{color:"#111"}} labelStyle={{color:"#666"}}/>
            <Bar dataKey="v" fill="#111" radius={[6,6,0,0]} name="Ventes"/>
            <Bar dataKey="a" fill="#E5E7EB" radius={[6,6,0,0]} name="Achats"/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Restaurants breakdown */}
      <Card>
        <p style={{ fontWeight:800, fontSize:14, color:"#111", marginBottom:12 }}>Par restaurant</p>
        {RESTAURANTS.map(r=>{
          const tot = ventes.filter(v=>v.restaurant===r.nom).reduce((s,v)=>s+v.montant,0);
          return (
            <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:r.couleur }}/>
                <span style={{ fontSize:14, fontWeight:600, color:"#374151" }}>{r.nom}</span>
                <span style={{ fontSize:11, color:"#9CA3AF" }}>×{r.taux}</span>
              </div>
              <span style={{ fontSize:14, fontWeight:700, color:"#111" }}>{tot.toFixed(3)} TND</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// VENTES
// ═══════════════════════════════════════════════════════════════════════════════
const Ventes = ({ ventes, setVentes, clients }) => {
  const [modal, setModal]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]     = useState(null);
  const [step, setStep]       = useState(1); // 1=calcul 2=facture
  const [calc, setCalc]       = useState({ brut:"", restaurant:"", montant:"", taux:"" });
  const [form, setForm]       = useState({ client_id:"", ref:"", date:"", montant:"", description:"" });
  const fileRef = useRef();

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setAlert(null); setLoading(true); setModal("new"); setStep(1);
    try {
      const b64 = await toBase64(file);
      const res = await analyserTableauVentes(b64);
      const r = RESTAURANTS.find(r=>r.nom===res.restaurant)||RESTAURANTS[0];
      const montant = calculerMontant(res.brut, r.taux);
      setCalc({ brut:String(res.brut||""), restaurant:r.nom, montant:montant.toFixed(3), taux:String(r.taux) });
      setAlert({ type:"success", msg:`✓ Brut détecté: ${res.brut} TND → Montant calculé: ${montant.toFixed(3)} TND` });
    } catch(err) {
      setAlert({ type:"error", msg:"Erreur IA. Saisis le montant brut manuellement." });
    } finally { setLoading(false); fileRef.current.value=""; }
  };

  const recalculate = () => {
    const r = RESTAURANTS.find(r=>r.nom===calc.restaurant)||RESTAURANTS[0];
    const montant = calculerMontant(Number(calc.brut), r.taux);
    setCalc(p=>({ ...p, montant:montant.toFixed(3), taux:String(r.taux) }));
  };

  const goToFacture = () => {
    const r = RESTAURANTS.find(r=>r.nom===calc.restaurant);
    const c = clients.find(c=>c.nom===calc.restaurant)||clients[0];
    setForm({
      client_id: String(c?.id||""),
      ref: `FACT-${String(ventes.length+1).padStart(3,"0")}`,
      date: new Date().toISOString().split("T")[0],
      montant: calc.montant,
      description: `Ventes semaine — ${calc.restaurant}`,
    });
    setStep(2);
  };

  const save = () => {
    const c = clients.find(x=>x.id===Number(form.client_id));
    const r = RESTAURANTS.find(r=>r.nom===calc.restaurant)||RESTAURANTS[0];
    const now = new Date();
    setVentes(p=>[{
      id: p.length+1, ref:form.ref, restaurant:r.nom,
      client: c?.nom||"—", date:form.date,
      brut: Number(calc.brut), montant:Number(form.montant),
      statut:"En attente", mois:now.getMonth(),
    },...p]);
    setModal(null); setAlert(null); setStep(1);
    setCalc({ brut:"", restaurant:"", montant:"", taux:"" });
  };

  const toggleStatut = (id) => {
    setVentes(p=>p.map(v=>v.id===id ? { ...v, statut:v.statut==="Payée"?"En attente":"Payée" } : v));
  };

  return (
    <div style={{ padding:"0 16px 16px" }}>
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <Btn label="Photo tableau" icon="cam" onClick={()=>fileRef.current.click()}/>
        <Btn label="Manuelle" icon="plus" onClick={()=>{ setCalc({brut:"",restaurant:"Jolene",montant:"",taux:"0.60"}); setAlert(null); setModal("new"); setStep(1); }} variant="outline"/>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
      </div>

      {ventes.map(v=>(
        <Card key={v.id} style={{ marginBottom:10, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:700, color:"#111" }}>{v.client}</span>
                <RestTag nom={v.restaurant}/>
              </div>
              <div style={{ fontSize:12, color:"#9CA3AF" }}>{v.ref} · {v.date}</div>
              {v.brut && <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>Brut: {v.brut.toLocaleString()} TND</div>}
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#111", marginBottom:6 }}>{v.montant.toFixed(3)} TND</div>
              <Badge label={v.statut} onClick={()=>toggleStatut(v.id)}/>
            </div>
          </div>
        </Card>
      ))}

      <Modal open={modal==="new"} onClose={()=>{setModal(null);setStep(1);}} title={step===1?"Calcul du montant":"Préparer la facture"}>
        {loading ? <AiLoader msg="Lecture du tableau de ventes…"/> : (
          <>
            {alert && <Alert type={alert.type} msg={alert.msg}/>}

            {step===1 && (
              <>
                {/* Restaurant selector */}
                <div style={{ marginBottom:12 }}>
                  <label style={{ display:"block", color:"#6B7280", fontSize:11, fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>Restaurant</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {RESTAURANTS.map(r=>(
                      <button key={r.id} onClick={()=>setCalc(p=>({...p,restaurant:r.nom,taux:String(r.taux)}))}
                        style={{ flex:1, padding:"10px 6px", borderRadius:10, border:`2px solid ${calc.restaurant===r.nom?r.couleur:"#E5E7EB"}`, background:calc.restaurant===r.nom?r.couleur+"12":"#fff", color:calc.restaurant===r.nom?r.couleur:"#6B7280", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
                        {r.nom}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label={`Montant brut (TND)`} value={calc.brut} onChange={v=>setCalc(p=>({...p,brut:v}))} type="number" placeholder="ex: 8000"/>

                {/* Formule visuelle */}
                {calc.brut && (
                  <div style={{ background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:12, padding:14, marginBottom:14 }}>
                    <p style={{ fontSize:11, color:"#9CA3AF", fontWeight:600, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>Calcul automatique</p>
                    <div style={{ fontSize:13, color:"#374151", lineHeight:2 }}>
                      <span>{calc.brut} ÷ 1.07 = <b>{(Number(calc.brut)/1.07).toFixed(3)}</b></span><br/>
                      <span><b>{(Number(calc.brut)/1.07).toFixed(3)}</b> × {calc.taux} = </span>
                      <span style={{ fontSize:16, fontWeight:800, color:"#111" }}>{calculerMontant(Number(calc.brut),Number(calc.taux)).toFixed(3)} TND</span>
                    </div>
                  </div>
                )}

                <Btn label="Préparer la facture →" icon="sell" onClick={goToFacture} full disabled={!calc.brut||!calc.restaurant}/>
              </>
            )}

            {step===2 && (
              <>
                <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
                  <p style={{ color:"#166534", fontSize:13, fontWeight:700 }}>Montant calculé : {calc.montant} TND ({calc.restaurant} — taux {calc.taux})</p>
                </div>
                <SelField label="Client" value={form.client_id} onChange={v=>setForm(p=>({...p,client_id:v}))} options={clients}/>
                <Field label="Référence" value={form.ref} onChange={v=>setForm(p=>({...p,ref:v}))} placeholder="FACT-XXX"/>
                <Field label="Date" value={form.date} onChange={v=>setForm(p=>({...p,date:v}))} type="date"/>
                <Field label="Montant (TND)" value={form.montant} onChange={v=>setForm(p=>({...p,montant:v}))} type="number"/>
                <Field label="Description" value={form.description} onChange={v=>setForm(p=>({...p,description:v}))} placeholder="Ventes semaine du…"/>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <Btn label="← Retour" onClick={()=>setStep(1)} variant="soft"/>
                  <Btn label="Enregistrer" icon="check" onClick={save} disabled={!form.client_id||!form.montant}/>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACHATS
// ═══════════════════════════════════════════════════════════════════════════════
const Achats = ({ achats, setAchats, fournisseurs }) => {
  const [modal, setModal]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]     = useState(null);
  const [form, setForm]       = useState({ fournisseur_id:"", ref:"", date:"", montant:"", statut:"En attente" });
  const fileRef = useRef();

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    setAlert(null); setLoading(true); setModal("form");
    try {
      const b64 = await toBase64(file);
      const res = await analyserFactureAchat(b64, fournisseurs);
      const f = fournisseurs.find(f=>f.nom===res.fournisseur)||fournisseurs[0];
      setForm({ fournisseur_id:String(f?.id||""), ref:res.ref||`ACH-${String(achats.length+1).padStart(3,"0")}`, date:res.date||new Date().toISOString().split("T")[0], montant:res.montant?String(res.montant):"", statut:"En attente" });
      setAlert({ type:"success", msg:"✓ Données extraites — vérifie et corrige si besoin" });
    } catch(err) {
      setAlert({ type:"error", msg:"Erreur IA. Saisis manuellement." });
    } finally { setLoading(false); fileRef.current.value=""; }
  };

  const save = () => {
    const f = fournisseurs.find(x=>x.id===Number(form.fournisseur_id));
    if(!f||!form.montant) return;
    const now = new Date();
    setAchats(p=>[{ id:p.length+1, ref:form.ref||`ACH-${String(p.length+1).padStart(3,"0")}`, fournisseur:f.nom, date:form.date||now.toISOString().split("T")[0], montant:Number(form.montant), statut:form.statut, mois:now.getMonth() },...p]);
    setModal(null); setAlert(null);
  };

  const toggleStatut = (id) => {
    setAchats(p=>p.map(a=>a.id===id?{...a,statut:a.statut==="Payée"?"En attente":"Payée"}:a));
  };

  return (
    <div style={{ padding:"0 16px 16px" }}>
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        <Btn label="Photo facture" icon="cam" onClick={()=>fileRef.current.click()}/>
        <Btn label="Manuelle" icon="plus" onClick={()=>{ setForm({fournisseur_id:"",ref:"",date:"",montant:"",statut:"En attente"}); setAlert(null); setModal("form"); }} variant="outline"/>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhoto}/>
      </div>

      {achats.map(a=>(
        <Card key={a.id} style={{ marginBottom:10, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#111" }}>{a.fournisseur}</div>
              <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{a.ref} · {a.date}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:15, fontWeight:800, color:"#111", marginBottom:6 }}>{a.montant.toLocaleString()} TND</div>
              <Badge label={a.statut} onClick={()=>toggleStatut(a.id)}/>
            </div>
          </div>
        </Card>
      ))}

      <Modal open={modal==="form"} onClose={()=>setModal(null)} title="Facture d'achat">
        {loading ? <AiLoader/> : (
          <>
            {alert && <Alert type={alert.type} msg={alert.msg}/>}
            <SelField label="Fournisseur" value={form.fournisseur_id} onChange={v=>setForm(p=>({...p,fournisseur_id:v}))} options={fournisseurs}/>
            <Field label="Référence" value={form.ref} onChange={v=>setForm(p=>({...p,ref:v}))} placeholder="ACH-XXX"/>
            <Field label="Date" value={form.date} onChange={v=>setForm(p=>({...p,date:v}))} type="date"/>
            <Field label="Montant (TND)" value={form.montant} onChange={v=>setForm(p=>({...p,montant:v}))} type="number" placeholder="0.000"/>
            <Btn label="Enregistrer" icon="check" onClick={save} disabled={!form.fournisseur_id||!form.montant} full/>
          </>
        )}
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ARCHIVES
// ═══════════════════════════════════════════════════════════════════════════════
const Archives = ({ ventes, achats }) => {
  const [moisSel, setMoisSel] = useState(new Date().getMonth());
  const [onglet, setOnglet]   = useState("ventes");

  const vF = ventes.filter(v=>v.mois===moisSel);
  const aF = achats.filter(a=>a.mois===moisSel);
  const tvF = vF.reduce((s,v)=>s+v.montant,0);
  const taF = aF.reduce((s,a)=>s+a.montant,0);

  return (
    <div style={{ padding:"0 16px 16px" }}>
      {/* Sélecteur mois */}
      <div style={{ overflowX:"auto", marginBottom:16, paddingBottom:4 }}>
        <div style={{ display:"flex", gap:8, width:"max-content" }}>
          {MOIS.map((m,i)=>(
            <button key={i} onClick={()=>setMoisSel(i)}
              style={{ padding:"8px 16px", borderRadius:20, border:"none", background:moisSel===i?"#111":"#F3F4F6", color:moisSel===i?"#fff":"#374151", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Outfit',sans-serif" }}>
              {m.slice(0,3)}
            </button>
          ))}
        </div>
      </div>

      {/* Résumé du mois */}
      <Card style={{ marginBottom:16 }}>
        <p style={{ fontWeight:800, fontSize:14, color:"#111", marginBottom:12 }}>{MOIS[moisSel]}</p>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:2 }}>Ventes</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#111" }}>{tvF.toFixed(3)} TND</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:2 }}>Achats</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#111" }}>{taF.toFixed(3)} TND</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:2 }}>Marge</div>
            <div style={{ fontSize:16, fontWeight:800, color:(tvF-taF)>=0?"#16A34A":"#DC2626" }}>{(tvF-taF).toFixed(3)} TND</div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#F3F4F6", borderRadius:12, padding:3, marginBottom:14 }}>
        {["ventes","achats"].map(t=>(
          <button key={t} onClick={()=>setOnglet(t)} style={{ flex:1, padding:"8px 0", borderRadius:10, border:"none", background:onglet===t?"#fff":"transparent", color:onglet===t?"#111":"#9CA3AF", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:onglet===t?"0 1px 4px rgba(0,0,0,0.08)":"none", fontFamily:"'Outfit',sans-serif" }}>
            {t==="ventes"?"Factures vente":"Factures achat"}
          </button>
        ))}
      </div>

      {onglet==="ventes" && (vF.length===0
        ? <p style={{color:"#9CA3AF",textAlign:"center",padding:"32px 0",fontSize:14}}>Aucune vente ce mois</p>
        : vF.map(v=>(
          <Card key={v.id} style={{ marginBottom:10, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#111" }}>{v.client}</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{v.ref} · {v.date}</div>
                <div style={{ marginTop:4 }}><RestTag nom={v.restaurant}/></div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:15, fontWeight:800, color:"#111", marginBottom:6 }}>{v.montant.toFixed(3)} TND</div>
                <Badge label={v.statut}/>
              </div>
            </div>
          </Card>
        ))
      )}

      {onglet==="achats" && (aF.length===0
        ? <p style={{color:"#9CA3AF",textAlign:"center",padding:"32px 0",fontSize:14}}>Aucun achat ce mois</p>
        : aF.map(a=>(
          <Card key={a.id} style={{ marginBottom:10, padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#111" }}>{a.fournisseur}</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{a.ref} · {a.date}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:15, fontWeight:800, color:"#111", marginBottom:6 }}>{a.montant.toLocaleString()} TND</div>
                <Badge label={a.statut}/>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMÈTRES
// ═══════════════════════════════════════════════════════════════════════════════
const Parametres = ({ fournisseurs, setFournisseurs, clients, setClients, articles, setArticles }) => {
  const [tab, setTab]   = useState("articles");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const tabs = [
    { id:"articles",    label:"Articles"      },
    { id:"clients",     label:"Clients"       },
    { id:"fournisseurs",label:"Fournisseurs"  },
    { id:"entreprise",  label:"Entreprise"    },
  ];

  const [entreprise, setEntreprise] = useState({ nom:"Royal Events Traiteur", adresse:"Tunis, Tunisie", tel:"", mf:"", email:"traiteur.royalevents@gmail.com", logo:"" });

  return (
    <div style={{ padding:"0 16px 16px" }}>
      {/* Tab bar horizontal scroll */}
      <div style={{ overflowX:"auto", marginBottom:16 }}>
        <div style={{ display:"flex", gap:6, width:"max-content" }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:"8px 16px", borderRadius:20, border:"none", background:tab===t.id?"#111":"#F3F4F6", color:tab===t.id?"#fff":"#374151", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Outfit',sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ARTICLES */}
      {tab==="articles" && (
        <>
          <div style={{marginBottom:12}}><Btn label="Ajouter un article" icon="plus" onClick={()=>{ setForm({nom:"",prix:""}); setModal("article"); }}/></div>
          {articles.map(a=>(
            <Card key={a.id} style={{ marginBottom:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#111"}}>{a.nom}</div>
                <div style={{fontSize:13,color:"#6B7280",marginTop:2}}>{a.prix.toFixed(3)} TND / unité</div>
              </div>
              <button onClick={()=>setArticles(p=>p.filter(x=>x.id!==a.id))} style={{background:"#FEE2E2",border:"none",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <Ic n="trash" s={14} c="#DC2626"/>
              </button>
            </Card>
          ))}
          <Modal open={modal==="article"} onClose={()=>setModal(null)} title="Nouvel article">
            <Field label="Nom de l'article" value={form.nom||""} onChange={v=>setForm(p=>({...p,nom:v}))} placeholder="ex: Plat principal"/>
            <Field label="Prix unitaire (TND)" value={form.prix||""} onChange={v=>setForm(p=>({...p,prix:v}))} type="number" placeholder="0.000"/>
            <Btn label="Ajouter" icon="check" full onClick={()=>{ if(!form.nom||!form.prix)return; setArticles(p=>[...p,{id:Date.now(),nom:form.nom,prix:Number(form.prix)}]); setModal(null); }} disabled={!form.nom||!form.prix}/>
          </Modal>
        </>
      )}

      {/* CLIENTS */}
      {tab==="clients" && (
        <>
          <div style={{marginBottom:12}}><Btn label="Ajouter un client" icon="plus" onClick={()=>{ setForm({nom:"",email:"",tel:"",adresse:""}); setModal("client"); }}/></div>
          {clients.map(c=>(
            <Card key={c.id} style={{ marginBottom:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#111"}}>{c.nom}</div>
                <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>{c.email}</div>
              </div>
              <button onClick={()=>setClients(p=>p.filter(x=>x.id!==c.id))} style={{background:"#FEE2E2",border:"none",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <Ic n="trash" s={14} c="#DC2626"/>
              </button>
            </Card>
          ))}
          <Modal open={modal==="client"} onClose={()=>setModal(null)} title="Nouveau client">
            <Field label="Nom *" value={form.nom||""} onChange={v=>setForm(p=>({...p,nom:v}))} placeholder="Nom du client"/>
            <Field label="Email" value={form.email||""} onChange={v=>setForm(p=>({...p,email:v}))} type="email" placeholder="email@client.tn"/>
            <Field label="Téléphone" value={form.tel||""} onChange={v=>setForm(p=>({...p,tel:v}))} placeholder="+216 XX XXX XXX"/>
            <Field label="Adresse" value={form.adresse||""} onChange={v=>setForm(p=>({...p,adresse:v}))} placeholder="Ville, Tunisie"/>
            <Btn label="Ajouter" icon="check" full onClick={()=>{ if(!form.nom)return; setClients(p=>[...p,{id:Date.now(),...form}]); setModal(null); }} disabled={!form.nom}/>
          </Modal>
        </>
      )}

      {/* FOURNISSEURS */}
      {tab==="fournisseurs" && (
        <>
          <div style={{marginBottom:12}}><Btn label="Ajouter un fournisseur" icon="plus" onClick={()=>{ setForm({nom:"",email:"",tel:""}); setModal("fourn"); }}/></div>
          {fournisseurs.map(f=>(
            <Card key={f.id} style={{ marginBottom:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#111"}}>{f.nom}</div>
                <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>{f.email} · {f.tel}</div>
              </div>
              <button onClick={()=>setFournisseurs(p=>p.filter(x=>x.id!==f.id))} style={{background:"#FEE2E2",border:"none",borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                <Ic n="trash" s={14} c="#DC2626"/>
              </button>
            </Card>
          ))}
          <Modal open={modal==="fourn"} onClose={()=>setModal(null)} title="Nouveau fournisseur">
            <Field label="Nom *" value={form.nom||""} onChange={v=>setForm(p=>({...p,nom:v}))} placeholder="Nom du fournisseur"/>
            <Field label="Email" value={form.email||""} onChange={v=>setForm(p=>({...p,email:v}))} type="email" placeholder="email@fournisseur.tn"/>
            <Field label="Téléphone" value={form.tel||""} onChange={v=>setForm(p=>({...p,tel:v}))} placeholder="+216 XX XXX XXX"/>
            <Btn label="Ajouter" icon="check" full onClick={()=>{ if(!form.nom)return; setFournisseurs(p=>[...p,{id:Date.now(),...form}]); setModal(null); }} disabled={!form.nom}/>
          </Modal>
        </>
      )}

      {/* ENTREPRISE */}
      {tab==="entreprise" && (
        <Card>
          <p style={{fontWeight:800,fontSize:14,color:"#111",marginBottom:14}}>Mes informations</p>
          <Field label="Nom de l'entreprise" value={entreprise.nom} onChange={v=>setEntreprise(p=>({...p,nom:v}))} placeholder="Royal Events Traiteur"/>
          <Field label="Email (Gmail)" value={entreprise.email} onChange={v=>setEntreprise(p=>({...p,email:v}))} type="email" placeholder="traiteur.royalevents@gmail.com"/>
          <Field label="Téléphone" value={entreprise.tel} onChange={v=>setEntreprise(p=>({...p,tel:v}))} placeholder="+216 XX XXX XXX"/>
          <Field label="Adresse" value={entreprise.adresse} onChange={v=>setEntreprise(p=>({...p,adresse:v}))} placeholder="Tunis, Tunisie"/>
          <Field label="Matricule fiscal" value={entreprise.mf} onChange={v=>setEntreprise(p=>({...p,mf:v}))} placeholder="XXXX XXX XXX"/>
          <div style={{marginTop:8, padding:"10px 14px", background:"#FFF7ED", borderRadius:10, border:"1px solid #FED7AA"}}>
            <p style={{color:"#9A3412",fontSize:12,fontWeight:600}}>📎 Logo — à configurer lors du déploiement GitHub/Vercel</p>
          </div>
          <div style={{marginTop:12}}>
            <Btn label="Enregistrer" icon="check" full onClick={()=>{}}/>
          </div>
        </Card>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView]                   = useState("dash");
  const [fournisseurs, setFournisseurs]   = useState(INIT_FOURNISSEURS);
  const [clients, setClients]             = useState(INIT_CLIENTS);
  const [articles, setArticles]           = useState(INIT_ARTICLES);
  const [ventes, setVentes]               = useState(INIT_VENTES);
  const [achats, setAchats]               = useState(INIT_ACHATS);

  const nav = [
    { id:"dash",    label:"Dashboard", icon:"dash"    },
    { id:"ventes",  label:"Ventes",    icon:"sell"    },
    { id:"achats",  label:"Achats",    icon:"buy"     },
    { id:"archives",label:"Archives",  icon:"archive" },
    { id:"params",  label:"Réglages",  icon:"cog"     },
  ];
  const titles = { dash:"Tableau de bord", ventes:"Ventes", achats:"Achats", archives:"Archives", params:"Paramètres" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body{background:#F7F7F8;font-family:'Outfit',sans-serif}
        @keyframes slideUp{from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:0}
        input::placeholder,textarea::placeholder{color:#D1D5DB}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:0.4}
        select option{background:#fff;color:#111}
      `}</style>

      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#F7F7F8", display:"flex", flexDirection:"column" }}>

        {/* HEADER */}
        <div style={{ background:"#fff", borderBottom:"1px solid #F0F0F0", padding:"54px 20px 16px", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ fontSize:11, fontWeight:600, color:"#9CA3AF", letterSpacing:1.5, textTransform:"uppercase", marginBottom:2 }}>Royal Events</p>
              <h1 style={{ fontSize:22, fontWeight:900, color:"#111" }}>{titles[view]}</h1>
            </div>
            <div style={{ width:40, height:40, borderRadius:12, background:"#111", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:"#fff", fontWeight:900, fontSize:16, fontFamily:"'Outfit',sans-serif" }}>RE</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:"auto", paddingTop:16, paddingBottom:88 }}>
          {view==="dash"     && <Dashboard ventes={ventes} achats={achats}/>}
          {view==="ventes"   && <Ventes ventes={ventes} setVentes={setVentes} clients={clients}/>}
          {view==="achats"   && <Achats achats={achats} setAchats={setAchats} fournisseurs={fournisseurs}/>}
          {view==="archives" && <Archives ventes={ventes} achats={achats}/>}
          {view==="params"   && <Parametres fournisseurs={fournisseurs} setFournisseurs={setFournisseurs} clients={clients} setClients={setClients} articles={articles} setArticles={setArticles}/>}
        </div>

        {/* BOTTOM NAV */}
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(16px)", borderTop:"1px solid #F0F0F0", display:"flex", padding:"10px 4px 24px", zIndex:200 }}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, border:"none", background:"transparent", cursor:"pointer", padding:"4px 0" }}>
              <div style={{ width:40, height:32, borderRadius:10, background:view===n.id?"#111":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"background 0.2s" }}>
                <Ic n={n.icon} s={18} c={view===n.id?"#fff":"#9CA3AF"}/>
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:view===n.id?"#111":"#9CA3AF", fontFamily:"'Outfit',sans-serif" }}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
