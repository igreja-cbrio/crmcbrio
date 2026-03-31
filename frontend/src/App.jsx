import { useState, useEffect, useCallback, useRef, useMemo } from "react";

function useWindowWidth(){const[w,setW]=useState(window.innerWidth);useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h);},[]);return w;}
import { auth as authApi, events as eventsApi, projects as projectsApi, expansion as expansionApi, meetings as meetingsApi, agents as agentsApi, setToken, clearToken, getToken } from "./api.js";

// ── Theme ──
const C = { deep:"#00839D", teal:"#00ACB3", sand:"#EDE0D4", mint:"#C3E4E3", cream:"#F2ECE8", white:"#FFFFFF", dark:"#1A1A1A", text:"#2D2D2D", t2:"#6B6B6B", t3:"#9B9B9B", border:"#E0D8CE", bg:"#F8F5F1", accent:"#00839D", accentBg:"rgba(0,131,157,0.06)", tealBg:"rgba(0,172,179,0.08)" };
const ST = { "no-prazo":{l:"No prazo",c:"#4ADE80",bg:"rgba(74,222,128,0.12)"}, "em-risco":{l:"Em risco",c:"#FBBF24",bg:"rgba(251,191,36,0.12)"}, "atrasado":{l:"Atrasado",c:"#F87171",bg:"rgba(248,113,113,0.12)"}, "concluido":{l:"Concluído",c:"#00839D",bg:"rgba(0,131,157,0.12)"} };
const ROLES = { diretor:{label:"Diretor",canEdit:true,seeProjects:true,seeExpansion:true,seeAgents:true,seeReport:true,seeBackup:true}, admin:{label:"Administração",canEdit:false,seeProjects:true,seeExpansion:true,seeAgents:false,seeReport:false,seeBackup:false}, assistente:{label:"Assistente",canEdit:false,seeProjects:false,seeExpansion:false,seeAgents:false,seeReport:false,seeBackup:false} };

// ── Helpers ──
const norm = d => d ? String(d).slice(0,10) : '';
const fD = d => { if(!d) return ''; const [y,m,dd] = norm(d).split('-'); return `${dd}/${m}/${y}`; };
const dU = d => { if(!d) return 999; const t = new Date(norm(d)+'T12:00:00'); const n = new Date(); n.setHours(0,0,0,0); return Math.ceil((t-n)/86400000); };

// ── Components ──
function Btn({children,variant="primary",small,disabled,...p}){
  const s={primary:{background:C.accent,color:"#fff",border:"none"},ghost:{background:"transparent",color:C.accent,border:`1px solid ${C.border}`},danger:{background:"#FEE2E2",color:"#C94040",border:"none"}};
  return <button disabled={disabled} {...p} style={{padding:small?"4px 10px":"8px 16px",borderRadius:8,fontSize:small?11:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,...s[variant],...p.style}}>{children}</button>;
}
function Badge({status}){ const s=ST[status]||ST["no-prazo"]; return <span style={{padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,background:s.bg,color:s.c}}>{s.l}</span>; }
function Input({label,...p}){ return <div style={{marginBottom:10}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>{label}</label>}<input {...p} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,background:C.white,...p.style}}/></div>; }
function Select({label,children,...p}){ return <div style={{marginBottom:10}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>{label}</label>}<select {...p} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,background:C.white,...p.style}}>{children}</select></div>; }
function Textarea({label,...p}){ return <div style={{marginBottom:10}}>{label&&<label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>{label}</label>}<textarea {...p} style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:13,background:C.white,minHeight:60,resize:"vertical",...p.style}}/></div>; }
function Empty({title,sub,action}){ return <div style={{textAlign:"center",padding:40,color:C.t3}}><div style={{fontSize:15,fontWeight:600,marginBottom:4}}>{title}</div><div style={{fontSize:12,marginBottom:12}}>{sub}</div>{action}</div>; }
function Card({children,onClick,...p}){ return <div onClick={onClick} style={{padding:14,borderRadius:12,border:`1px solid ${C.border}`,background:C.white,cursor:onClick?"pointer":"default",transition:"all .12s",...p.style}} onMouseEnter={e=>{if(onClick){e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 2px 8px rgba(0,131,157,0.08)";}}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>{children}</div>; }
function DaysCounter({date}){ const d=dU(date); if(d===999) return null; const color=d<0?'#F87171':d<=7?'#FBBF24':'#4ADE80'; const text=d<0?`${Math.abs(d)}d atrás`:d===0?'Hoje':`${d}d`; return <span style={{fontSize:10,fontWeight:600,color,padding:"1px 6px",borderRadius:4,background:`${color}15`}}>{text}</span>; }
function ProgressBar({pct,height=6,color=C.teal}){return <div style={{height,borderRadius:height/2,background:C.cream,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,Math.max(0,pct||0))}%`,background:(pct||0)>=100?C.accent:color,borderRadius:height/2,transition:"width .4s"}}/></div>;}
function Modal({title,onClose,children}){ return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}><div style={{background:C.white,borderRadius:16,padding:24,maxWidth:500,width:"90%",maxHeight:"85vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,fontSize:16,fontWeight:700,color:C.text}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.t3}}>✕</button></div>{children}</div></div>; }

// ── Login Screen ──
function LoginScreen({onLogin}){
  const[email,setEmail]=useState('');const[pass,setPass]=useState('');const[err,setErr]=useState('');const[loading,setLoading]=useState(false);
  const doLogin=async()=>{
    setLoading(true);setErr('');
    try{ const r=await authApi.login(email,pass); setToken(r.token); onLogin({role:r.role,name:r.name,userId:r.userId}); }
    catch(e){ setErr(e.message||'Erro ao fazer login'); }
    finally{ setLoading(false); }
  };
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${C.mint},${C.cream})`}}>
    <div style={{background:C.white,borderRadius:20,padding:40,width:340,boxShadow:"0 8px 32px rgba(0,0,0,0.08)"}}>
      <div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:28,fontWeight:800,color:C.accent}}>CBRio</div><div style={{fontSize:12,color:C.t2}}>Project Management Office</div></div>
      <Input label="Usuário" placeholder="email ou nome" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
      <Input label="Senha" type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
      {err&&<div style={{color:"#C94040",fontSize:12,marginBottom:8}}>{err}</div>}
      <Btn onClick={doLogin} disabled={loading} style={{width:"100%",marginTop:8}}>{loading?"Entrando...":"Entrar"}</Btn>
    </div>
  </div>;
}

