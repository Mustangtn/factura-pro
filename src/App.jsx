import { useState, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// â”€â”€â”€ CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEEPSEEK_API_KEY = "sk-a95aa6a8edcd405cb221e16bb93cf5cb";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

const RESTAURANTS = [
  { id: "jolene", nom: "Jolene",  taux: 0.60, couleur: "#E85D4A" },
  { id: "molo",   nom: "Molo",    taux: 0.65, couleur: "#2563EB" },
  { id: "aina",   nom: "Aina",    taux: 0.65, couleur: "#059669" },
];

const MOIS = ["Janvier","FÃ©vrier","Mars","Avril","Mai","Juin","Juillet","AoÃ»t","Septembre","Octobre","Novembre","DÃ©cembre"];

// formule: brut / 1.07 * taux
const calculerMontant = (brut, taux) => Math.round((brut / 1.07) * taux * 1000) / 1000;

// â”€â”€â”€ DONNÃ‰ES INITIALES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  { id: 1, ref:"FACT-001", restaurant:"Jolene", client:"Jolene Restaurant", date:"2025-04-02", brut:8000, montant:4486.000, statut:"PayÃ©e",    mois:3 },
  { id: 2, ref:"FACT-002", restaurant:"Molo",   client:"Molo Restaurant",   date:"2025-04-06", brut:5000, montant:3037.383, statut:"En attente", mois:3 },
];
const INIT_ACHATS = [
  { id: 1, ref:"ACH-001", fournisseur:"Fournisseur A", date:"2025-03-28", montant:1200, statut:"PayÃ©e",      mois:2 },
  { id: 2, ref:"ACH-002", fournisseur:"Fournisseur B", date:"2025-04-01", montant:850,  statut:"En attente", mois:3 },
  { id: 3, ref:"ACH-003", fournisseur:"Fournisseur C", date:"2025-04-03", montant:3200, statut:"PayÃ©e",      mois:3 },
];

const CHART_DATA = [
  { m:"Jan", v:8200,  a:4100 },
  { m:"FÃ©v", v:7500,  a:3800 },
  { m:"Mar", v:9800,  a:5200 },
  { m:"Avr", v:6800,  a:4050 },
];

// â”€â”€â”€ AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function analyserTableauVentes(imageBase64) {
  const res = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat", max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          { type:"text", text:`Analyse ce tableau de ventes. Trouve la colonne "brut" ou "Brut" et extrais le montant total. RÃ©ponds UNIQUEMENT en JSON sans texte autour : {"brut": nombre, "restaurant": "nom du restaurant si visible ou null", "periode": "pÃ©riode si visible ou null"}` },
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
        { type:"text", text:`Analyse cette facture. RÃ©ponds UNIQUEMENT en JSON : {"fournisseur":"parmi: ${noms}","montant":0,"date":"YYYY-MM-DD","ref":"ref"}` },
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

// â”€â”€â”€ ICÃ”NES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ UI PRIMITIVES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const Card = ({ children, style={} }) => (
  <div style={{ background:"#fff", borderRadius:16, border:"1px solid #F0F0F0", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", padding:16, ...style }}>{children}</div>
);

const Badge = ({ label, onClick }) => {
  const map = {
    "PayÃ©e":      { bg:"#DCFCE7", text:"#166534", dot:"#22C55E" },
    "En attente": { bg:"#FEF3C7", text:"#92400E", dot:"#F59E0B" },
    "EnvoyÃ©e":    { bg:"#DBEAFE", text:"#1E40AF", dot:"#3B82F6" },
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
      <option value="">-- SÃ©lectionner --</option>
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

const AiLoader = ({ msg="Analyse IA en coursâ€¦" }) => (
  <div style={{ textAlign:"center", padding:"32px 0" }}>
    <div style={{ width:52, height:52, borderRadius:"50%", background:"#F0F0FF", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", animation:"spin 1.4s linear infinite" }}>
      <Ic n="ai" s={22} c="#6366F1"/>
    </div>
    <p style={{ fontWeight:700, color:"#111", fontSize:15, marginBottom:4 }}>{msg}</p>
    <p style={{ color:"#9CA3AF", fontSize:12 }}>DeepSeek analyse ta photoâ€¦</p>
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

// â”€â”€â”€ REST TAG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RestTag = ({ nom }) => {
  const r = RESTAURANTS.find(r=>r.nom===nom);
  return <span style={{ background:r?.couleur+"18", color:r?.couleur||"#666", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{nom}</span>;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DASHBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const Dashboard = ({ ventes, achats }) => {
  const tv = ventes.reduce((s,v)=>s+v.montant,0);
  const ta = achats.reduce((s,a)=>s+a.montant,0);
  const impayees = ventes.filter(v=>v.statut!=="PayÃ©e").length;
  const marge = tv - ta;

  const kpis = [
    { label:"Ventes",       val:`${tv.toFixed(3)} TND`,  icon:"up",   bg:"#F0FDF4", ic:"#16A34A" },
    { label:"Achats",       val:`${ta.toFixed(3)} TND`,  icon:"down", bg:"#EFF6FF", ic:"#2563EB" },
    { label:"Marge",        val:`${marge.toFixed(3)} TND`, icon:"calc", bg:"#FFFBEB", ic:"#D97706" },
    { label:"ImpayÃ©es",     val:impayees,                icon:"mail", bg:"#FFF7ED", ic:"#EA580C" },
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
          const tot = ventes