// ── Calendar ──
function Calendar({events=[],onSelect}){
  const today=new Date();today.setHours(0,0,0,0);
  const[vY,setVY]=useState(today.getFullYear());const[vM,setVM]=useState(today.getMonth());
  const MO=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const DA=["D","S","T","Q","Q","S","S"];
  const fd=new Date(vY,vM,1).getDay();const dim=new Date(vY,vM+1,0).getDate();
  const[selDay,setSelDay]=useState(null);
  const eventsByDate=useMemo(()=>{
    const m={};
    events.forEach(ev=>{
      const dates=(ev.occurrence_dates&&ev.occurrence_dates.length>0)?ev.occurrence_dates:[ev.date];
      dates.forEach(d=>{const k=norm(d);if(k){if(!m[k])m[k]=[];if(!m[k].find(e=>e.id===ev.id))m[k].push(ev);}});
    });
    return m;
  },[events]);
  const getEv=day=>{const ds=`${vY}-${String(vM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;return eventsByDate[ds]||[];};
  const selEvs=selDay?getEv(selDay):[];
  return <div style={{padding:16,borderRadius:14,background:C.white,border:`1px solid ${C.border}`,marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <button onClick={()=>{if(vM===0){setVM(11);setVY(vY-1);}else setVM(vM-1);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",color:C.text,fontSize:16,padding:"3px 10px"}}>‹</button>
      <div style={{textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:C.text}}>{MO[vM]}</div><div style={{fontSize:11,color:C.t2}}>{vY}</div></div>
      <button onClick={()=>{if(vM===11){setVM(0);setVY(vY+1);}else setVM(vM+1);}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",color:C.text,fontSize:16,padding:"3px 10px"}}>›</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
      {DA.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:C.t3,padding:4}}>{d}</div>)}
      {Array.from({length:fd}).map((_,i)=><div key={"e"+i}/>)}
      {Array.from({length:dim}).map((_,i)=>{const day=i+1;const evs=getEv(day);const isT=vY===today.getFullYear()&&vM===today.getMonth()&&day===today.getDate();const isSel=selDay===day;
        return <div key={day} onClick={()=>setSelDay(isSel?null:day)} style={{padding:"3px 1px",borderRadius:8,textAlign:"center",cursor:evs.length?"pointer":"default",background:isSel?C.accentBg:isT?"rgba(0,131,157,0.04)":"transparent",border:isT?`1.5px solid ${C.accent}`:"1.5px solid transparent",minHeight:36}}>
          <div style={{fontSize:12,fontWeight:isT?800:500,color:isT?C.accent:C.text}}>{day}</div>
          {evs.length>0&&<div style={{display:"flex",gap:2,justifyContent:"center",marginTop:1}}>{evs.slice(0,3).map((ev,j)=><div key={j} style={{width:5,height:5,borderRadius:"50%",background:ev.category_color||C.accent}}/>)}</div>}
        </div>;
      })}
    </div>
    {selEvs.length>0&&<div style={{marginTop:10,borderTop:`1px solid ${C.border}`,paddingTop:8}}>
      {selEvs.map(ev=><div key={ev.id} onClick={()=>onSelect&&onSelect(ev)} style={{padding:6,borderRadius:6,cursor:"pointer",fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center"}} className="hover-row">
        <span><span style={{width:6,height:6,borderRadius:"50%",background:ev.category_color||C.accent,display:"inline-block",marginRight:6}}/>  {ev.name}</span>
        <Badge status={ev.status}/>
      </div>)}
    </div>}
  </div>;
}

// ── Main App ──
export default function App(){
  const[auth,setAuth]=useState(()=>{try{const t=getToken();return t?{token:t}:null;}catch{return null;}});
  const[user,setUser]=useState(null);
  const[section,setSection]=useState("events");
  const[loading,setLoading]=useState(true);
  const[sideOpen,setSideOpen]=useState(false);
  const w=useWindowWidth();const isMobile=w<768;

  // Data stores
  const[eventsList,setEventsList]=useState([]);
  const[categories,setCategories]=useState([]);
  const[projectsList,setProjectsList]=useState([]);
  const[milestones,setMilestones]=useState([]);
  const[selectedEvent,setSelectedEvent]=useState(null);
  const[selectedProject,setSelectedProject]=useState(null);
  const[view,setView]=useState("dashboard");
  const[modal,setModal]=useState(null);
  const[evFilter,setEvFilter]=useState("all");
  const[evTab,setEvTab]=useState("dashboard");
  const[evSearch,setEvSearch]=useState("");
  const[duplicateData,setDuplicateData]=useState(null);

  // Auth check
  useEffect(()=>{
    if(!auth) { setLoading(false); return; }
    authApi.me().then(u=>{ setUser(u); setLoading(false); }).catch(()=>{ clearToken(); setAuth(null); setLoading(false); });
  },[auth]);

  const perm = ROLES[user?.role] || ROLES.assistente;
  const canEdit = perm.canEdit;

  const handleLogin = (data) => { setAuth({token:true}); setUser({role:data.role,name:data.name,id:data.userId}); };
  const logout = () => { clearToken(); setAuth(null); setUser(null); };

  // Load data
  const loadEvents = useCallback(async()=>{
    try{
      const[evs,cats]=await Promise.all([eventsApi.list(),eventsApi.categories()]);
      setEventsList(evs); setCategories(cats);
    }catch(e){console.error(e);}
  },[]);

  const loadProjects = useCallback(async()=>{
    try{ const p=await projectsApi.list(); setProjectsList(p); }catch(e){console.error(e);}
  },[]);

  const loadExpansion = useCallback(async()=>{
    try{ const m=await expansionApi.milestones(); setMilestones(m); }catch(e){console.error(e);}
  },[]);

  useEffect(()=>{ if(user) { loadEvents(); if(perm.seeProjects) loadProjects(); if(perm.seeExpansion) loadExpansion(); } },[user]);

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}><div style={{color:C.accent,fontSize:16}}>Carregando...</div></div>;
  if(!auth || !user) return <LoginScreen onLogin={handleLogin}/>;

  // ── KPI Cards ──
  const activeEvents = eventsList.filter(e=>e.status!=='concluido').length;
  const riskEvents = eventsList.filter(e=>e.status==='em-risco'||e.status==='atrasado').length;

  // ── Sidebar ──
  const sideItems = [
    {id:"events",label:"Eventos",color:C.accent,show:true},
    {id:"projects",label:"Projetos",color:"#1D9E75",show:perm.seeProjects},
    {id:"expansion",label:"Expansão",color:"#7F77DD",show:perm.seeExpansion},
    {id:"agents",label:"Agentes IA",color:"#D4910A",show:perm.seeAgents},
  ].filter(i=>i.show);

  const navTo=(id)=>{setSection(id);setView("dashboard");setSelectedEvent(null);setSelectedProject(null);setSideOpen(false);};

  return <div style={{display:"flex",minHeight:"100vh",background:C.bg}}>
    {/* Mobile backdrop */}
    {isMobile&&sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:150}}/>}

    {/* Sidebar */}
    <div style={{width:200,background:C.white,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,...(isMobile?{position:"fixed",top:0,left:0,bottom:0,zIndex:200,transform:sideOpen?"translateX(0)":"translateX(-100%)",transition:"transform .22s ease",boxShadow:sideOpen?"4px 0 20px rgba(0,0,0,0.12)":"none"}:{})}}>
      <div style={{padding:16,borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.accent}}>CBRio</h1><div style={{fontSize:10,color:C.t2}}>Project Management</div></div>
        {isMobile&&<button onClick={()=>setSideOpen(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.t3}}>✕</button>}
      </div>
      <div style={{flex:1,padding:"10px 8px"}}>
        {sideItems.map(item=>{const active=section===item.id;
          return <button key={item.id} onClick={()=>navTo(item.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:10,border:"none",background:active?C.accentBg:"transparent",color:active?C.accent:C.t2,cursor:"pointer",marginBottom:4,fontSize:13,fontWeight:active?700:500,textAlign:"left"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:active?C.accent:item.color,flexShrink:0}}/>
            <span>{item.label}</span>
          </button>;
        })}
      </div>
      <div style={{padding:12,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:12,fontWeight:600,color:C.text}}>{user.name}</div>
        <div style={{fontSize:10,color:C.t3,marginBottom:6}}>{perm.label}</div>
        <Btn small variant="ghost" onClick={logout} style={{width:"100%"}}>Sair</Btn>
      </div>
    </div>

    {/* Content */}
    <div style={{flex:1,overflow:"auto",minWidth:0}}>
      {/* Mobile top bar */}
      {isMobile&&<div style={{padding:"12px 16px",background:C.white,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100}}>
        <button onClick={()=>setSideOpen(true)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.accent,lineHeight:1}}>☰</button>
        <span style={{fontSize:16,fontWeight:800,color:C.accent}}>CBRio</span>
      </div>}
      <div style={{padding:isMobile?"14px 12px":"20px 24px"}}>

        {/* ═══ EVENTS SECTION ═══ */}
        {section==="events"&&<>
          {!selectedEvent ? <>
            <div className="header-actions">
              <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Eventos</h2>
              <div className="search-row">
                <input placeholder="Buscar evento..." value={evSearch} onChange={e=>setEvSearch(e.target.value)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12,width:180,background:C.white}}/>
                {canEdit&&<Btn onClick={()=>setModal("newEvent")}>+ Novo evento</Btn>}
              </div>
            </div>

            {/* Tabs de navegação */}
            <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:`1px solid ${C.border}`}}>
              {[["dashboard","Dashboard"],["lista","Lista"],["categorias","Categorias"]].map(([t,l])=><button key={t} onClick={()=>setEvTab(t)} style={{padding:"8px 18px",border:"none",borderBottom:evTab===t?`2px solid ${C.accent}`:"2px solid transparent",background:"transparent",color:evTab===t?C.accent:C.t3,cursor:"pointer",fontSize:13,fontWeight:evTab===t?700:500,marginBottom:-1}}>{l}</button>)}
            </div>

            {/* ── Dashboard ── */}
            {evTab==="dashboard"&&<>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
                {[{l:"Eventos ativos",v:activeEvents,c:C.accent},{l:"Em risco / Atrasados",v:riskEvents,c:"#F87171"},{l:"Projetos",v:projectsList.length,c:"#1D9E75"}].map(k=><div key={k.l} style={{padding:16,borderRadius:12,background:`${k.c}08`,border:`1px solid ${k.c}20`}}><div style={{fontSize:26,fontWeight:800,color:k.c}}>{k.v}</div><div style={{fontSize:10,color:C.t2,marginTop:4,fontWeight:600,textTransform:"uppercase"}}>{k.l}</div></div>)}
              </div>
              <div className="grid-2">
                <Calendar events={eventsList} onSelect={ev=>setSelectedEvent(ev)}/>
                <div>
                  <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                    {[["all","Todos"],["no-prazo","No prazo"],["em-risco","Em risco"],["atrasado","Atrasado"],["concluido","Finalizados"]].map(([f,l])=><button key={f} onClick={()=>setEvFilter(f)} style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",border:evFilter===f?`1.5px solid ${f==="all"?C.accent:(ST[f]?.c||C.accent)}`:`1px solid ${C.border}`,background:evFilter===f?(ST[f]?.bg||C.accentBg):"transparent",color:evFilter===f?(ST[f]?.c||C.accent):C.t3}}>{l}</button>)}
                  </div>
                  {(evFilter==="all"?eventsList.filter(e=>e.status!=='concluido'):eventsList.filter(e=>e.status===evFilter)).filter(e=>!evSearch||e.name.toLowerCase().includes(evSearch.toLowerCase())).slice(0,10).map(ev=><Card key={ev.id} onClick={()=>setSelectedEvent(ev)} style={{marginBottom:6,borderLeft:`4px solid ${ev.category_color||C.accent}`,paddingLeft:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text}}>{ev.name}</div>
                        <div style={{fontSize:11,color:C.t3,marginTop:2}}>{fD(ev.date)}{ev.category_name&&<span style={{color:ev.category_color}}> · {ev.category_name}</span>}</div>
                        {ev.tasks_total>0&&<div style={{marginTop:4,height:3,width:100,background:C.bg,borderRadius:2}}><div style={{height:"100%",width:`${Math.round((ev.tasks_done||0)/ev.tasks_total*100)}%`,background:C.accent,borderRadius:2}}/></div>}
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,marginLeft:8}}><DaysCounter date={ev.date}/><Badge status={ev.status}/></div>
                    </div>
                  </Card>)}
                </div>
              </div>
            </>}

            {/* ── Lista ── */}
            {evTab==="lista"&&<div>
              <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                {[["all","Todos"],["no-prazo","No prazo"],["em-risco","Em risco"],["atrasado","Atrasado"],["concluido","Finalizados"]].map(([f,l])=><button key={f} onClick={()=>setEvFilter(f)} style={{padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",border:evFilter===f?`1.5px solid ${f==="all"?C.accent:(ST[f]?.c||C.accent)}`:`1px solid ${C.border}`,background:evFilter===f?(ST[f]?.bg||C.accentBg):"transparent",color:evFilter===f?(ST[f]?.c||C.accent):C.t3}}>{l}</button>)}
              </div>
              {(evFilter==="all"?eventsList:eventsList.filter(e=>e.status===evFilter)).filter(e=>!evSearch||e.name.toLowerCase().includes(evSearch.toLowerCase())).map(ev=><Card key={ev.id} onClick={()=>setSelectedEvent(ev)} style={{marginBottom:6,borderLeft:`4px solid ${ev.category_color||C.accent}`,paddingLeft:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{ev.name}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:2}}>{fD(ev.date)}{ev.category_name&&<span style={{color:ev.category_color}}> · {ev.category_name}</span>}</div>
                    {ev.tasks_total>0&&<div style={{marginTop:4,height:3,width:100,background:C.bg,borderRadius:2}}><div style={{height:"100%",width:`${Math.round((ev.tasks_done||0)/ev.tasks_total*100)}%`,background:C.accent,borderRadius:2}}/></div>}
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,marginLeft:8}}><DaysCounter date={ev.date}/><Badge status={ev.status}/></div>
                </div>
              </Card>)}
              {eventsList.length===0&&<Empty title="Nenhum evento" sub="Crie eventos para começar" action={canEdit&&<Btn onClick={()=>setModal("newEvent")}>+ Primeiro evento</Btn>}/>}
            </div>}

            {/* ── Categorias ── */}
            {evTab==="categorias"&&<div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
                <button onClick={()=>setEvFilter("all")} style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:`2px solid ${evFilter==="all"?C.accent:C.border}`,background:evFilter==="all"?C.accentBg:"transparent",color:evFilter==="all"?C.accent:C.t2}}>Todos</button>
                {categories.map(cat=><button key={cat.id} onClick={()=>setEvFilter(cat.id)} style={{padding:"7px 16px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",border:`2px solid ${evFilter===cat.id?cat.color:C.border}`,background:evFilter===cat.id?`${cat.color}15`:"transparent",color:evFilter===cat.id?cat.color:C.t2}}>{cat.name}</button>)}
              </div>
              {(evFilter==="all"?eventsList:eventsList.filter(e=>e.category_id===evFilter)).filter(e=>!evSearch||e.name.toLowerCase().includes(evSearch.toLowerCase())).map(ev=><Card key={ev.id} onClick={()=>setSelectedEvent(ev)} style={{marginBottom:6,borderLeft:`4px solid ${ev.category_color||C.accent}`,paddingLeft:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{ev.name}</div>
                    <div style={{fontSize:11,color:C.t3,marginTop:2}}>{fD(ev.date)} · {ev.category_name||'Sem categoria'}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}><DaysCounter date={ev.date}/><Badge status={ev.status}/></div>
                </div>
              </Card>)}
              {categories.length===0&&<Empty title="Nenhuma categoria" sub="Cadastre categorias no banco de dados"/>}
            </div>}

          </> : <>
            {/* Event Detail */}
            <div style={{marginBottom:16}}>
              <button onClick={()=>setSelectedEvent(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:13,fontWeight:600}}>← Voltar</button>
            </div>
            <EventDetail event={selectedEvent} canEdit={canEdit} onReload={async()=>{await loadEvents();const fresh=await eventsApi.get(selectedEvent.id);setSelectedEvent(fresh);}} categories={categories} onDuplicate={data=>{setDuplicateData(data);setSelectedEvent(null);}} onFinish={()=>setSelectedEvent(null)}/>
          </>}
        </>}

        {/* ═══ PROJECTS SECTION ═══ */}
        {section==="projects"&&<>
          {!selectedProject ? <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700,color:C.text}}>Projetos Anuais</h2>
              {canEdit&&<Btn onClick={()=>setModal("newProject")}>+ Novo projeto</Btn>}
            </div>
            {projectsList.length===0?<Empty title="Nenhum projeto" sub="Crie projetos para organizar iniciativas anuais" action={canEdit&&<Btn onClick={()=>setModal("newProject")}>+ Primeiro projeto</Btn>}/>:
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                {projectsList.map(p=><Card key={p.id} onClick={()=>setSelectedProject(p)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
                    <div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{p.name}</div><div style={{fontSize:11,color:C.t3}}>{p.year} · {p.area||'Sem área'}</div></div>
                    <Badge status={p.status==='planejamento'?'no-prazo':p.status==='em-andamento'?'em-risco':p.status==='concluido'?'concluido':'atrasado'}/>
                  </div>
                  {p.description&&<div style={{fontSize:12,color:C.t2,marginTop:6}}>{p.description.slice(0,100)}</div>}
                </Card>)}
              </div>}
          </> : <>
            <button onClick={()=>setSelectedProject(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:13,fontWeight:600,marginBottom:12}}>← Voltar</button>
            <ProjectDetail project={selectedProject} canEdit={canEdit} onReload={async()=>{await loadProjects();const fresh=await projectsApi.get(selectedProject.id);setSelectedProject(fresh);}}/>
          </>}
        </>}

        {/* ═══ EXPANSION SECTION ═══ */}
        {section==="expansion"&&<ExpansionSection milestones={milestones} canEdit={canEdit} onReload={loadExpansion} onNewMilestone={()=>setModal("newMilestone")}/>}

        {/* ═══ AGENTS SECTION ═══ */}
        {section==="agents"&&<AgentsView/>}
      </div>
    </div>

    {/* ═══ MODALS ═══ */}
    {modal==="newEvent"&&<EventFormModal categories={categories} onClose={()=>setModal(null)} onSave={async(data)=>{await eventsApi.create(data);loadEvents();setModal(null);}}/>}
    {duplicateData&&<EventFormModal categories={categories} initial={duplicateData} onClose={()=>setDuplicateData(null)} onSave={async(data)=>{await eventsApi.create(data);loadEvents();setDuplicateData(null);}}/>}
    {modal==="newProject"&&<ProjectFormModal onClose={()=>setModal(null)} onSave={async(data)=>{await projectsApi.create(data);loadProjects();setModal(null);}}/>}
    {modal==="newMilestone"&&<MilestoneFormModal onClose={()=>setModal(null)} onSave={async(data)=>{await expansionApi.createMilestone(data);loadExpansion();setModal(null);}}/>}
  </div>;
}

// ── Event Detail Component ──
function EventDetail({event:ev,canEdit,onReload,categories,onDuplicate,onFinish}){
  const[detail,setDetail]=useState(null);const[tab,setTab]=useState("tasks");
  const[taskModal,setTaskModal]=useState(false);const[meetModal,setMeetModal]=useState(false);
  const[taskView,setTaskView]=useState("lista");const[dragId,setDragId]=useState(null);
  const[selOcc,setSelOcc]=useState(null);
  const[notesDraft,setNotesDraft]=useState('');
  const[notesDirty,setNotesDirty]=useState(false);
  useEffect(()=>{eventsApi.get(ev.id).then(setDetail).catch(console.error);},[ev.id]);
  useEffect(()=>{if(selOcc){setNotesDraft(selOcc.notes||'');setNotesDirty(false);}},[selOcc?.id]);
  if(!detail) return <div style={{padding:20,color:C.t3}}>Carregando...</div>;
  const tasks=detail.tasks||[];const occs=detail.occurrences||[];const mtgs=detail.meetings||[];
  const reload=async()=>{const fresh=await eventsApi.get(ev.id);setDetail(fresh);onReload();};
  const doneTasks=tasks.filter(t=>t.status==='concluida').length;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:16}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{detail.name}</h2>
        <div style={{fontSize:12,color:C.t2,marginTop:2}}>{fD(detail.date)} · {detail.category_name||'Sem categoria'} · {detail.responsible||'Sem responsável'}</div>
        {tasks.length>0&&<div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}><div style={{height:4,width:120,background:C.bg,borderRadius:2}}><div style={{height:"100%",width:`${Math.round(doneTasks/tasks.length*100)}%`,background:C.accent,borderRadius:2}}/></div><span style={{fontSize:10,color:C.t3}}>{doneTasks}/{tasks.length} tarefas</span></div>}
      </div>
      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
        <Badge status={detail.status}/>
        {canEdit&&<Btn small variant="ghost" onClick={()=>onDuplicate&&onDuplicate({name:detail.name+' (cópia)',date:'',category_id:detail.category_id||'',description:detail.description||'',location:detail.location||'',responsible:detail.responsible||'',recurrence:'unico',budget_planned:detail.budget_planned||'',expected_attendance:detail.expected_attendance||'',status:'no-prazo',occurrence_dates:[]})}>Duplicar</Btn>}
        {canEdit&&detail.status!=='concluido'&&<Btn small onClick={async()=>{await eventsApi.update(ev.id,{...detail,status:'concluido'});await reload();onFinish&&onFinish();}}>✓ Finalizar</Btn>}
      </div>
    </div>
    {detail.description&&<div style={{fontSize:13,color:C.t2,marginBottom:12}}>{detail.description}</div>}

    {/* Occurrences pills */}
    {occs.length>0&&<div style={{marginBottom:12}}>
      <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:6}}>OCORRÊNCIAS ({occs.filter(o=>o.status==='concluido').length}/{occs.length}) — clique para ver detalhes</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {occs.map(o=>{const isSel=selOcc?.id===o.id;const isPast=dU(o.date)<0&&o.status!=='concluido';
          return <div key={o.id} onClick={()=>{setSelOcc(isSel?null:o);}} style={{padding:"5px 10px",borderRadius:8,cursor:"pointer",border:`2px solid ${isSel?C.accent:o.status==='concluido'?`rgba(0,131,157,0.2)`:C.border}`,background:isSel?C.accent:o.status==='concluido'?C.accentBg:isPast?"rgba(248,113,113,0.06)":C.cream,color:isSel?C.white:o.status==='concluido'?C.accent:isPast?"#F87171":C.text,textAlign:"center",minWidth:70,transition:"all .15s"}}>
            <div style={{fontSize:11,fontWeight:700}}>{fD(o.date)}</div>
            <div style={{fontSize:9,opacity:.8}}>{o.status==='concluido'?"Concluído":isPast?"Passou":"Pendente"}</div>
          </div>;})}
      </div>
      {selOcc&&<div style={{marginTop:8,padding:"12px 14px",borderRadius:10,background:C.cream,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:700,color:C.text}}>{fD(selOcc.date)} <DaysCounter date={selOcc.date}/></span>
          {canEdit&&<div style={{display:"flex",gap:4}}>
            {selOcc.status!=='concluido'&&<Btn small onClick={async()=>{await eventsApi.updateOccurrence(ev.id,selOcc.id,{status:'concluido'});const fresh=await eventsApi.get(ev.id);setDetail(fresh);setSelOcc(fresh.occurrences.find(o=>o.id===selOcc.id)||null);onReload();}}>✓ Finalizar esta</Btn>}
            {selOcc.status==='concluido'&&<Btn small variant="ghost" onClick={async()=>{await eventsApi.updateOccurrence(ev.id,selOcc.id,{status:'pendente'});const fresh=await eventsApi.get(ev.id);setDetail(fresh);setSelOcc(fresh.occurrences.find(o=>o.id===selOcc.id)||null);onReload();}}>↺ Reabrir</Btn>}
          </div>}
        </div>
        <textarea value={notesDraft} onChange={e=>{setNotesDraft(e.target.value);setNotesDirty(true);}} placeholder="Anotações / lições aprendidas desta ocorrência…" disabled={!canEdit} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${notesDirty?C.accent:C.border}`,fontSize:11,background:C.white,resize:"vertical",minHeight:50,boxSizing:"border-box",fontFamily:"inherit"}}/>
        {canEdit&&notesDirty&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:4}}>
          <Btn small onClick={async()=>{await eventsApi.updateOccurrence(ev.id,selOcc.id,{notes:notesDraft});setNotesDirty(false);const fresh=await eventsApi.get(ev.id);setDetail(fresh);setSelOcc(fresh.occurrences.find(o=>o.id===selOcc.id)||null);}}>Salvar anotações</Btn>
        </div>}
      </div>}
    </div>}

    {/* Tabs */}
    <div style={{display:"flex",gap:0,marginBottom:12,borderBottom:`1px solid ${C.border}`}}>
      {["tasks","meetings","info"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",border:"none",borderBottom:tab===t?`2px solid ${C.accent}`:"2px solid transparent",background:"transparent",color:tab===t?C.accent:C.t3,cursor:"pointer",fontSize:12,fontWeight:tab===t?700:500,marginBottom:-1}}>{{tasks:`Tarefas (${tasks.length})`,meetings:`Reuniões (${mtgs.length})`,info:"Info"}[t]}</button>)}
    </div>

    {tab==="tasks"&&<div>
      <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
        {canEdit&&<Btn small onClick={()=>setTaskModal(true)}>+ Tarefa</Btn>}
        <div style={{marginLeft:"auto",display:"flex",gap:2}}>
          {["lista","kanban"].map(v=><button key={v} onClick={()=>setTaskView(v)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:taskView===v?C.accentBg:"transparent",color:taskView===v?C.accent:C.t3,cursor:"pointer",fontSize:11,fontWeight:600}}>{{lista:"Lista",kanban:"Kanban"}[v]}</button>)}
        </div>
      </div>

      {taskView==="lista"&&tasks.map(t=><Card key={t.id} style={{marginTop:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{t.is_milestone&&<span style={{fontSize:10,background:"#FEF3C7",color:"#92400E",borderRadius:4,padding:"1px 5px",marginRight:4}}>MARCO</span>}{t.name}</div>
            <div style={{fontSize:11,color:C.t3}}>{t.responsible||'—'} · {fD(t.deadline)||'Sem prazo'} · {t.priority}{t.area&&` · ${t.area}`}</div>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <Badge status={t.status==='concluida'?'concluido':t.status==='bloqueada'?'atrasado':t.status==='em-andamento'?'em-risco':'no-prazo'}/>
            {canEdit&&<select value={t.status} onChange={async e=>{await eventsApi.updateTaskStatus(t.id,e.target.value);await reload();}} style={{fontSize:10,border:`1px solid ${C.border}`,borderRadius:4,padding:2}}>
              <option value="pendente">Pendente</option><option value="em-andamento">Em andamento</option><option value="concluida">Concluída</option><option value="bloqueada">Bloqueada</option>
            </select>}
          </div>
        </div>
        {t.description&&<div style={{fontSize:11,color:C.t2,marginTop:4}}>{t.description}</div>}
        {t.subtasks?.map(st=><div key={st.id} style={{display:"flex",alignItems:"center",gap:6,marginTop:4,fontSize:11}}>
          <input type="checkbox" checked={st.done} onChange={canEdit?async()=>{await eventsApi.toggleSubtask(st.id,!st.done);await reload();}:undefined} disabled={!canEdit}/>
          <span style={{textDecoration:st.done?"line-through":"none",color:st.done?C.t3:C.text}}>{st.name}</span>
        </div>)}
        {canEdit&&<button onClick={async()=>{const name=prompt("Subtarefa:");if(!name)return;await eventsApi.createSubtask(t.id,{name});await reload();}} style={{fontSize:10,color:C.accent,background:"none",border:"none",cursor:"pointer",marginTop:4}}>+ Subtarefa</button>}
        {t.comments?.length>0&&<div style={{marginTop:6,paddingTop:5,borderTop:`1px solid ${C.bg}`}}>
          {t.comments.slice(0,5).map(c=><div key={c.id} style={{fontSize:10,color:C.t2,marginTop:2}}><b style={{color:C.text}}>{c.author_name||'?'}</b>: {c.text}</div>)}
        </div>}
        {canEdit&&<input placeholder="Comentário (Enter para salvar)..." style={{width:"100%",fontSize:10,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.border}`,background:C.bg,boxSizing:"border-box",marginTop:5,fontFamily:"inherit"}} onKeyDown={async e=>{if(e.key==='Enter'&&e.target.value.trim()){await eventsApi.addComment(t.id,e.target.value.trim());e.target.value='';await reload();}}}/>}
      </Card>)}
      {tasks.length===0&&taskView==="lista"&&<Empty title="Nenhuma tarefa" sub="Adicione tarefas para organizar este evento"/>}

      {taskView==="kanban"&&<div className="kanban-grid" style={{marginTop:8}}>
        {[["pendente","Pendente","#9B9B9B"],["em-andamento","Em andamento","#FBBF24"],["concluida","Concluída","#4ADE80"]].map(([s,l,c])=><div key={s}
          onDragOver={e=>e.preventDefault()}
          onDrop={async e=>{e.preventDefault();if(dragId){await eventsApi.updateTaskStatus(dragId,s);await reload();setDragId(null);}}}
          style={{minHeight:120,background:`${c}08`,borderRadius:10,padding:8,border:`1px solid ${c}30`}}>
          <div style={{fontSize:11,fontWeight:700,color:c,marginBottom:8,textTransform:"uppercase"}}>{l} ({tasks.filter(t=>t.status===s).length})</div>
          {tasks.filter(t=>t.status===s).map(t=><div key={t.id} draggable onDragStart={()=>setDragId(t.id)} style={{padding:"8px 10px",borderRadius:8,background:C.white,border:`1px solid ${C.border}`,marginBottom:6,cursor:"grab",fontSize:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
            <div style={{fontWeight:600}}>{t.name}</div>
            <div style={{fontSize:10,color:C.t3,marginTop:2}}>{t.responsible||'—'}{t.deadline&&` · ${fD(t.deadline)}`}</div>
          </div>)}
        </div>)}
      </div>}
    </div>}

    {tab==="meetings"&&<div>
      {canEdit&&<Btn small onClick={()=>setMeetModal(true)}>+ Reunião</Btn>}
      {mtgs.length===0?<Empty title="Nenhuma reunião" sub="Registre reuniões sobre este evento"/>:
        mtgs.map(m=><Card key={m.id} style={{marginTop:8}}>
          <div style={{fontSize:13,fontWeight:600}}>{m.title} — {fD(m.date)}</div>
          {m.participants&&<div style={{fontSize:11,color:C.t2,marginTop:2}}>Participantes: {Array.isArray(m.participants)?m.participants.join(', '):String(m.participants).replace(/[{}"]/g,'')}</div>}
          {m.notes&&<div style={{fontSize:12,color:C.t2,marginTop:4}}>{m.notes}</div>}
          {m.decisions&&<div style={{fontSize:12,color:C.accent,marginTop:2}}>Decisões: {m.decisions}</div>}
          {m.pendencies?.map(p=><div key={p.id} style={{display:"flex",alignItems:"center",gap:6,marginTop:4,fontSize:11}}>
            <input type="checkbox" checked={p.done} onChange={canEdit?async()=>{await meetingsApi.togglePendency(p.id,!p.done);await reload();}:undefined} disabled={!canEdit}/>
            <span style={{textDecoration:p.done?"line-through":"none"}}>{p.description}{p.responsible&&<span style={{color:C.t3}}> — {p.responsible}</span>}</span>
          </div>)}
        </Card>)}
    </div>}

    {tab==="info"&&<div style={{fontSize:13,color:C.t2}}>
      <div className="info-grid">
        <div><strong>Local:</strong> {detail.location||'—'}</div>
        <div><strong>Orçamento:</strong> R$ {detail.budget_planned||0} (gasto: R$ {detail.budget_spent||0})</div>
        <div><strong>Público esperado:</strong> {detail.expected_attendance||'—'}</div>
        <div><strong>Público real:</strong> {detail.actual_attendance||'—'}</div>
        <div><strong>Recorrência:</strong> {detail.recurrence}</div>
      </div>
      {detail.notes&&<div style={{marginTop:8}}><strong>Notas:</strong><br/>{detail.notes}</div>}
      {detail.lessons_learned&&<div style={{marginTop:8}}><strong>Lições aprendidas:</strong><br/>{detail.lessons_learned}</div>}
    </div>}

    {taskModal&&<TaskFormModal onClose={()=>setTaskModal(false)} onSave={async data=>{await eventsApi.createTask(ev.id,data);await reload();setTaskModal(false);}}/>}
    {meetModal&&<MeetingFormModal onClose={()=>setMeetModal(false)} onSave={async data=>{await meetingsApi.create({event_id:ev.id,...data});await reload();setMeetModal(false);}}/>}
  </div>;
}

// ── Project Detail Component ──
function ProjectDetail({project:p,canEdit,onReload}){
  const[detail,setDetail]=useState(null);const[tab,setTab]=useState("tasks");
  useEffect(()=>{projectsApi.get(p.id).then(setDetail).catch(console.error);},[p.id]);
  if(!detail) return <div>Carregando...</div>;
  const tasks=detail.tasks||[];const objectives=detail.objectives||[];const mils=detail.milestones||[];const evts=detail.events||[];
  const avgPct=tasks.length?Math.round(tasks.reduce((a,t)=>a+(t.pct||0),0)/tasks.length):0;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:16}}>
      <div><h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text}}>{detail.name}</h2><div style={{fontSize:12,color:C.t2}}>{detail.year} · {detail.area||'Sem área'} · {detail.owner_name||'Sem dono'}</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:28,fontWeight:800,color:C.accent}}>{avgPct}%</div><div style={{fontSize:10,color:C.t3}}>Progresso</div></div>
    </div>
    {detail.description&&<div style={{fontSize:13,color:C.t2,marginBottom:12}}>{detail.description}</div>}
    <div style={{marginBottom:12,height:8,background:C.bg,borderRadius:4}}><div style={{height:"100%",width:`${avgPct}%`,background:C.accent,borderRadius:4}}/></div>

    <div style={{display:"flex",gap:4,marginBottom:12,borderBottom:`1px solid ${C.border}`,paddingBottom:4}}>
      {["tasks","objectives","milestones","events"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"6px 12px",border:"none",borderRadius:"8px 8px 0 0",background:tab===t?C.accentBg:"transparent",color:tab===t?C.accent:C.t3,cursor:"pointer",fontSize:12,fontWeight:tab===t?700:500}}>{{tasks:"Tarefas",objectives:"Objetivos",milestones:"Marcos",events:"Eventos"}[t]} ({({tasks,objectives,milestones,events:evts})[t].length})</button>)}
    </div>

    {tab==="tasks"&&<div>
      {canEdit&&<Btn small onClick={async()=>{const name=prompt("Nome da tarefa:");if(!name)return;await projectsApi.createTask(p.id,{name});const fresh=await projectsApi.get(p.id);setDetail(fresh);}}>+ Tarefa</Btn>}
      {tasks.map(t=><Card key={t.id} style={{marginTop:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:13,fontWeight:600}}>{t.name}</div><div style={{fontSize:11,color:C.t3}}>{t.responsible||'—'} · {fD(t.deadline)||'Sem prazo'}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13,fontWeight:700,color:C.accent}}>{t.pct||0}%</span>
            {canEdit&&<select value={t.status} onChange={async e=>{await projectsApi.updateTaskStatus(t.id,e.target.value);const fresh=await projectsApi.get(p.id);setDetail(fresh);}} style={{fontSize:10,border:`1px solid ${C.border}`,borderRadius:4,padding:2}}>
              <option value="pendente">Pendente</option><option value="em-andamento">Em andamento</option><option value="concluida">Concluída</option><option value="bloqueada">Bloqueada</option>
            </select>}
          </div>
        </div>
      </Card>)}
    </div>}

    {tab==="objectives"&&<div>
      {canEdit&&<Btn small onClick={async()=>{const name=prompt("Nome do objetivo:");if(!name)return;await projectsApi.createObjective(p.id,{name,target_value:100,unit:"%"});const fresh=await projectsApi.get(p.id);setDetail(fresh);}}>+ Objetivo</Btn>}
      {objectives.map(o=><Card key={o.id} style={{marginTop:8}}>
        <div style={{fontSize:13,fontWeight:600}}>{o.name}</div>
        <div style={{fontSize:11,color:C.t3}}>{o.current_value||0} / {o.target_value||100} {o.unit||'%'}</div>
        <div style={{marginTop:4,height:6,background:C.bg,borderRadius:3}}><div style={{height:"100%",width:`${Math.min(100,(o.current_value||0)/(o.target_value||100)*100)}%`,background:C.teal,borderRadius:3}}/></div>
      </Card>)}
    </div>}

    {tab==="milestones"&&<div>
      {canEdit&&<Btn small onClick={async()=>{const name=prompt("Nome do marco:");const date=prompt("Data (YYYY-MM-DD):");if(!name||!date)return;await projectsApi.createMilestone(p.id,{name,date});const fresh=await projectsApi.get(p.id);setDetail(fresh);}}>+ Marco</Btn>}
      {mils.map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginTop:6,fontSize:12}}>
        <input type="checkbox" checked={m.done} onChange={canEdit?async()=>{await projectsApi.toggleMilestone(m.id,!m.done);const fresh=await projectsApi.get(p.id);setDetail(fresh);}:undefined} disabled={!canEdit}/>
        <span style={{textDecoration:m.done?"line-through":"none"}}>{m.name}</span>
        <span style={{color:C.t3}}>{fD(m.date)}</span>
      </div>)}
    </div>}

    {tab==="events"&&<div>{evts.length===0?<div style={{fontSize:12,color:C.t3}}>Nenhum evento vinculado</div>:evts.map(e=><div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:6,fontSize:12}}><span>{e.name}</span><span style={{color:C.t3}}>{fD(e.date)}</span></div>)}</div>}
  </div>;
}

// ── Agents View ──
function AgentsView(){
  const[prompt,setPrompt]=useState('');const[result,setResult]=useState('');const[loading,setLoading]=useState(false);const[log,setLog]=useState([]);
  useEffect(()=>{agentsApi.log().then(setLog).catch(console.error);},[]);
  const generate=async()=>{
    if(!prompt.trim())return;setLoading(true);setResult('');
    try{const r=await agentsApi.generate({prompt,agent:'general'});setResult(r.text);agentsApi.log().then(setLog);}
    catch(e){setResult('Erro: '+e.message);}
    finally{setLoading(false);}
  };
  return <div>
    <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:700,color:C.text}}>Agentes IA</h2>
    <Card>
      <Textarea label="Prompt" placeholder="Ex: Gere um relatório semanal dos eventos..." value={prompt} onChange={e=>setPrompt(e.target.value)} style={{minHeight:80}}/>
      <Btn onClick={generate} disabled={loading}>{loading?"Gerando...":"Gerar com IA"}</Btn>
      {result&&<div style={{marginTop:12,padding:12,borderRadius:8,background:C.bg,fontSize:13,whiteSpace:"pre-wrap"}}>{result}</div>}
    </Card>
    {log.length>0&&<div style={{marginTop:16}}><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Histórico</div>
      {log.slice(0,10).map(l=><div key={l.id} style={{fontSize:11,color:C.t2,padding:4,borderBottom:`1px solid ${C.border}`}}>{new Date(l.created_at).toLocaleString('pt-BR')} — {l.action}</div>)}
    </div>}
  </div>;
}

// ── Form Modals ──
const AREAS=['Louvor','Mídia','Pastoral','Células','Expansão','Administrativo','Jovens','Crianças','Outros'];

function TaskFormModal({onClose,onSave}){
  const[f,setF]=useState({name:'',responsible:'',area:'',start_date:'',deadline:'',priority:'media',is_milestone:false,description:''});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  return <Modal title="Nova tarefa" onClose={onClose}>
    <Input label="Nome" value={f.name} onChange={e=>upd('name',e.target.value)}/>
    <Input label="Responsável" value={f.responsible} onChange={e=>upd('responsible',e.target.value)}/>
    <Select label="Área" value={f.area} onChange={e=>upd('area',e.target.value)}><option value="">Selecione</option>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</Select>
    <div style={{display:"flex",gap:8}}><div style={{flex:1}}><Input label="Data início" type="date" value={f.start_date} onChange={e=>upd('start_date',e.target.value)}/></div><div style={{flex:1}}><Input label="Prazo" type="date" value={f.deadline} onChange={e=>upd('deadline',e.target.value)}/></div></div>
    <Select label="Prioridade" value={f.priority} onChange={e=>upd('priority',e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="urgente">Urgente</option></Select>
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><input type="checkbox" id="cbm" checked={f.is_milestone} onChange={e=>upd('is_milestone',e.target.checked)}/><label htmlFor="cbm" style={{fontSize:13,color:C.text,cursor:"pointer"}}>É um marco</label></div>
    <Textarea label="Descrição" value={f.description} onChange={e=>upd('description',e.target.value)}/>
    <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>f.name&&onSave(f)} disabled={!f.name}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div>
  </Modal>;
}

function MeetingFormModal({onClose,onSave}){
  const[f,setF]=useState({title:'',date:norm(new Date().toISOString()),decisions:'',notes:''});
  const[participants,setParticipants]=useState([]);const[pInput,setPInput]=useState('');
  const[pendencies,setPendencies]=useState([]);const[pend,setPend]=useState({description:'',responsible:'',area:'',deadline:''});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const addPart=()=>{if(pInput.trim()){setParticipants(p=>[...p,pInput.trim()]);setPInput('');}};
  const addPend=()=>{if(pend.description.trim()){setPendencies(p=>[...p,{...pend}]);setPend({description:'',responsible:'',area:'',deadline:''});}};
  return <Modal title="Nova reunião" onClose={onClose}>
    <Input label="Título" value={f.title} onChange={e=>upd('title',e.target.value)}/>
    <Input label="Data" type="date" value={f.date} onChange={e=>upd('date',e.target.value)}/>
    <div style={{marginBottom:10}}>
      <label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>Participantes</label>
      <div style={{display:"flex",gap:4}}><input value={pInput} onChange={e=>setPInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addPart();}}} placeholder="Nome + Enter" style={{flex:1,padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,fontSize:12}}/><Btn small onClick={addPart}>+</Btn></div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>{participants.map((p,i)=><span key={i} style={{fontSize:11,padding:"2px 8px",borderRadius:12,background:C.accentBg,color:C.accent,cursor:"pointer"}} onClick={()=>setParticipants(ps=>ps.filter((_,j)=>j!==i))}>{p} ✕</span>)}</div>
    </div>
    <Textarea label="Decisões tomadas" value={f.decisions} onChange={e=>upd('decisions',e.target.value)}/>
    <Textarea label="Observações" value={f.notes} onChange={e=>upd('notes',e.target.value)}/>
    <div style={{marginBottom:10}}>
      <label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:4}}>Pendências</label>
      <div style={{padding:8,borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,marginBottom:6}}>
        <Input label="" placeholder="Descrição da pendência" value={pend.description} onChange={e=>setPend(p=>({...p,description:e.target.value}))} style={{marginBottom:4}}/>
        <div style={{display:"flex",gap:4}}>
          <input placeholder="Responsável" value={pend.responsible} onChange={e=>setPend(p=>({...p,responsible:e.target.value}))} style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:11}}/>
          <select value={pend.area} onChange={e=>setPend(p=>({...p,area:e.target.value}))} style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:11,background:C.white}}><option value="">Área</option>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</select>
          <input type="date" value={pend.deadline} onChange={e=>setPend(p=>({...p,deadline:e.target.value}))} style={{flex:1,padding:"5px 8px",borderRadius:6,border:`1px solid ${C.border}`,fontSize:11}}/>
          <Btn small onClick={addPend}>+</Btn>
        </div>
      </div>
      {pendencies.map((p,i)=><div key={i} style={{fontSize:11,padding:"5px 8px",borderRadius:6,background:C.white,border:`1px solid ${C.border}`,marginBottom:2,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{p.description}{p.responsible&&<span style={{color:C.t3}}> — {p.responsible}</span>}</span><span onClick={()=>setPendencies(ps=>ps.filter((_,j)=>j!==i))} style={{cursor:"pointer",color:C.t3,marginLeft:8}}>✕</span></div>)}
    </div>
    <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>f.title&&onSave({...f,participants,pendencies})} disabled={!f.title}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div>
  </Modal>;
}

function EventFormModal({categories,onClose,onSave,initial}){
  const[f,setF]=useState({name:'',date:'',category_id:'',description:'',location:'',responsible:'',recurrence:'unico',budget_planned:'',expected_attendance:'',status:'no-prazo',occurrence_dates:[],...(initial||{})});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  useEffect(()=>{
    if(f.recurrence==='unico'||!f.date){setF(p=>p.occurrence_dates.length?{...p,occurrence_dates:[]}:p);return;}
    const start=new Date(f.date+'T12:00:00');const dates=[];
    const intervals={semanal:7,quinzenal:14,mensal:30,bimestral:60,trimestral:90,semestral:180};
    const days=intervals[f.recurrence]||30;
    for(let i=0;i<12;i++){const d=new Date(start.getTime()+i*days*86400000);if(d.getFullYear()<=start.getFullYear()+1)dates.push(d.toISOString().slice(0,10));}
    setF(p=>({...p,occurrence_dates:dates}));
  },[f.recurrence,f.date]);
  return <Modal title={initial?"Duplicar evento":"Novo evento"} onClose={onClose}>
    <Input label="Nome" value={f.name} onChange={e=>upd('name',e.target.value)}/>
    <Input label="Data" type="date" value={f.date} onChange={e=>upd('date',e.target.value)}/>
    <Select label="Categoria" value={f.category_id} onChange={e=>upd('category_id',e.target.value)}><option value="">Selecione</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select>
    <Select label="Recorrência" value={f.recurrence} onChange={e=>upd('recurrence',e.target.value)}><option value="unico">Único</option><option value="semanal">Semanal</option><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option><option value="bimestral">Bimestral</option><option value="trimestral">Trimestral</option><option value="semestral">Semestral</option></Select>
    {f.occurrence_dates.length>0&&<div style={{marginBottom:10}}><div style={{fontSize:10,fontWeight:700,color:C.t2,marginBottom:4}}>OCORRÊNCIAS ({f.occurrence_dates.length})</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{f.occurrence_dates.map(d=><span key={d} style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:C.cream,border:`1px solid ${C.border}`}}>{fD(d)}</span>)}</div></div>}
    <Select label="Status" value={f.status} onChange={e=>upd('status',e.target.value)}>{Object.entries(ST).map(([v,s])=><option key={v} value={v}>{s.l}</option>)}</Select>
    <Input label="Responsável" value={f.responsible} onChange={e=>upd('responsible',e.target.value)}/>
    <Input label="Local" value={f.location} onChange={e=>upd('location',e.target.value)}/>
    <div style={{display:"flex",gap:8}}><div style={{flex:1}}><Input label="Orçamento R$" type="number" value={f.budget_planned} onChange={e=>upd('budget_planned',e.target.value)}/></div><div style={{flex:1}}><Input label="Público esperado" type="number" value={f.expected_attendance} onChange={e=>upd('expected_attendance',e.target.value)}/></div></div>
    <Textarea label="Descrição" value={f.description} onChange={e=>upd('description',e.target.value)}/>
    <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>onSave(f)}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div>
  </Modal>;
}

function ProjectFormModal({onClose,onSave}){
  const[f,setF]=useState({name:'',year:new Date().getFullYear(),description:'',area:'',priority:'media'});
  const upd=(k,v)=>setF({...f,[k]:v});
  return <Modal title="Novo projeto" onClose={onClose}>
    <Input label="Nome" value={f.name} onChange={e=>upd('name',e.target.value)}/>
    <Input label="Ano" type="number" value={f.year} onChange={e=>upd('year',parseInt(e.target.value))}/>
    <Input label="Área" value={f.area} onChange={e=>upd('area',e.target.value)}/>
    <Select label="Prioridade" value={f.priority} onChange={e=>upd('priority',e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="urgente">Urgente</option></Select>
    <Textarea label="Descrição" value={f.description} onChange={e=>upd('description',e.target.value)}/>
    <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>onSave(f)}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div>
  </Modal>;
}

function MilestoneFormModal({onClose,onSave}){
  const[f,setF]=useState({name:'',description:'',deadline:'',phase:''});
  const upd=(k,v)=>setF({...f,[k]:v});
  return <Modal title="Novo marco de expansão" onClose={onClose}>
    <Input label="Nome" value={f.name} onChange={e=>upd('name',e.target.value)}/>
    <Input label="Prazo" type="date" value={f.deadline} onChange={e=>upd('deadline',e.target.value)}/>
    <Input label="Fase" placeholder="Ex: 2025, 2026-2027" value={f.phase} onChange={e=>upd('phase',e.target.value)}/>
    <Textarea label="Descrição" value={f.description} onChange={e=>upd('description',e.target.value)}/>
    <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>onSave(f)}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div>
  </Modal>;
}

function MilestoneEditModal({milestone,onClose,onSave}){
  const[f,setF]=useState({name:milestone.name,description:milestone.description||'',deadline:milestone.deadline?norm(milestone.deadline):'',phase:milestone.phase||''});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  return <Modal title="Editar marco" onClose={onClose}>
    <Input label="Nome" value={f.name} onChange={e=>upd('name',e.target.value)}/>
    <Input label="Fase" placeholder="Ex: 2025, 2026-2027" value={f.phase} onChange={e=>upd('phase',e.target.value)}/>
    <Input label="Prazo" type="date" value={f.deadline} onChange={e=>upd('deadline',e.target.value)}/>
    <Textarea label="Descrição" value={f.description} onChange={e=>upd('description',e.target.value)}/>
    <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>f.name&&onSave(f)} disabled={!f.name}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div>
  </Modal>;
}

function ExpansionTaskModal({task,onClose,onSave}){
  const[f,setF]=useState({name:task?.name||'',responsible:task?.responsible||'',area:task?.area||'',start_date:task?.start_date?norm(task.start_date):'',deadline:task?.deadline?norm(task.deadline):'',description:task?.description||''});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  return <Modal title={task?"Editar tarefa":"Nova tarefa"} onClose={onClose}>
    <Input label="Nome" value={f.name} onChange={e=>upd('name',e.target.value)}/>
    <Input label="Responsável" value={f.responsible} onChange={e=>upd('responsible',e.target.value)}/>
    <Select label="Área" value={f.area} onChange={e=>upd('area',e.target.value)}><option value="">Selecione</option>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</Select>
    <div style={{display:"flex",gap:8}}><div style={{flex:1}}><Input label="Data início" type="date" value={f.start_date} onChange={e=>upd('start_date',e.target.value)}/></div><div style={{flex:1}}><Input label="Prazo" type="date" value={f.deadline} onChange={e=>upd('deadline',e.target.value)}/></div></div>
    <Textarea label="Descrição" value={f.description} onChange={e=>upd('description',e.target.value)}/>
    <div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={()=>f.name&&onSave(f)} disabled={!f.name}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div>
  </Modal>;
}

function ExpansionGantt({tasks}){
  if(!tasks.length)return null;
  const dates=tasks.flatMap(t=>[new Date(t.startDate+'T00:00:00'),new Date(t.deadline+'T00:00:00')]);
  let mn=new Date(Math.min(...dates)),mx=new Date(Math.max(...dates));
  mn.setDate(mn.getDate()-5);mx.setDate(mx.getDate()+5);
  const toP=d=>((new Date(d+'T00:00:00')-mn)/(mx-mn))*100;
  const today=new Date();today.setHours(0,0,0,0);const tP=((today-mn)/(mx-mn))*100;
  const sorted=[...tasks].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
  return <div style={{position:"relative",minWidth:300,overflowX:"auto"}}>
    {tP>=0&&tP<=100&&<div style={{position:"absolute",left:`${tP}%`,top:0,bottom:0,borderLeft:"2px solid #D4910A",zIndex:2,opacity:.6,pointerEvents:"none"}}><span style={{position:"absolute",top:-14,left:2,fontSize:9,color:"#D4910A",fontWeight:700}}>Hoje</span></div>}
    {sorted.map(task=>{const l=toP(task.startDate),r=toP(task.deadline),w=Math.max(r-l,2);const pct=task.subtasks?.length?Math.round(task.subtasks.reduce((s,x)=>s+(x.pct||0),0)/task.subtasks.length):0;
      return <div key={task.id} style={{position:"relative",height:28,marginBottom:4}}>
        <div style={{position:"absolute",left:0,width:`${Math.max(l-1,0)}%`,height:28,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:5}}>
          <span style={{fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:140,color:C.t2}}>{task.name}</span>
        </div>
        <div style={{position:"absolute",left:`${l}%`,width:`${w}%`,top:4,height:18,borderRadius:5,background:C.cream,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct>=100?C.accent:C.teal,borderRadius:4,transition:"width .3s"}}/>
          <span style={{position:"absolute",right:3,top:1,fontSize:8,fontWeight:700,color:C.text}}>{pct}%</span>
        </div>
      </div>;})}
  </div>;
}

// ── Expansion Section Component ──
function ExpansionSection({milestones,canEdit,onReload,onNewMilestone}){
  const[expView,setExpView]=useState("overview");
  const[selMiId,setSelMiId]=useState(null);
  const[expTab,setExpTab]=useState("kanban");
  const[taskModal,setTaskModal]=useState(false);
  const[editTask,setEditTask]=useState(null);
  const[editMi,setEditMi]=useState(null);
  const[miModal,setMiModal]=useState(false);

  const calcTaskPct=t=>{const s=t.subtasks||[];if(!s.length)return 0;return Math.round(s.reduce((a,st)=>a+(st.pct||0),0)/s.length);};
  const calcMiPct=mi=>{const tasks=mi.tasks||[];if(!tasks.length)return 0;return Math.round(tasks.reduce((a,t)=>a+calcTaskPct(t),0)/tasks.length);};
  const overallPct=milestones.length?Math.round(milestones.reduce((a,m)=>a+calcMiPct(m),0)/milestones.length):0;
  const allTasks=milestones.flatMap(m=>(m.tasks||[]).map(t=>({...t,milestoneName:m.name})));
  const selMi=milestones.find(m=>m.id===selMiId);

  if(expView==="overview") return <div>
    {/* Overall progress */}
    <div style={{padding:"18px 20px",borderRadius:14,background:C.white,border:`1px solid ${C.border}`,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:C.accent}}>Plano de expansão 2025–2029</div>
          <div style={{fontSize:12,color:C.t2,marginTop:2}}>{milestones.length} marcos · {allTasks.length} tarefas</div>
        </div>
        <div style={{textAlign:"right"}}><div style={{fontSize:28,fontWeight:800,color:overallPct>=100?C.accent:C.teal}}>{overallPct}%</div><div style={{fontSize:10,color:C.t2}}>concluído</div></div>
      </div>
      <ProgressBar pct={overallPct} height={8}/>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <span style={{fontSize:14,fontWeight:700,color:C.text}}>Marcos</span>
      {canEdit&&<Btn small onClick={onNewMilestone}>+ Marco</Btn>}
    </div>
    {milestones.length===0?<Empty title="Nenhum marco" sub="Crie marcos para organizar o plano de expansão"/>:
      milestones.map(mi=>{const pct=calcMiPct(mi);
        return <div key={mi.id} onClick={()=>{setSelMiId(mi.id);setExpView("milestone");setExpTab("kanban");}}
          style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${C.border}`,background:C.white,cursor:"pointer",marginBottom:8,position:"relative",overflow:"hidden"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 2px 8px rgba(0,131,157,0.08)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
          <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:pct>=100?C.accent:pct>0?C.teal:C.t3,borderRadius:"4px 0 0 4px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{paddingLeft:8}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{mi.name}</div>
              {mi.description&&<div style={{fontSize:12,color:C.t2,marginTop:1}}>{mi.description}</div>}
              <div style={{fontSize:11,color:C.t3,marginTop:1}}>{(mi.tasks||[]).length} tarefas{mi.deadline&&` · Prazo: ${fD(mi.deadline)}`}{mi.phase&&` · ${mi.phase}`}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:22,fontWeight:800,color:pct>=100?C.accent:C.teal}}>{pct}%</span>
              {canEdit&&<>
                <button onClick={e=>{e.stopPropagation();setEditMi(mi);setMiModal(true);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.t2,padding:"2px 6px"}}>✎</button>
                <button onClick={e=>{e.stopPropagation();if(window.confirm("Excluir marco e todas as tarefas?"))expansionApi.removeMilestone(mi.id).then(onReload);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#C94040",padding:"2px 6px"}}>✕</button>
              </>}
            </div>
          </div>
          <div style={{paddingLeft:8}}><ProgressBar pct={pct}/></div>
        </div>;
      })}
    {/* Gantt geral automático */}
    {(()=>{const withDates=allTasks.filter(t=>t.start_date&&t.deadline);if(!withDates.length)return null;return <div style={{marginTop:16,padding:16,borderRadius:12,background:C.white,border:`1px solid ${C.border}`}}>
      <div style={{fontSize:11,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:10}}>Cronograma geral</div>
      <ExpansionGantt tasks={withDates.map(t=>({...t,startDate:norm(t.start_date)}))}/>
    </div>;})()}
    {miModal&&editMi&&<MilestoneEditModal milestone={editMi} onClose={()=>setMiModal(false)} onSave={async d=>{await expansionApi.updateMilestone(editMi.id,d);await onReload();setMiModal(false);}}/>}
  </div>;

  if(expView==="milestone"&&selMi) return <div>
    <button onClick={()=>{setExpView("overview");setSelMiId(null);}} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:13,fontWeight:600,marginBottom:12}}>← Voltar aos marcos</button>
    <div style={{padding:"16px 18px",borderRadius:12,background:C.white,border:`1px solid ${C.border}`,marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.accent}}>{selMi.name}</div>
          {selMi.description&&<div style={{fontSize:12,color:C.t2,marginTop:2}}>{selMi.description}</div>}
          {selMi.deadline&&<div style={{fontSize:11,color:C.t3,marginTop:2}}>Prazo: {fD(selMi.deadline)} <DaysCounter date={selMi.deadline}/></div>}
        </div>
        <div style={{textAlign:"right"}}><div style={{fontSize:28,fontWeight:800,color:C.teal}}>{calcMiPct(selMi)}%</div></div>
      </div>
      <div style={{marginTop:10}}><ProgressBar pct={calcMiPct(selMi)} height={8}/></div>
    </div>
    <div style={{display:"flex",gap:0,marginBottom:12,borderBottom:`1px solid ${C.border}`}}>
      {[["kanban","Kanban"],["lista","Lista / Subtarefas"],["gantt","Cronograma"]].map(([k,l])=><button key={k} onClick={()=>setExpTab(k)} style={{padding:"7px 14px",border:"none",borderBottom:expTab===k?`2px solid ${C.accent}`:"2px solid transparent",background:"transparent",color:expTab===k?C.accent:C.t3,cursor:"pointer",fontSize:12,fontWeight:expTab===k?700:500,marginBottom:-1}}>{l}</button>)}
    </div>
    {canEdit&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><Btn small onClick={()=>{setEditTask(null);setTaskModal(true);}}>+ Tarefa</Btn></div>}

    {expTab==="kanban"&&<div className="kanban-grid">
      {[["pendente","Pendente","#9B9B9B"],["em-andamento","Em andamento",C.teal],["concluida","Concluída",C.accent]].map(([s,l,c])=>{
        const colTasks=(selMi.tasks||[]).filter(t=>{const p=calcTaskPct(t);return(p>=100?"concluida":p>0?"em-andamento":"pendente")===s;});
        return <div key={s} style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,minHeight:160}}>
          <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:"50%",background:c}}/><span style={{fontSize:11,fontWeight:700,color:C.text,textTransform:"uppercase"}}>{l}</span></div>
            <span style={{fontSize:11,fontWeight:700,color:C.t2,background:C.bg,borderRadius:10,padding:"1px 7px"}}>{colTasks.length}</span>
          </div>
          <div style={{padding:8,display:"flex",flexDirection:"column",gap:6}}>
            {colTasks.length===0&&<div style={{fontSize:11,color:C.t3,textAlign:"center",padding:12}}>Nenhuma tarefa</div>}
            {colTasks.map(task=>{const pct=calcTaskPct(task);return <div key={task.id} onClick={canEdit?()=>{setEditTask(task);setTaskModal(true);}:undefined} style={{padding:"10px 12px",borderRadius:10,background:C.bg,border:`1px solid ${C.border}`,cursor:canEdit?"pointer":"default"}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{task.name}</div>
              <div style={{display:"flex",gap:4,marginBottom:4,flexWrap:"wrap"}}>
                {task.responsible&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:C.white,color:C.t2,border:`1px solid ${C.border}`}}>{task.responsible}</span>}
                {task.deadline&&<DaysCounter date={task.deadline}/>}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t2,marginBottom:3}}><span>{(task.subtasks||[]).length} subtarefas</span><span style={{fontWeight:700,color:pct>=100?C.accent:C.teal}}>{pct}%</span></div>
              <ProgressBar pct={pct} height={4}/>
            </div>;})}
          </div>
        </div>;})}
    </div>}

    {expTab==="lista"&&<div>
      {(selMi.tasks||[]).length===0?<Empty title="Nenhuma tarefa" sub="Crie tarefas neste marco" action={canEdit&&<Btn small onClick={()=>{setEditTask(null);setTaskModal(true);}}>+ Tarefa</Btn>}/>:
        (selMi.tasks||[]).map(task=>{const pct=calcTaskPct(task);
          return <Card key={task.id} style={{marginBottom:8,borderLeft:`4px solid ${pct>=100?C.accent:pct>0?C.teal:C.t3}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.text}}>{task.name}</span>
                  <span style={{fontSize:11,fontWeight:700,color:pct>=100?C.accent:C.teal,background:pct>=100?C.accentBg:C.tealBg,padding:"2px 8px",borderRadius:10}}>{pct}%</span>
                </div>
                <div style={{fontSize:11,color:C.t2,marginTop:1}}>
                  {task.responsible&&<b>{task.responsible}</b>}{task.area&&` · ${task.area}`}{task.deadline&&` · ${fD(task.deadline)}`}{task.deadline&&<> <DaysCounter date={task.deadline}/></>}
                </div>
              </div>
              {canEdit&&<div style={{display:"flex",gap:3}}>
                <button onClick={()=>{setEditTask(task);setTaskModal(true);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.t2,padding:"2px 6px"}}>✎</button>
                <button onClick={async()=>{if(window.confirm("Excluir tarefa?"))await expansionApi.removeTask(task.id).then(onReload);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#C94040",padding:"2px 6px"}}>✕</button>
              </div>}
            </div>
            <ProgressBar pct={pct} height={5}/>
            {(task.subtasks||[]).length>0&&<div style={{marginTop:8}}>
              {(task.subtasks||[]).map(sub=><div key={sub.id} style={{display:"flex",alignItems:"center",gap:8,marginTop:4,padding:"5px 8px",borderRadius:8,background:C.bg}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:C.text,marginBottom:2}}>{sub.name}</div>
                  <ProgressBar pct={sub.pct||0} height={3}/>
                </div>
                {canEdit?<input type="range" min="0" max="100" step="5" defaultValue={sub.pct||0} onPointerUp={async e=>{await expansionApi.updateSubtaskPct(sub.id,parseInt(e.target.value));onReload();}} style={{width:60,accentColor:C.accent}}/>:null}
                <span style={{fontSize:11,fontWeight:700,color:(sub.pct||0)>=100?C.accent:C.teal,minWidth:30}}>{sub.pct||0}%</span>
                {canEdit&&<button onClick={async()=>{if(window.confirm("Excluir subtarefa?"))await expansionApi.removeSubtask(sub.id).then(onReload);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#C94040",padding:"0 2px",flexShrink:0}}>✕</button>}
              </div>)}
            </div>}
          </Card>;})}

      {/* Gantt automático abaixo da lista, quando há tarefas com datas */}
      {(()=>{const withDates=(selMi.tasks||[]).filter(t=>t.start_date&&t.deadline);if(!withDates.length)return null;return <div style={{marginTop:16,padding:16,borderRadius:12,background:C.white,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:11,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:10}}>Cronograma</div>
        <ExpansionGantt tasks={withDates.map(t=>({...t,startDate:norm(t.start_date)}))}/>
      </div>;})()}
    </div>}

    {expTab==="gantt"&&<div style={{padding:16,borderRadius:12,background:C.white,border:`1px solid ${C.border}`}}>
      {(selMi.tasks||[]).filter(t=>t.start_date&&t.deadline).length===0?
        <div style={{fontSize:12,color:C.t3,textAlign:"center",padding:20}}>Adicione datas de início e prazo nas tarefas para ver o cronograma</div>:
        <ExpansionGantt tasks={(selMi.tasks||[]).filter(t=>t.start_date&&t.deadline).map(t=>({...t,startDate:norm(t.start_date)}))}/>}
    </div>}

    {taskModal&&<ExpansionTaskModal task={editTask} onClose={()=>setTaskModal(false)} onSave={async d=>{
      if(editTask)await expansionApi.updateTask(editTask.id,d);
      else await expansionApi.createTask(selMiId,d);
      await onReload();setTaskModal(false);
    }}/>}
  </div>;

  return null;
}
