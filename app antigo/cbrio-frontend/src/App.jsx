import { useState, useEffect, useCallback, useRef } from "react";
import { auth as authApi, events as eventsApi, tasks as tasksApi, meetings as meetingsApi, expansion as expansionApi, agents as agentsApi } from "./api.js";

const C={deep:"#00839D",teal:"#00ACB3",sand:"#EDE0D4",mint:"#C3E4E3",cream:"#F2ECE8",white:"#FFFFFF",dark:"#1A1A1A",text:"#2D2D2D",t2:"#6B6B6B",t3:"#9B9B9B",border:"#E0D8CE",bg:"#F8F5F1",card:"#FFFFFF",accent:"#00839D",accentBg:"rgba(0,131,157,0.06)",tealBg:"rgba(0,172,179,0.08)"};
const BLUE="#00839D",TEAL="#00ACB3",GRAY="#9B9B9B";
const ROLES={diretor:{label:"Diretor",canEdit:true,seeExpansion:true,seeAgents:true,seeReport:true,seeBackup:true},admin:{label:"Administração",canEdit:false,seeExpansion:true,seeAgents:false,seeReport:false,seeBackup:false},assistente:{label:"Assistente",canEdit:false,seeExpansion:false,seeAgents:false,seeReport:false,seeBackup:false}};
const ST={"no-prazo":{l:"No prazo",c:"#00ACB3",bg:"rgba(0,172,179,0.1)",i:"●"},"em-risco":{l:"Em risco",c:"#D4910A",bg:"rgba(212,145,10,0.08)",i:"▲"},"atrasado":{l:"Atrasado",c:"#C94040",bg:"rgba(201,64,64,0.08)",i:"!"},"concluido":{l:"Finalizado",c:"#00839D",bg:"rgba(0,131,157,0.08)",i:"✓"}};
const TS={"pendente":{l:"Pendente",c:"#9B9B9B",bg:"rgba(155,155,155,0.08)"},"em-andamento":{l:"Em andamento",c:"#00ACB3",bg:"rgba(0,172,179,0.1)"},"concluida":{l:"Concluída",c:"#00839D",bg:"rgba(0,131,157,0.1)"},"bloqueada":{l:"Bloqueada",c:"#C94040",bg:"rgba(201,64,64,0.08)"}};
const PRI={"urgente":{l:"Urgente",c:"#C94040",i:"⬆⬆"},"alta":{l:"Alta",c:"#D4910A",i:"⬆"},"media":{l:"Média",c:"#00ACB3",i:"—"},"baixa":{l:"Baixa",c:"#9B9B9B",i:"⬇"}};
const CATEGORIES=["Evento especial","Rotina de Liturgia","Rotina Staff","Feriado","Geracional","Grupos","Outro"];
const CAT_COLORS={"Evento especial":"#2E7D32","Rotina de Liturgia":"#1565C0","Rotina Staff":"#4FC3F7","Feriado":"#F9A825","Geracional":"#E91E63","Grupos":"#00839D","Outro":"#9B9B9B"};
const AREAS=["Comunicação / Marketing","Louvor / Worship","Pastoral","Administrativo / Financeiro","Infraestrutura","Voluntários","Mídia / Audiovisual","Eventos","Expansão","Outro"];
const DD={events:[],tasks:[],meetings:[],pendencies:[],expansion:{milestones:[]}};
function gid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function norm(d){if(!d)return"";return String(d).slice(0,10);}
function dU(d){if(!d)return Infinity;const s=norm(d);const t=new Date();t.setHours(0,0,0,0);return Math.ceil((new Date(s+"T00:00:00")-t)/864e5);}
function fD(d){if(!d)return"";const s=norm(d);return new Date(s+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"});}
function fS(d){if(!d)return"";const s=norm(d);return new Date(s+"T00:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});}
function autoStatus(data){let nd={...data,events:[...data.events]};nd.events=nd.events.map(ev=>{if(ev.status==="concluido")return ev;
  const occs=(ev.occurrences||[norm(ev.date)]).map(norm);const occData=ev.occurrenceData||{};
  const activeOccs=occs.filter(d=>d&&(occData[d]?.status)!=="finalizado");
  if(activeOccs.length===0&&occs.length>1)return{...ev,status:"concluido",activeDate:null};
  const sorted=[...activeOccs].sort((a,b)=>new Date(a)-new Date(b));
  const nextFuture=sorted.find(d=>dU(d)>=0);
  const activeDate=nextFuture||sorted[sorted.length-1]||norm(ev.date);
  const evDays=dU(activeDate);
  const eid=ev.id;const et=nd.tasks.filter(t=>(t.eventId===eid||t.event_id===eid));
  let ns=ev.status;
  if(et.length>0){const overdue=et.filter(t=>t.status!=="concluida"&&t.deadline&&dU(t.deadline)<=-1).length;const done=et.filter(t=>t.status==="concluida").length;if(done===et.length)ns="concluido";else if(overdue>0||evDays<=-1)ns="atrasado";else if(evDays<=7&&evDays>=0)ns="em-risco";else ns="no-prazo";}
  else{if(evDays<=-1)ns="atrasado";else if(evDays<=7&&evDays>=0)ns="em-risco";else ns="no-prazo";}
  return{...ev,status:ns,activeDate};});return nd;}

// ── UI ──
const inp={width:"100%",padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:13,background:C.white,color:C.text,boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
function Badge({status,config=ST}){const c=config[status];if(!c)return null;return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,background:c.bg,color:c.c,whiteSpace:"nowrap"}}>{c.i&&<span style={{fontSize:7}}>{c.i}</span>}{c.l}</span>;}
function PriBadge({pri}){const p=PRI[pri];if(!p)return null;return <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,fontWeight:700,background:`${p.c}14`,color:p.c}}>{p.i} {p.l}</span>;}
function Days({date}){const d=dU(date);if(d===Infinity)return null;let c="#00ACB3",t=`${d}d`;if(d<0){c="#C94040";t=`${Math.abs(d)}d atrás`;}else if(d===0){c="#D4910A";t="Hoje";}else if(d<=7)c="#D4910A";return <span style={{fontSize:11,fontWeight:700,color:c}}>{t}</span>;}
function Empty({icon,title,sub,action}){return <div style={{textAlign:"center",padding:"40px 16px"}}><div style={{width:40,height:40,borderRadius:"50%",background:C.cream,border:`1.5px solid ${C.border}`,margin:"0 auto 12px",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:16,color:C.t3,lineHeight:1}}>{icon||"—"}</span></div><div style={{fontSize:14,fontWeight:600,color:C.t2,marginBottom:3}}>{title}</div><div style={{fontSize:12,color:C.t3,marginBottom:14}}>{sub}</div>{action}</div>;}
function Modal({open,onClose,title,children,wide}){if(!open)return null;return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"24px 12px",overflowY:"auto"}}><div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:18,width:"100%",maxWidth:wide?740:520,boxShadow:"0 20px 60px rgba(0,0,0,0.12)"}}><div style={{padding:"16px 22px",borderBottom:`1.5px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{margin:0,fontSize:16,fontWeight:700,color:C.text}}>{title}</h2><button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.t3}}>✕</button></div><div style={{padding:"16px 22px 22px",maxHeight:"75vh",overflowY:"auto"}}>{children}</div></div></div>;}
function DatePicker({label,value,onChange}){const[open,setOpen]=useState(false);const ref=useRef();const today=new Date();today.setHours(0,0,0,0);const[vY,setVY]=useState(value?new Date(value+"T00:00:00").getFullYear():today.getFullYear());const[vM,setVM]=useState(value?new Date(value+"T00:00:00").getMonth():today.getMonth());const MO=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];const DA=["D","S","T","Q","Q","S","S"];const fd=new Date(vY,vM,1).getDay();const dim=new Date(vY,vM+1,0).getDate();useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return ()=>document.removeEventListener("mousedown",h);},[open]);const sel=day=>{const d=`${vY}-${String(vM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;onChange({target:{value:d}});setOpen(false);};const dis=day=>{const d=new Date(vY,vM,day);d.setHours(0,0,0,0);return d<today;};const isT=day=>vY===today.getFullYear()&&vM===today.getMonth()&&day===today.getDate();const isS=day=>value===`${vY}-${String(vM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;const dv=value?new Date(value+"T00:00:00").toLocaleDateString("pt-BR"):"";return <div ref={ref} style={{display:"block",marginBottom:10,position:"relative"}}><span style={{display:"block",fontSize:10,fontWeight:700,marginBottom:4,color:C.t2,textTransform:"uppercase",letterSpacing:.6}}>{label}</span><div onClick={()=>{setOpen(!open);if(value){const d=new Date(value+"T00:00:00");setVY(d.getFullYear());setVM(d.getMonth());}}} style={{...inp,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:value?C.text:C.t3}}>{dv||"Selecione"}</span><span style={{color:C.accent}}>▾</span></div>{open&&<div style={{position:"absolute",top:"100%",left:0,zIndex:999,marginTop:4,background:C.white,border:`1.5px solid ${C.border}`,borderRadius:14,boxShadow:"0 12px 40px rgba(0,0,0,0.1)",padding:12,width:270}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><button onClick={()=>{if(vM===0){setVM(11);setVY(vY-1);}else setVM(vM-1);}} style={{background:C.cream,border:"none",borderRadius:8,cursor:"pointer",color:C.accent,fontSize:16,padding:"4px 12px",fontWeight:700}}>‹</button><span style={{fontSize:13,fontWeight:700,color:C.text}}>{MO[vM]} {vY}</span><button onClick={()=>{if(vM===11){setVM(0);setVY(vY+1);}else setVM(vM+1);}} style={{background:C.cream,border:"none",borderRadius:8,cursor:"pointer",color:C.accent,fontSize:16,padding:"4px 12px",fontWeight:700}}>›</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>{DA.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:C.t3,padding:3}}>{d}</div>)}{Array.from({length:fd}).map((_,i)=><div key={"e"+i}/>)}{Array.from({length:dim}).map((_,i)=>{const day=i+1;const d=dis(day);const s=isS(day);const t=isT(day);return <div key={day} onClick={()=>!d&&sel(day)} style={{textAlign:"center",padding:"6px 0",fontSize:12,fontWeight:s||t?700:400,borderRadius:8,background:s?C.accent:t?C.mint:"transparent",color:s?C.white:d?C.t3:t?C.accent:C.text,cursor:d?"not-allowed":"pointer",opacity:d?.3:1}}>{day}</div>;})}</div></div>}</div>;}
function Inp({label,...p}){if(p.type==="date")return <DatePicker label={label} value={p.value} onChange={p.onChange}/>;return <label style={{display:"block",marginBottom:10}}><span style={{display:"block",fontSize:10,fontWeight:700,marginBottom:4,color:C.t2,textTransform:"uppercase",letterSpacing:.6}}>{label}</span><input {...p} style={{...inp,...p.style}}/></label>;}
function Txa({label,...p}){return <label style={{display:"block",marginBottom:10}}><span style={{display:"block",fontSize:10,fontWeight:700,marginBottom:4,color:C.t2,textTransform:"uppercase",letterSpacing:.6}}>{label}</span><textarea {...p} style={{...inp,minHeight:54,resize:"vertical",...p.style}}/></label>;}
function Sel({label,options,...p}){return <label style={{display:"block",marginBottom:10}}><span style={{display:"block",fontSize:10,fontWeight:700,marginBottom:4,color:C.t2,textTransform:"uppercase",letterSpacing:.6}}>{label}</span><select {...p} style={inp}>{options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;}
function Btn({children,variant="primary",small,...p}){const s={primary:{background:C.accent,color:C.white,border:"none"},secondary:{background:"transparent",color:C.text,border:`1.5px solid ${C.border}`},danger:{background:"rgba(201,64,64,0.06)",color:"#C94040",border:"1.5px solid rgba(201,64,64,0.2)"},ghost:{background:"transparent",color:C.t2,border:"none"},accent:{background:C.tealBg,color:C.teal,border:`1.5px solid rgba(0,172,179,0.2)`},success:{background:C.accentBg,color:C.accent,border:`1.5px solid rgba(0,131,157,0.2)`}};return <button {...p} style={{padding:small?"4px 12px":"8px 18px",borderRadius:10,fontSize:small?11:12,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,transition:"all .15s",...s[variant],...(p.disabled?{opacity:.35,cursor:"not-allowed"}:{}), ...p.style}}>{children}</button>;}

// ── Progress Bar ──
function ProgressBar({pct,height=6,color=C.teal}){return <div style={{height,borderRadius:height/2,background:C.cream,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:pct>=100?C.accent:color,borderRadius:height/2,transition:"width .4s"}}/></div>;}

// -- Event Detail with individual occurrences --
function EventDetail({ev,data,persist,reload,isAdmin,onBack,openEditEv,delEv,openNewTk,openEditTk,delTk,evTasks,chgTkSt,openNewMt,openEditMt,evMeetings,delMt,togPend,tab,setTab,doConfirm}){
  const occs=ev.occurrences||[ev.date];
  const hasMultiple=occs.length>1;
  const[selOcc,setSelOcc]=useState(occs[0]||ev.date);
  const occData=ev.occurrenceData||{};
  const getOccStatus=d=>(occData[d]?.status)||"pendente";
  const getOccNotes=d=>(occData[d]?.notes)||"";
  const finishedCount=occs.filter(d=>getOccStatus(d)==="finalizado").length;
  const allFinished=finishedCount===occs.length;

  // Filter tasks: recurring tasks show for all, otherwise filter by occurrence_date
  const occTasks=hasMultiple?evTasks.filter(t=>t.is_recurring||t.isRecurring||norm(t.occurrence_date||t.occurrenceDate)===selOcc||(!t.occurrence_date&&!t.occurrenceDate)):evTasks;

  // Filter meetings by selected occurrence
  const occMeetings=hasMultiple?evMeetings.filter(m=>norm(m.occurrence_date||m.occurrenceDate)===selOcc):evMeetings;

  const updateOcc=async(date,patch)=>{const newOccData={...occData,[date]:{...(occData[date]||{}),...patch}};const allDone=occs.every(d=>(newOccData[d]?.status)==="finalizado");try{await eventsApi.update(ev.id,{occurrence_data:newOccData,status:allDone?"concluido":ev.status==="concluido"?"no-prazo":ev.status});reload();}catch(e){console.error(e);}};
  const finishOcc=date=>updateOcc(date,{status:"finalizado"});
  const reopenOcc=date=>updateOcc(date,{status:"pendente"});
  const saveOccNotes=(date,notes)=>updateOcc(date,{notes});

  const[noteDraft,setNoteDraft]=useState(getOccNotes(selOcc));
  const[noteChanged,setNoteChanged]=useState(false);
  useEffect(()=>{setNoteDraft(getOccNotes(selOcc));setNoteChanged(false);},[selOcc,ev]);

  return <div>
    <Btn variant="ghost" onClick={onBack}>← Voltar</Btn>
    {/* Header */}
    <div style={{padding:"16px 20px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`,margin:"8px 0 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.accent}}>{ev.name}</h2>
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.t2,marginTop:3}}>
            {ev.category&&<><span style={{width:10,height:10,borderRadius:"50%",background:CAT_COLORS[ev.category]||C.t3,display:"inline-block"}}/><span style={{fontWeight:600}}>{ev.category}</span><span>·</span></>}
            {hasMultiple&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:C.tealBg,color:C.teal,fontWeight:700}}>{ev.recurrence} · {finishedCount}/{occs.length} finalizados</span>}
            {!hasMultiple&&<>{fD(ev.date)}</>}
          </div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
          <Badge status={allFinished?"concluido":ev.status}/>
          {isAdmin&&<Btn variant="secondary" small onClick={()=>openEditEv(ev)}>Editar</Btn>}
          {isAdmin&&<Btn variant="danger" small onClick={()=>delEv(ev.id)}>Excluir</Btn>}
        </div>
      </div>

      {/* Occurrence pills */}
      {hasMultiple&&<div style={{marginTop:12}}>
        <div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:6}}>Ocorrências — clique para ver detalhes</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {occs.map((d,i)=>{const st=getOccStatus(d);const isSel=selOcc===d;const isFin=st==="finalizado";const isPast=dU(d)<=-1;
            return <div key={i} onClick={()=>setSelOcc(d)} style={{padding:"6px 12px",borderRadius:10,cursor:"pointer",border:`2px solid ${isSel?C.accent:isFin?"#00839D30":C.border}`,background:isSel?C.accent:isFin?"rgba(0,131,157,0.06)":isPast?"rgba(201,64,64,0.04)":C.cream,color:isSel?C.white:isFin?C.accent:isPast?"#C94040":C.text,transition:"all .15s",textAlign:"center",minWidth:70}}>
              <div style={{fontSize:12,fontWeight:700}}>{fD(d)}</div>
              <div style={{fontSize:9,fontWeight:600,marginTop:2,opacity:.8}}>{isFin?"Finalizado":isPast?"Passou":"Pendente"}</div>
            </div>;
          })}
        </div>
      </div>}
    </div>

    {/* Selected occurrence info (for recurring) */}
    {hasMultiple&&<div style={{padding:"12px 16px",borderRadius:12,background:C.cream,border:`1.5px solid ${C.border}`,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text}}>Ocorrência: {fD(selOcc)} <Days date={selOcc}/></div>
        <div style={{display:"flex",gap:4}}>
          {isAdmin&&getOccStatus(selOcc)!=="finalizado"&&<Btn small variant="success" onClick={()=>finishOcc(selOcc)}>Finalizar esta</Btn>}
          {isAdmin&&getOccStatus(selOcc)==="finalizado"&&<Btn small variant="secondary" onClick={()=>reopenOcc(selOcc)}>Reabrir</Btn>}
        </div>
      </div>
      {/* Notes per occurrence with explicit save */}
      <div>
        <div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:4}}>Anotações / Lições aprendidas</div>
        <textarea value={noteDraft} onChange={e=>{setNoteDraft(e.target.value);setNoteChanged(true);}} placeholder="Observações, melhorias para a próxima edição…" disabled={!isAdmin} style={{width:"100%",padding:"8px 12px",borderRadius:10,border:`1.5px solid ${noteChanged?C.accent:C.border}`,fontSize:12,background:C.white,color:C.text,boxSizing:"border-box",outline:"none",fontFamily:"inherit",minHeight:60,resize:"vertical"}}/>
        {isAdmin&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}><Btn small variant={noteChanged?"accent":"secondary"} onClick={()=>{saveOccNotes(selOcc,noteDraft);setNoteChanged(false);}} disabled={!noteChanged}>{noteChanged?"Salvar anotações":"Salvo"}</Btn></div>}
      </div>
    </div>}

    {/* Single event: Finalizar button */}
    {!hasMultiple&&isAdmin&&ev.status!=="concluido"&&<div style={{marginBottom:14}}><Btn variant="success" onClick={async()=>{try{await eventsApi.updateStatus(ev.id,"concluido");reload();}catch(e){console.error(e);}}}>Finalizar evento</Btn></div>}

    {/* Tabs */}
    <div style={{display:"flex",gap:2,marginBottom:14,background:C.cream,borderRadius:10,padding:3,border:`1.5px solid ${C.border}`}}>
      {[["kanban","Tarefas"],["meetings","Reuniões"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:"7px 14px",borderRadius:8,background:tab===k?C.white:"transparent",border:"none",fontSize:12,fontWeight:tab===k?700:400,cursor:"pointer",color:tab===k?C.accent:C.t3,flex:1,boxShadow:tab===k?"0 1px 3px rgba(0,0,0,0.05)":"none"}}>{l}{k==="kanban"&&` (${occTasks.length})`}{k==="meetings"&&` (${occMeetings.length})`}</button>)}
    </div>

    {/* Tasks (filtered by occurrence for recurring) */}
    {tab==="kanban"&&<>
      {isAdmin&&<div style={{display:"flex",justifyContent:"flex-end",gap:6,marginBottom:10}}>
        <Btn onClick={()=>openNewTk(hasMultiple?selOcc:null,false)}>+ Tarefa {hasMultiple&&`(${fD(selOcc)})`}</Btn>
        {hasMultiple&&<Btn variant="secondary" onClick={()=>openNewTk(null,true)}>+ Tarefa recorrente</Btn>}
      </div>}
      {occTasks.length===0?<Empty icon="—" title="Nenhuma tarefa" sub={hasMultiple?`Nenhuma tarefa para ${fD(selOcc)}`:"Crie a primeira tarefa"} action={isAdmin&&<Btn onClick={()=>openNewTk(hasMultiple?selOcc:null,false)}>+ Tarefa</Btn>}/>:
        <EventKanban tasks={occTasks} onStatusChange={isAdmin?chgTkSt:null} onEdit={isAdmin?openEditTk:null} onDelete={isAdmin?delTk:null} isAdmin={isAdmin}/>}
    </>}

    {/* Meetings (filtered by occurrence for recurring) */}
    {tab==="meetings"&&<>
      {hasMultiple&&<div style={{padding:"8px 12px",borderRadius:8,background:C.tealBg,fontSize:11,color:C.teal,fontWeight:600,marginBottom:10}}>Reuniões da ocorrência de {fD(selOcc)}</div>}
      {isAdmin&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><Btn onClick={()=>openNewMt(selOcc)}>+ Reunião {hasMultiple&&`(${fD(selOcc)})`}</Btn></div>}
      {occMeetings.length===0?<Empty icon="—" title="Nenhuma reunião" sub={hasMultiple?`Nenhuma reunião para ${fD(selOcc)}`:""} action={isAdmin&&<Btn onClick={()=>openNewMt(selOcc)}>+ Reunião</Btn>}/>:
        occMeetings.map(m=>{const mP=data.pendencies.filter(p=>p.meetingId===m.id||p.meeting_id===m.id);return <div key={m.id} style={{padding:"14px 16px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.white,marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:2}}>{fD(m.date)} — {m.title}</div><div style={{fontSize:11,color:C.t2}}>{(Array.isArray(m.participants)?m.participants:[]).join(", ")}</div></div>{isAdmin&&<div style={{display:"flex",gap:3}}><button onClick={()=>openEditMt(m)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:C.t2}}>Editar</button><button onClick={()=>delMt(m.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#C94040"}}>Excluir</button></div>}</div>
          <div style={{marginTop:8}}>{m.decisions&&<div style={{marginBottom:5}}><div style={{fontSize:10,fontWeight:700,color:C.accent,textTransform:"uppercase",marginBottom:2}}>Decisões</div><div style={{fontSize:12,whiteSpace:"pre-wrap"}}>{m.decisions}</div></div>}{mP.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:"#D4910A",textTransform:"uppercase",marginBottom:3}}>Pendências</div>{mP.map(p=><div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:3,fontSize:12}}><input type="checkbox" checked={!!p.done} onChange={()=>isAdmin&&togPend(p.id)} disabled={!isAdmin} style={{marginTop:2,cursor:isAdmin?"pointer":"default",accentColor:C.accent}}/><div style={{textDecoration:p.done?"line-through":"none",opacity:p.done?.4:1}}><b>{p.responsible}</b>: {p.description}</div></div>)}</div>}</div>
        </div>;})}
    </>}
  </div>;
}

// ── Event Kanban with Drag & Drop ──
function EventKanban({tasks,onStatusChange,onEdit,onDelete,isAdmin}){
  const[dId,setDId]=useState(null);const[dOver,setDOver]=useState(null);
  const cols=[{id:"pendente",l:"Pendente",c:"#9B9B9B"},{id:"em-andamento",l:"Em andamento",c:C.teal},{id:"concluida",l:"Concluída",c:C.accent}];
  return <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
    {cols.map(col=>{const ct=tasks.filter(t=>t.status===col.id);const isO=dOver===col.id;
      return <div key={col.id} onDragOver={e=>{e.preventDefault();setDOver(col.id);}} onDragLeave={()=>setDOver(null)} onDrop={e=>{e.preventDefault();setDOver(null);if(dId&&onStatusChange)onStatusChange(dId,col.id);setDId(null);}} style={{background:isO?C.mint:C.white,borderRadius:14,border:`1.5px solid ${isO?col.c:C.border}`,minHeight:180,transition:"all .15s"}}>
        <div style={{padding:"10px 12px",borderBottom:`1.5px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:"50%",background:col.c}}/><span style={{fontSize:11,fontWeight:700,color:C.text,textTransform:"uppercase"}}>{col.l}</span></div><span style={{fontSize:11,fontWeight:700,color:C.t2,background:C.cream,borderRadius:10,padding:"1px 7px"}}>{ct.length}</span></div>
        <div style={{padding:"8px",display:"flex",flexDirection:"column",gap:6}}>
          {ct.length===0&&<div style={{fontSize:11,color:C.t3,textAlign:"center",padding:14}}>Arraste aqui</div>}
          {ct.map(task=>{const isDr=dId===task.id;
            return <div key={task.id} draggable={!!isAdmin} onDragStart={()=>setDId(task.id)} onDragEnd={()=>{setDId(null);setDOver(null);}} style={{padding:"10px 12px",borderRadius:12,background:isDr?C.mint:C.cream,border:`1.5px solid ${C.border}`,cursor:isAdmin?"grab":"pointer",opacity:isDr?.5:1,userSelect:"none",transition:"all .12s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                <div style={{display:"flex",alignItems:"center",gap:4,flex:1}} onClick={()=>onEdit?.(task)}>
                  {task.priority&&<span style={{fontSize:9,color:PRI[task.priority]?.c}}>{PRI[task.priority]?.i}</span>}
                  <span style={{fontSize:13,fontWeight:600,color:C.text,lineHeight:1.3}}>{task.name}</span>
                </div>
                {isAdmin&&onDelete&&<button onClick={e=>{e.stopPropagation();onDelete(task.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#C94040",padding:"2px 4px",flexShrink:0}} title="Excluir tarefa">x</button>}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}} onClick={()=>onEdit?.(task)}>
                {task.responsible&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:C.white,color:C.t2,border:`1px solid ${C.border}`}}>{task.responsible}</span>}
                {task.deadline&&<Days date={task.deadline}/>}
                {(task.is_recurring||task.isRecurring)&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:C.tealBg,color:C.teal,fontWeight:700}}>Recorrente</span>}
              </div>
            </div>;})}
        </div>
      </div>;})}
  </div>;
}

// ── Login Screen ──
function LoginScreen({onLogin}){
  const[user,setUser]=useState("");const[pass,setPass]=useState("");const[err,setErr]=useState("");const[clicking,setClicking]=useState(false);
  const doLogin=()=>{setErr("");setClicking(true);authApi.login(user,pass).then(u=>{onLogin({role:u.role,name:u.name});}).catch(e=>{setErr(e.message||"Credenciais inválidas");setClicking(false);});};
  const handleKey=e=>{if(e.key==="Enter")doLogin();};
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg, ${C.bg} 0%, ${C.mint} 50%, ${C.cream} 100%)`,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"}}>
    <div style={{background:C.white,borderRadius:24,padding:"48px 40px",maxWidth:400,width:"100%",boxShadow:"0 20px 60px rgba(0,131,157,0.1)",border:`2px solid ${C.accent}`}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:72,height:72,borderRadius:20,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="42" height="42" viewBox="0 0 100 100" fill="none">
            <path d="M50 85 C50 85 42 78 35 71 C24 60 18 52 18 40 C18 28 27 20 37 20 C43 20 48 23 50 27 C52 23 57 20 63 20 C73 20 82 28 82 40 C82 52 76 60 65 71 C58 78 50 85 50 85Z" fill="none" stroke={C.white} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{margin:0,fontSize:26,fontWeight:800,color:C.accent,letterSpacing:-1}}>CBRio</h1>
        <div style={{fontSize:13,color:C.t2,marginTop:4,fontWeight:500}}>Project Management Office</div>
      </div>
      <div>
        <label style={{display:"block",marginBottom:14}}>
          <span style={{display:"block",fontSize:11,fontWeight:700,marginBottom:5,color:C.t2,textTransform:"uppercase",letterSpacing:.6}}>Usuário</span>
          <input value={user} onChange={e=>setUser(e.target.value)} onKeyDown={handleKey} placeholder="Digite seu usuário" autoFocus style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`2px solid ${C.border}`,fontSize:14,background:C.cream,color:C.text,boxSizing:"border-box",outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </label>
        <label style={{display:"block",marginBottom:20}}>
          <span style={{display:"block",fontSize:11,fontWeight:700,marginBottom:5,color:C.t2,textTransform:"uppercase",letterSpacing:.6}}>Senha</span>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={handleKey} placeholder="Digite sua senha" style={{width:"100%",padding:"12px 16px",borderRadius:12,border:`2px solid ${C.border}`,fontSize:14,background:C.cream,color:C.text,boxSizing:"border-box",outline:"none",fontFamily:"inherit"}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
        </label>
        {err&&<div style={{padding:"10px 14px",borderRadius:10,background:"rgba(201,64,64,0.06)",color:"#C94040",fontSize:13,fontWeight:600,marginBottom:14,textAlign:"center"}}>{err}</div>}
        <button onClick={doLogin} disabled={clicking} style={{width:"100%",padding:"13px",borderRadius:12,background:clicking?C.teal:C.accent,color:C.white,border:"none",fontSize:14,fontWeight:700,cursor:clicking?"wait":"pointer",letterSpacing:.3,transition:"all .2s",transform:clicking?"scale(0.97)":"scale(1)",opacity:clicking?.8:1}}>{clicking?"Entrando…":"Entrar"}</button>
      </div>
      <div style={{textAlign:"center",marginTop:20,fontSize:11,color:C.t3}}>Igreja Comunidade Batista do Rio</div>
    </div>
  </div>;
}

// ══════════════════════════════════════
// ══ EXPANSION MODULE ═════════════════
// ══════════════════════════════════════

function ExpansionView({data,persist,reload,isAdmin,doConfirm}){
  const expansion=data.expansion||{milestones:[]};
  const milestones=expansion.milestones||[];
  const[selMilestone,setSelMilestone]=useState(null);
  const[showMiMod,setShowMiMod]=useState(false);const[editMi,setEditMi]=useState(null);
  const[miF,setMiF]=useState({name:"",description:"",deadline:""});
  const[showTkMod,setShowTkMod]=useState(false);const[editTk,setEditTk]=useState(null);
  const[tkF,setTkF]=useState({name:"",responsible:"",area:"",startDate:"",deadline:"",description:"",subtasks:[]});
  const[view,setView]=useState("overview");
  const[tab,setTab]=useState("kanban");

  const calcTaskPct=(task)=>{const subs=task.subtasks||[];if(!subs.length)return 0;return Math.round(subs.reduce((sum,s)=>sum+(s.pct||0),0)/subs.length);};
  const calcMilestonePct=(mi)=>{const tasks=mi.tasks||[];if(!tasks.length)return 0;return Math.round(tasks.reduce((sum,t)=>sum+calcTaskPct(t),0)/tasks.length);};
  const overallPct=milestones.length?Math.round(milestones.reduce((s,m)=>s+calcMilestonePct(m),0)/milestones.length):0;

  const openNewMi=()=>{setEditMi(null);setMiF({name:"",description:"",deadline:""});setShowMiMod(true);};
  const openEditMi=(mi)=>{setEditMi(mi);setMiF({name:mi.name,description:mi.description||"",deadline:mi.deadline||""});setShowMiMod(true);};
  const saveMi=async()=>{if(!miF.name.trim())return;try{if(editMi)await expansionApi.updateMilestone(editMi.id,miF);else await expansionApi.createMilestone(miF);setShowMiMod(false);reload();}catch(e){console.error(e);}};
  const delMi=(id)=>{doConfirm("Excluir marco e todas as tarefas?",async()=>{try{await expansionApi.deleteMilestone(id);if(selMilestone===id){setSelMilestone(null);setView("overview");}reload();}catch(e){console.error(e);}});};

  const selMi=milestones.find(m=>m.id===selMilestone);
  const openNewTk=()=>{setEditTk(null);setTkF({name:"",responsible:"",area:"",startDate:"",deadline:"",description:"",subtasks:[]});setShowTkMod(true);};
  const openEditTk=(t)=>{setEditTk(t);setTkF({name:t.name,responsible:t.responsible||"",area:t.area||"",startDate:t.start_date||t.startDate||"",deadline:t.deadline||"",description:t.description||"",subtasks:t.subtasks||[]});setShowTkMod(true);};
  const saveTk=async()=>{if(!tkF.name.trim()||!selMilestone)return;try{await expansionApi.createTask({milestoneId:selMilestone,...tkF});setShowTkMod(false);reload();}catch(e){console.error(e);}};
  const delTk=(miId,tkId)=>{doConfirm("Excluir tarefa?",async()=>{try{await expansionApi.deleteTask(tkId);reload();}catch(e){console.error(e);}});};

  const updateSubPct=async(miId,tkId,subIdx,pct)=>{const task=milestones.find(m=>m.id===miId)?.tasks?.find(t=>t.id===tkId);const sub=task?.subtasks?.[subIdx];if(sub?.id){try{await expansionApi.updateSubtaskPct(sub.id,pct);reload();}catch(e){console.error(e);}}};

  const allTasks=milestones.flatMap(m=>(m.tasks||[]).map(t=>({...t,milestoneName:m.name,milestoneId:m.id})));
  const withDates=allTasks.filter(t=>(t.start_date||t.startDate)&&t.deadline);
  const getStatus=(task)=>{const pct=calcTaskPct(task);if(pct>=100)return "concluida";if(pct>0)return "em-andamento";return "pendente";};

  return <div>
    {view==="overview"&&<>
      {/* Overall progress */}
      <div style={{padding:"20px",borderRadius:16,background:C.white,border:`1.5px solid ${C.border}`,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><div style={{fontSize:18,fontWeight:800,color:C.accent}}>Plano de expansão 2025–2029</div><div style={{fontSize:12,color:C.t2,marginTop:2}}>{milestones.length} marcos · {allTasks.length} tarefas</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:28,fontWeight:800,color:overallPct>=100?C.accent:C.teal}}>{overallPct}%</div><div style={{fontSize:10,color:C.t2}}>concluído</div></div>
        </div>
        <ProgressBar pct={overallPct} height={8}/>
      </div>

      {/* Milestones list */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:14,fontWeight:700,color:C.text}}>Marcos</span>
        {isAdmin&&<Btn small onClick={openNewMi}>+ Marco</Btn>}
      </div>

      {milestones.length===0?<Empty icon="◆" title="Nenhum marco" sub="Crie marcos para organizar o plano de expansão" action={isAdmin&&<Btn onClick={openNewMi}>+ Primeiro marco</Btn>}/>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {milestones.map(mi=>{const pct=calcMilestonePct(mi);const taskCount=(mi.tasks||[]).length;
            return <div key={mi.id} onClick={()=>{setSelMilestone(mi.id);setView("milestone");setTab("kanban");}} style={{padding:"16px 18px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.white,cursor:"pointer",transition:"all .15s",position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.boxShadow="0 4px 16px rgba(0,131,157,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:pct>=100?C.accent:pct>0?C.teal:C.t3,borderRadius:"4px 0 0 4px"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16,color:C.accent}}>◆</span><span style={{fontSize:15,fontWeight:700,color:C.text}}>{mi.name}</span></div>{mi.description&&<div style={{fontSize:12,color:C.t2,marginTop:2}}>{mi.description}</div>}<div style={{fontSize:11,color:C.t3,marginTop:2}}>{taskCount} tarefas {mi.deadline&&`· Prazo: ${fD(mi.deadline)}`}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:pct>=100?C.accent:C.teal}}>{pct}%</div>{isAdmin&&<div style={{display:"flex",gap:3,marginTop:4}}><Btn small variant="ghost" onClick={e=>{e.stopPropagation();openEditMi(mi);}}>✎</Btn><Btn small variant="ghost" onClick={e=>{e.stopPropagation();delMi(mi.id);}} style={{color:"#C94040"}}>✕</Btn></div>}</div>
              </div>
              <ProgressBar pct={pct}/>
            </div>;
          })}
        </div>}

      {/* Gantt of all tasks */}
      {withDates.length>0&&<div style={{marginTop:16,padding:"16px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:C.t2,textTransform:"uppercase",letterSpacing:.4,marginBottom:10}}>Cronograma geral</div>
        <ExpansionGantt tasks={withDates}/>
      </div>}
    </>}

    {view==="milestone"&&selMi&&<>
      <Btn variant="ghost" onClick={()=>{setView("overview");setSelMilestone(null);}}>← Voltar aos marcos</Btn>
      <div style={{padding:"16px 20px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`,margin:"8px 0 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:18,color:C.accent}}>◆</span><h2 style={{margin:0,fontSize:20,fontWeight:800,color:C.accent}}>{selMi.name}</h2></div>{selMi.description&&<div style={{fontSize:13,color:C.t2,marginTop:4}}>{selMi.description}</div>}{selMi.deadline&&<div style={{fontSize:11,color:C.t3,marginTop:2}}>Prazo: {fD(selMi.deadline)} <Days date={selMi.deadline}/></div>}</div>
          <div style={{fontSize:28,fontWeight:800,color:C.teal}}>{calcMilestonePct(selMi)}%</div>
        </div>
        <div style={{marginTop:10}}><ProgressBar pct={calcMilestonePct(selMi)} height={8}/></div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:14,background:C.cream,borderRadius:10,padding:3,border:`1.5px solid ${C.border}`}}>
        {[["kanban","Kanban"],["list","Lista / Subtarefas"],["gantt","Cronograma"]].map(([k,l])=><button key={k} onClick={()=>setTab(k)} style={{padding:"7px 14px",borderRadius:8,background:tab===k?C.white:"transparent",border:"none",fontSize:12,fontWeight:tab===k?700:400,cursor:"pointer",color:tab===k?C.accent:C.t3,flex:1,boxShadow:tab===k?"0 1px 3px rgba(0,0,0,0.05)":"none"}}>{l}</button>)}
      </div>

      {isAdmin&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><Btn onClick={openNewTk}>+ Tarefa</Btn></div>}

      {/* Kanban */}
      {tab==="kanban"&&<>{(selMi.tasks||[]).length===0?<Empty icon="✅" title="Nenhuma tarefa" sub="Crie tarefas neste marco" action={isAdmin&&<Btn onClick={openNewTk}>+ Tarefa</Btn>}/>:
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[{id:"pendente",l:"Pendente",c:"#9B9B9B"},{id:"em-andamento",l:"Em andamento",c:C.teal},{id:"concluida",l:"Concluída",c:C.accent}].map(col=>{
            const ct=(selMi.tasks||[]).filter(t=>getStatus(t)===col.id);
            return <div key={col.id} style={{background:C.white,borderRadius:14,border:`1.5px solid ${C.border}`,minHeight:160}}>
              <div style={{padding:"10px 12px",borderBottom:`1.5px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:7,height:7,borderRadius:"50%",background:col.c}}/><span style={{fontSize:11,fontWeight:700,color:C.text,textTransform:"uppercase"}}>{col.l}</span></div><span style={{fontSize:11,fontWeight:700,color:C.t2,background:C.cream,borderRadius:10,padding:"1px 7px"}}>{ct.length}</span></div>
              <div style={{padding:"8px 8px 12px",display:"flex",flexDirection:"column",gap:6}}>
                {ct.map(task=>{const pct=calcTaskPct(task);return <div key={task.id} onClick={()=>openEditTk(task)} style={{padding:"10px 12px",borderRadius:12,background:C.cream,border:`1.5px solid ${C.border}`,cursor:"pointer"}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{task.name}</div>
                  <div style={{display:"flex",gap:4,marginBottom:4,flexWrap:"wrap"}}>{task.responsible&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:C.white,color:C.t2,border:`1px solid ${C.border}`}}>{task.responsible}</span>}{task.deadline&&<Days date={task.deadline}/>}</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t2,marginBottom:3}}><span>{(task.subtasks||[]).length} subtarefas</span><span style={{fontWeight:700,color:pct>=100?C.accent:C.teal}}>{pct}%</span></div>
                  <ProgressBar pct={pct} height={4}/>
                </div>;})}
              </div>
            </div>;
          })}
        </div>}</>}

      {/* List with subtasks */}
      {tab==="list"&&<>{(selMi.tasks||[]).length===0?<Empty icon="☰" title="Nenhuma tarefa" sub="" action={isAdmin&&<Btn onClick={openNewTk}>+ Tarefa</Btn>}/>:
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {(selMi.tasks||[]).map(task=>{const pct=calcTaskPct(task);
            return <div key={task.id} style={{padding:"14px 16px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.white,borderLeft:`4px solid ${pct>=100?C.accent:pct>0?C.teal:C.t3}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}><span style={{fontSize:14,fontWeight:700,color:C.text}}>{task.name}</span><span style={{fontSize:11,fontWeight:700,color:pct>=100?C.accent:C.teal,background:pct>=100?C.accentBg:C.tealBg,padding:"2px 8px",borderRadius:10}}>{pct}%</span></div>
                  <div style={{fontSize:11,color:C.t2}}>{task.responsible&&<b>{task.responsible}</b>} {task.area&&`· ${task.area}`} {task.deadline&&`· ${fD(task.deadline)}`} {task.deadline&&<Days date={task.deadline}/>}</div>
                </div>
                {isAdmin&&<div style={{display:"flex",gap:3}}><Btn small variant="ghost" onClick={()=>openEditTk(task)}>✎</Btn><Btn small variant="ghost" onClick={()=>delTk(selMi.id,task.id)} style={{color:"#C94040"}}>✕</Btn></div>}
              </div>
              <ProgressBar pct={pct} height={5}/>
              {/* Subtasks with % slider */}
              <div style={{marginTop:10}}>
                <div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:6}}>Subtarefas ({(task.subtasks||[]).length})</div>
                {(task.subtasks||[]).map((sub,si)=><div key={si} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,padding:"6px 8px",borderRadius:8,background:C.cream}}>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:C.text,marginBottom:2}}>{sub.name}</div><ProgressBar pct={sub.pct||0} height={3}/></div>
                  <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                    {isAdmin?<input type="range" min="0" max="100" step="5" defaultValue={sub.pct||0} onPointerUp={e=>updateSubPct(selMi.id,task.id,si,e.target.value)} onTouchEnd={e=>updateSubPct(selMi.id,task.id,si,e.target.value)} style={{width:60,accentColor:C.accent}}/>:null}
                    <span style={{fontSize:11,fontWeight:700,color:(sub.pct||0)>=100?C.accent:C.teal,minWidth:32,textAlign:"right"}}>{sub.pct||0}%</span>
                  </div>
                </div>)}
              </div>
            </div>;
          })}
        </div>}</>}

      {/* Gantt */}
      {tab==="gantt"&&<>{(selMi.tasks||[]).filter(t=>t.startDate&&t.deadline).length===0?<div style={{fontSize:12,color:C.t3,textAlign:"center",padding:20}}>Adicione datas nas tarefas</div>:<div style={{padding:"16px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`}}><ExpansionGantt tasks={(selMi.tasks||[]).filter(t=>t.startDate&&t.deadline).map(t=>({...t,milestoneName:selMi.name}))}/></div>}</>}
    </>}

    {/* Modals */}
    <Modal open={showMiMod} onClose={()=>setShowMiMod(false)} title={editMi?"Editar marco":"Novo marco"}>
      <Inp label="Nome do marco" value={miF.name} onChange={e=>setMiF({...miF,name:e.target.value})} placeholder="Ex: Fase 1 — Estruturação"/>
      <Txa label="Descrição" value={miF.description} onChange={e=>setMiF({...miF,description:e.target.value})} placeholder="Objetivo deste marco…"/>
      <Inp label="Prazo" type="date" value={miF.deadline} onChange={e=>setMiF({...miF,deadline:e.target.value})}/>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:6}}><Btn variant="secondary" onClick={()=>setShowMiMod(false)}>Cancelar</Btn><Btn onClick={saveMi} disabled={!miF.name.trim()}>{editMi?"Salvar":"Criar marco"}</Btn></div>
    </Modal>

    <Modal open={showTkMod} onClose={()=>setShowTkMod(false)} title={editTk?"Editar tarefa":"Nova tarefa"} wide>
      <Inp label="Nome da tarefa" value={tkF.name} onChange={e=>setTkF({...tkF,name:e.target.value})} placeholder="Ex: Definir local da nova unidade"/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 140px"}}><Inp label="Responsável" value={tkF.responsible} onChange={e=>setTkF({...tkF,responsible:e.target.value})}/></div><div style={{flex:"1 1 140px"}}><Sel label="Área" value={tkF.area} onChange={e=>setTkF({...tkF,area:e.target.value})} options={[{value:"",label:"…"},...AREAS]}/></div></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 120px"}}><Inp label="Início" type="date" value={tkF.startDate} onChange={e=>setTkF({...tkF,startDate:e.target.value})}/></div><div style={{flex:"1 1 120px"}}><Inp label="Prazo" type="date" value={tkF.deadline} onChange={e=>setTkF({...tkF,deadline:e.target.value})}/></div></div>
      <Txa label="Descrição" value={tkF.description} onChange={e=>setTkF({...tkF,description:e.target.value})}/>
      <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase"}}>Subtarefas</span><Btn small variant="secondary" onClick={()=>setTkF({...tkF,subtasks:[...(tkF.subtasks||[]),{name:"",pct:0}]})}>+ Subtarefa</Btn></div>
        {(tkF.subtasks||[]).map((s,i)=><div key={i} style={{display:"flex",gap:4,marginBottom:4,alignItems:"center"}}><input value={s.name} onChange={e=>{const u=[...tkF.subtasks];u[i]={...u[i],name:e.target.value};setTkF({...tkF,subtasks:u});}} placeholder="Nome da subtarefa" style={{...inp,flex:1,padding:"6px 10px",fontSize:12}}/><input type="number" min="0" max="100" value={s.pct||0} onChange={e=>{const u=[...tkF.subtasks];u[i]={...u[i],pct:parseInt(e.target.value)||0};setTkF({...tkF,subtasks:u});}} style={{...inp,width:55,padding:"6px 8px",fontSize:12,textAlign:"center"}}/><span style={{fontSize:10,color:C.t2}}>%</span><button onClick={()=>setTkF({...tkF,subtasks:tkF.subtasks.filter((_,j)=>j!==i)})} style={{background:"none",border:"none",cursor:"pointer",color:"#C94040"}}>✕</button></div>)}
      </div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={()=>setShowTkMod(false)}>Cancelar</Btn><Btn onClick={saveTk} disabled={!tkF.name.trim()}>{editTk?"Salvar":"Criar"}</Btn></div>
    </Modal>
  </div>;
}

function ExpansionGantt({tasks}){
  if(!tasks.length)return null;
  const aD=tasks.flatMap(t=>[new Date(t.startDate+"T00:00:00"),new Date(t.deadline+"T00:00:00")]);
  let mn=new Date(Math.min(...aD)),mx=new Date(Math.max(...aD));mn.setDate(mn.getDate()-5);mx.setDate(mx.getDate()+5);
  const toP=d=>((new Date(d+"T00:00:00")-mn)/(mx-mn))*100;
  const today=new Date();today.setHours(0,0,0,0);const tP=((today-mn)/(mx-mn))*100;
  const sorted=[...tasks].sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
  return <div style={{position:"relative",minWidth:400,overflowX:"auto"}}>
    {tP>=0&&tP<=100&&<div style={{position:"absolute",left:`${tP}%`,top:0,bottom:0,borderLeft:"2px solid #D4910A",zIndex:2,opacity:.6}}><span style={{position:"absolute",top:-13,left:2,fontSize:9,color:"#D4910A",fontWeight:700}}>Hoje</span></div>}
    {sorted.map(task=>{const l=toP(task.startDate),r=toP(task.deadline),w=Math.max(r-l,2);const pct=task.subtasks?Math.round((task.subtasks||[]).reduce((s,x)=>s+(x.pct||0),0)/Math.max((task.subtasks||[]).length,1)):0;
      return <div key={task.id} style={{position:"relative",height:30,marginBottom:4}}>
        <div style={{position:"absolute",left:0,top:0,width:`${Math.max(l-1,0)}%`,height:30,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:5}}><span style={{fontSize:10,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:140,color:C.t2}}>{task.name}</span></div>
        <div style={{position:"absolute",left:`${l}%`,width:`${w}%`,top:4,height:20,borderRadius:6,background:C.cream,border:`1px solid ${C.border}`,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct>=100?C.accent:C.teal,borderRadius:5,transition:"width .3s"}}/>
          <span style={{position:"absolute",right:4,top:2,fontSize:9,fontWeight:700,color:C.text}}>{pct}%</span>
        </div>
      </div>;})}
  </div>;
}

// ══ MAIN APP ══
export default function App(){
  const[auth,setAuth]=useState(()=>authApi.getAuth());
  const role=auth?.role||"assistente";
  const perm=ROLES[role]||ROLES.assistente;
  const canEdit=perm.canEdit;
  const isAdmin=canEdit;
  const logout=()=>{authApi.logout();setAuth(null);};
  const[data,setData]=useState(DD);const[loaded,setLoaded]=useState(false);
  const[section,setSection]=useState("events"); // events | expansion
  const[view,setView]=useState("dashboard");const[selEv,setSelEv]=useState(null);const[tab,setTab]=useState("kanban");
  const[filter,setFilter]=useState("all");const[search,setSearch]=useState("");const[searchFocus,setSearchFocus]=useState(false);
  const[sideOpen,setSideOpen]=useState(true);
  const[showEvMod,setShowEvMod]=useState(false);const[showTkMod,setShowTkMod]=useState(false);const[showMtMod,setShowMtMod]=useState(false);const[showTplMod,setShowTplMod]=useState(false);const[showExport,setShowExport]=useState(false);
  const[editEv,setEditEv]=useState(null);const[editTk,setEditTk]=useState(null);const[editMt,setEditMt]=useState(null);
  const[evF,setEvF]=useState({name:"",date:"",area:"",status:"no-prazo",description:"",location:"",responsible:"",budget:"",expectedAttendance:"",recurrence:"Único",occurrences:[],category:""});
  const[tkF,setTkF]=useState({name:"",responsible:"",area:"",startDate:"",deadline:"",status:"pendente",description:"",dependsOn:[],priority:"media",isMilestone:false,subtasks:[],comments:[],links:[]});
  const[mtF,setMtF]=useState({title:"",date:"",participants:"",decisions:"",notes:""});const[mtPends,setMtPends]=useState([]);
  const[tplEvId,setTplEvId]=useState("");const[tplName,setTplName]=useState("");const[tplDate,setTplDate]=useState("");
  const[report,setReport]=useState("");const[repLoad,setRepLoad]=useState(false);

  // Load data from API
  const loadData = useCallback(async()=>{
    try{
      const[rawEvs,rawTks,mts]=await Promise.all([eventsApi.list(),tasksApi.list(),meetingsApi.list()]);
      let exp={milestones:[]};
      if(perm.seeExpansion){try{exp={milestones:await expansionApi.listMilestones()};}catch{}}
      // Normalize events from API: map DB fields to frontend fields
      const evs=(rawEvs||[]).map(e=>{
        const date=norm(e.date);
        const cat=e.category||e.area||"";
        // Parse occurrences: could be JSONB array from DB or already an array
        let occs=e.occurrences;
        if(typeof occs==="string"){try{occs=JSON.parse(occs);}catch{occs=[];}}
        if(!Array.isArray(occs)||occs.length===0)occs=[date];
        occs=occs.map(norm);
        // Parse occurrence_data
        let occData=e.occurrence_data||e.occurrenceData||{};
        if(typeof occData==="string"){try{occData=JSON.parse(occData);}catch{occData={};}}
        return{...e,date,category:cat,occurrences:occs,occurrenceData:occData,recurrence:e.recurrence||"Único",activeDate:norm(e.active_date||e.activeDate||date)};
      });
      // Normalize tasks
      const tks=(rawTks||[]).map(t=>({...t,eventId:t.event_id||t.eventId,startDate:norm(t.start_date||t.startDate),deadline:norm(t.deadline)}));
      // Normalize meetings
      const meetings=(mts||[]).map(m=>({...m,eventId:m.event_id||m.eventId,date:norm(m.date)}));
      const pends=meetings.flatMap(m=>(m.pendencies||[]).map(p=>({...p,meetingId:m.id,eventId:m.eventId})));
      // Compute auto status
      const rawData={events:evs,tasks:tks,meetings,pendencies:pends,expansion:exp};
      const updated=autoStatus(rawData);
      setData(updated);
      setLoaded(true);
    }catch(err){console.error("Load error:",err);setLoaded(true);}
  },[perm.seeExpansion]);

  useEffect(()=>{if(auth)loadData();},[auth,loadData]);

  // Reload data after mutations
  const reload=()=>loadData();

  const[confirmAction,setConfirmAction]=useState(null);
  const doConfirm=(msg,action)=>setConfirmAction({msg,action});
  const execConfirm=()=>{if(confirmAction?.action)confirmAction.action();setConfirmAction(null);};

  // Event CRUD via API
  const openNewEv=()=>{setEditEv(null);setEvF({name:"",date:"",area:"",status:"no-prazo",description:"",location:"",responsible:"",budget:"",expectedAttendance:"",recurrence:"Único",occurrences:[],category:""});setShowEvMod(true);};
  const openEditEv=e=>{setEditEv(e);setEvF({name:e.name,date:norm(e.date),area:e.area||"",status:e.status,description:e.description||"",location:e.location||"",responsible:e.responsible||"",budget:e.budget||"",expectedAttendance:e.expected_attendance||e.expectedAttendance||"",recurrence:e.recurrence||"Único",occurrences:e.occurrences||[],category:e.category||e.area||""});setShowEvMod(true);};
  const saveEv=async()=>{if(!evF.name.trim()||!evF.date)return;try{const payload={name:evF.name.trim(),date:evF.date,category:evF.category||null,status:evF.status||"no-prazo",description:evF.description||null,location:evF.location||null,responsible:evF.responsible||null,budget:evF.budget||null,expected_attendance:evF.expectedAttendance||null,notes:evF.description||null};if(editEv)await eventsApi.update(editEv.id,payload);else await eventsApi.create(payload);setShowEvMod(false);reload();}catch(e){console.error("saveEv error:",e);}};
  const delEv=id=>{doConfirm("Excluir evento e tudo associado?",async()=>{try{await eventsApi.remove(id);if(selEv===id){setView("dashboard");setSelEv(null);}reload();}catch(e){console.error(e);}});};
  const openTpl=()=>{setTplEvId("");setTplName("");setTplDate("");setShowTplMod(true);};
  const saveTpl=()=>{/* Template duplication will be reimplemented via API */setShowTplMod(false);};

  const evTasks=data.tasks.filter(t=>(t.event_id||t.eventId)===selEv);
  const[tkOccDate,setTkOccDate]=useState(null);
  const[tkRecurring,setTkRecurring]=useState(false);
  const openNewTk=(occDate,recurring)=>{setEditTk(null);setTkF({name:"",responsible:"",area:"",startDate:"",deadline:"",status:"pendente",description:"",dependsOn:[],priority:"media",isMilestone:false,subtasks:[],comments:[],links:[]});setTkOccDate(occDate||null);setTkRecurring(!!recurring);setShowTkMod(true);};
  const openEditTk=t=>{setEditTk(t);setTkF({name:t.name,responsible:t.responsible||"",area:t.area||"",startDate:norm(t.start_date||t.startDate)||"",deadline:norm(t.deadline)||"",status:t.status,description:t.description||"",dependsOn:t.dependsOn||[],priority:t.priority||"media",isMilestone:!!t.is_milestone||!!t.isMilestone,subtasks:t.subtasks||[],comments:t.comments||[],links:t.links||[]});setTkOccDate(t.occurrence_date||t.occurrenceDate||null);setTkRecurring(!!t.is_recurring||!!t.isRecurring);setShowTkMod(true);};
  const saveTk=async()=>{if(!tkF.name.trim())return;try{if(editTk){/* update via API */}else{await tasksApi.create({eventId:selEv,...tkF,occurrenceDate:tkRecurring?null:tkOccDate,isRecurring:tkRecurring});}setShowTkMod(false);reload();}catch(e){console.error(e);}};
  const delTk=id=>{doConfirm("Excluir tarefa?",async()=>{try{await tasksApi.remove(id);reload();}catch(e){console.error(e);}});};
  const chgTkSt=async(id,st)=>{try{await tasksApi.updateStatus(id,st);reload();}catch(e){console.error(e);}};
  const toggleDep=depId=>{const cur=tkF.dependsOn||[];setTkF({...tkF,dependsOn:cur.includes(depId)?cur.filter(d=>d!==depId):[...cur,depId]});};

  const evMeetings=data.meetings.filter(m=>m.event_id===selEv||m.eventId===selEv).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const[mtOccDate,setMtOccDate]=useState("");
  const openNewMt=(occDate)=>{setEditMt(null);setMtF({title:"",date:new Date().toISOString().slice(0,10),participants:"",decisions:"",notes:""});setMtPends([]);setMtOccDate(occDate||"");setShowMtMod(true);};
  const openEditMt=m=>{setEditMt(m);setMtF({title:m.title,date:m.date,participants:m.participants?.join(", ")||"",decisions:m.decisions||"",notes:m.notes||""});setMtPends((m.pendencies||[]).map(p=>({...p})));setMtOccDate(m.occurrenceDate||"");setShowMtMod(true);};
  const saveMt=async()=>{if(!mtF.date)return;try{const parts=mtF.participants.split(",").map(s=>s.trim()).filter(Boolean);const pends=mtPends.filter(p=>p.description?.trim());await meetingsApi.create({eventId:selEv,title:mtF.title.trim()||"Reunião",date:mtF.date,participants:parts,decisions:mtF.decisions.trim(),notes:mtF.notes.trim(),occurrenceDate:mtOccDate,pendencies:pends});setShowMtMod(false);reload();}catch(e){console.error(e);}};
  const delMt=id=>{doConfirm("Excluir reunião?",async()=>{try{await meetingsApi.remove(id);reload();}catch(e){console.error(e);}});};
  const togPend=async(id)=>{try{await meetingsApi.togglePendency(id);reload();}catch(e){console.error(e);}};

  const genRep=async()=>{setRepLoad(true);setReport("");try{const data=await agentsApi.generateReport();setReport(data.report||"Erro.");}catch(e){setReport("Erro: "+e.message);}finally{setRepLoad(false);}};
  const exportData=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`cbrio-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();};
  const importData=e=>{/* Import via API to be implemented */};
  const importCalendar=e=>{/* Calendar import via API to be implemented */};

  const selEvent=data.events.find(e=>e.id===selEv);
  const filteredEvs=data.events.filter(e=>filter==="all"||e.status===filter).sort((a,b)=>new Date(a.activeDate||a.date)-new Date(b.activeDate||b.date));
  const goToEvent=id=>{setSelEv(id);setView("event");setTab("kanban");setSection("events");};

  if(!auth)return <LoginScreen onLogin={u=>setAuth({role:u.role,name:u.name})}/>;
  if(!loaded)return <div style={{padding:40,textAlign:"center",fontSize:14,color:C.t2,background:C.bg,minHeight:"100vh",fontFamily:"-apple-system,sans-serif"}}>Carregando…</div>;

  const sideW=sideOpen?200:56;

  return <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:C.text,background:C.bg,minHeight:"100vh",display:"flex"}}>
    {/* Sidebar */}
    <div style={{width:sideW,minHeight:"100vh",background:C.white,borderRight:`2px solid ${C.accent}`,position:"fixed",top:0,left:0,zIndex:200,transition:"width .2s",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:sideOpen?"16px":"10px 6px",borderBottom:`1.5px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:sideOpen?"space-between":"center"}}>
          {sideOpen&&<h1 style={{margin:0,fontSize:18,fontWeight:800,color:C.accent,letterSpacing:-1}}>CBRio</h1>}
          <button onClick={()=>setSideOpen(!sideOpen)} style={{background:"none",border:"none",cursor:"pointer",color:C.accent,fontSize:18,padding:4}}>☰</button>
        </div>
        {sideOpen&&<div style={{fontSize:10,color:C.t2,marginTop:2}}>Project Management</div>}
      </div>
      <div style={{flex:1,padding:sideOpen?"10px 8px":"10px 4px"}}>
        {[
          {id:"events",label:"Eventos",desc:"Gestão de eventos",show:true,color:BLUE},
          {id:"expansion",label:"Expansão",desc:"Plano 2025-2029",show:perm.seeExpansion,color:TEAL},
          {id:"report",label:"Relatório",desc:"Relatório semanal",show:perm.seeReport,color:"#D4910A"},
          {id:"backup",label:"Backup",desc:"Exportar / importar",show:perm.seeBackup,color:GRAY},
        ].filter(i=>i.show).map(item=>{const active=section===item.id||(item.id==="report"&&view==="report")||(item.id==="backup"&&showExport);
          return <button key={item.id} onClick={()=>{if(item.id==="backup"){setShowExport(true);}else if(item.id==="report"){setSection("events");setView("report");}else{setSection(item.id);setView("dashboard");setSelEv(null);}}} style={{
            display:"flex",alignItems:"center",gap:sideOpen?10:0,justifyContent:sideOpen?"flex-start":"center",
            width:"100%",padding:sideOpen?"10px 12px":"10px 0",borderRadius:10,border:"none",
            background:active?C.accentBg:"transparent",color:active?C.accent:C.t2,
            cursor:"pointer",marginBottom:4,transition:"all .12s",fontSize:13,fontWeight:active?700:500,textAlign:"left"
          }}>
            <span style={{width:10,height:10,borderRadius:"50%",background:active?C.accent:(item.color||C.t3),flexShrink:0}}/>
            {sideOpen&&<div><div>{item.label}</div><div style={{fontSize:9,color:active?C.accent:C.t3,fontWeight:400}}>{item.desc}</div></div>}
          </button>;
        })}
      </div>
      {/* User info + logout */}
      <div style={{padding:sideOpen?"12px":"8px 4px",borderTop:`1.5px solid ${C.border}`}}>
        {sideOpen?<div>
          <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>{auth?.name}</div>
          <div style={{fontSize:10,color:C.t3,marginBottom:6}}>{perm.label}</div>
          <button onClick={logout} style={{background:"none",border:"none",fontSize:11,color:"#C94040",cursor:"pointer",fontWeight:600,padding:0}}>Sair</button>
        </div>:<button onClick={logout} style={{background:"none",border:"none",fontSize:11,cursor:"pointer",color:"#C94040",display:"block",margin:"0 auto",fontWeight:600}} title="Sair">Sair</button>}
      </div>
    </div>

    {/* Main Content */}
    <div style={{marginLeft:sideW,flex:1,transition:"margin-left .2s"}}>
      {/* Top Bar */}
      <div style={{background:C.white,borderBottom:`1.5px solid ${C.border}`,padding:"0 20px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {section==="events"&&<div style={{display:"flex",gap:2,background:C.cream,borderRadius:10,padding:3}}>
              {[{id:"dashboard",l:"Dashboard"},{id:"list",l:"Eventos"},{id:"areas",l:"Categorias"},...(perm.seeAgents?[{id:"agents",l:"Agentes"}]:[])].map(n=><button key={n.id} onClick={()=>{setView(n.id);if(n.id==="list")setSelEv(null);}} style={{padding:"5px 12px",borderRadius:8,background:(view===n.id||(view==="event"&&n.id==="list"))?C.white:"transparent",border:"none",color:(view===n.id||(view==="event"&&n.id==="list"))?C.accent:C.t3,fontSize:11,fontWeight:600,cursor:"pointer",boxShadow:(view===n.id||(view==="event"&&n.id==="list"))?"0 1px 3px rgba(0,0,0,0.05)":"none"}}>{n.l}</button>)}
            </div>}
            {section==="expansion"&&<div style={{fontSize:14,fontWeight:700,color:C.accent}}>Plano de expansão</div>}
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            <div style={{position:"relative"}}><input type="text" placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setSearchFocus(true)} onBlur={()=>setTimeout(()=>setSearchFocus(false),200)} style={{...inp,width:150,padding:"5px 10px",fontSize:11,borderRadius:8}}/>{searchFocus&&search&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:998,background:C.white,border:`1.5px solid ${C.border}`,borderRadius:12,boxShadow:"0 10px 30px rgba(0,0,0,0.1)",maxHeight:250,overflowY:"auto",marginTop:4}}>{data.events.filter(e=>e.name.toLowerCase().includes(search.toLowerCase())).map(e=><div key={e.id} onClick={()=>{goToEvent(e.id);setSearch("");}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,fontSize:12}}><b>{e.name}</b> <span style={{color:C.t2}}>{fD(e.date)}</span></div>)}</div>}</div>
            {section==="events"&&canEdit&&<><Btn small onClick={openNewEv}>+ Evento</Btn><Btn small variant="secondary" onClick={openTpl}>Duplicar</Btn></>}
          </div>
        </div>
      </div>

      <div style={{padding:"16px 24px"}}>
        {/* ── EVENTS SECTION ── */}
        {section==="events"&&<>
          {view==="dashboard"&&<Dashboard data={data} onSelect={goToEvent}/>}
          {view==="areas"&&<AreaView data={data}/>}
          {view==="agents"&&<AgentsTab data={data} reload={reload}/>}
          {view==="report"&&<div><div style={{padding:"14px 18px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`,marginBottom:12,display:"flex",gap:6}}><Btn onClick={genRep} disabled={repLoad}>{repLoad?"Gerando…":"Gerar relatório"}</Btn>{report&&<Btn variant="secondary" onClick={()=>{const w=window.open();if(w){w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:12px;line-height:1.7;max-width:680px;margin:0 auto;padding:20px;color:#2D2D2D}h1{font-size:20px;color:#00839D;border-bottom:2px solid #00839D;padding-bottom:12px}</style></head><body><h1>PMO CBRio</h1><div style="white-space:pre-wrap">${report.replace(/\n/g,"<br>")}</div></body></html>`);w.document.close();setTimeout(()=>w.print(),500);}}}>PDF</Btn>}</div>{report&&<div style={{padding:"18px 22px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`,whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.7}}>{report}</div>}</div>}

          {/* Event List */}
          {view==="list"&&<>{data.events.length>0&&<div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>{["all","no-prazo","em-risco","atrasado","concluido"].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:10,border:`1.5px solid ${filter===f?(ST[f]?.c||C.accent):C.border}`,background:filter===f?(ST[f]?.bg||C.accentBg):C.white,color:filter===f?(ST[f]?.c||C.accent):C.t3,fontSize:11,fontWeight:600,cursor:"pointer"}}>{f==="all"?"Todos":f==="concluido"?"Finalizados":ST[f].l}</button>)}</div>}<div style={{display:"flex",flexDirection:"column",gap:8}}>{filteredEvs.length===0?<Empty icon="—" title="Nenhum evento" sub="" action={<Btn onClick={openNewEv}>+ Evento</Btn>}/>:filteredEvs.map(ev=>{const et=data.tasks.filter(t=>t.eventId===ev.id);const done=et.filter(t=>t.status==="concluida").length;const pct=et.length?Math.round((done/et.length)*100):0;return <div key={ev.id} onClick={()=>goToEvent(ev.id)} style={{padding:"16px 18px",borderRadius:14,border:`1.5px solid ${C.border}`,cursor:"pointer",background:C.white,position:"relative",overflow:"hidden",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=ST[ev.status]?.c||C.border;e.currentTarget.style.boxShadow="0 4px 16px rgba(0,131,157,0.06)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}><div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:CAT_COLORS[ev.category]||ST[ev.status]?.c,borderRadius:"4px 0 0 4px"}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:et.length?6:0}}><div><div style={{fontSize:15,fontWeight:700,marginBottom:2}}>{ev.name}</div><div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t2}}>{ev.category&&<><span style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[ev.category]||C.t3,display:"inline-block",flexShrink:0}}/><span>{ev.category}</span><span>·</span></>}{fD(ev.activeDate||ev.date)} {ev.recurrence&&ev.recurrence!=="Único"&&(()=>{const occs=ev.occurrences||[];const occD=ev.occurrenceData||{};const fin=occs.filter(d=>(occD[d]?.status)==="finalizado").length;return <span style={{fontSize:9,padding:"2px 7px",borderRadius:8,background:C.tealBg,color:C.teal,fontWeight:700}}>{ev.recurrence} · {fin}/{occs.length}</span>;})()}</div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}><Badge status={ev.status}/><Days date={ev.activeDate||ev.date}/></div></div>{et.length>0&&<><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t2,marginBottom:3}}><span>{done}/{et.length}</span><span>{pct}%</span></div><ProgressBar pct={pct} height={4}/></>}</div>;})}</div></>}

          {/* Event Detail */}
          {view==="event"&&selEvent&&<EventDetail ev={selEvent} data={data} persist={null} reload={reload} isAdmin={isAdmin} onBack={()=>{setView("list");setSelEv(null);}} openEditEv={openEditEv} delEv={delEv} openNewTk={openNewTk} openEditTk={openEditTk} delTk={delTk} evTasks={evTasks} chgTkSt={chgTkSt} openNewMt={openNewMt} openEditMt={openEditMt} evMeetings={evMeetings} delMt={delMt} togPend={togPend} tab={tab} setTab={setTab} doConfirm={doConfirm}/>}
        </>}

        {/* ── EXPANSION SECTION ── */}
        {section==="expansion"&&<ExpansionView data={data} persist={null} reload={reload} isAdmin={isAdmin} doConfirm={doConfirm}/>}
      </div>
    </div>

    {/* Modals */}
    <Modal open={showEvMod} onClose={()=>setShowEvMod(false)} title={editEv?"Editar evento":"Novo evento"} wide>
      <Inp label="Nome" value={evF.name} onChange={e=>setEvF({...evF,name:e.target.value})} placeholder="Páscoa 2026"/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 130px"}}><Inp label="Data (próxima)" type="date" value={evF.date} onChange={e=>setEvF({...evF,date:e.target.value})}/></div><div style={{flex:"1 1 130px"}}><Sel label="Categoria" value={evF.category} onChange={e=>setEvF({...evF,category:e.target.value})} options={[{value:"",label:"…"},...CATEGORIES]}/></div><div style={{flex:"1 1 120px"}}><Sel label="Recorrência" value={evF.recurrence} onChange={e=>setEvF({...evF,recurrence:e.target.value})} options={["Único","Mensal","Bimestral","Trimestral","Semestral","Semanal"]}/></div></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 160px"}}><Inp label="Local" value={evF.location} onChange={e=>setEvF({...evF,location:e.target.value})}/></div><div style={{flex:"1 1 130px"}}><Inp label="Responsável" value={evF.responsible} onChange={e=>setEvF({...evF,responsible:e.target.value})}/></div></div>
      <Txa label="Descrição" value={evF.description} onChange={e=>setEvF({...evF,description:e.target.value})}/>
      {/* Occurrences */}
      {(evF.occurrences||[]).length>1&&<div style={{marginTop:4,marginBottom:8}}>
        <div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:4}}>Ocorrências ({evF.occurrences.length})</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{evF.occurrences.map((d,i)=><span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:8,background:C.cream,border:`1px solid ${C.border}`,color:C.text}}>{fD(d)}</span>)}</div>
      </div>}
      <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:6}}><Btn variant="secondary" onClick={()=>setShowEvMod(false)}>Cancelar</Btn><Btn onClick={saveEv} disabled={!evF.name.trim()||!evF.date}>{editEv?"Salvar":"Criar"}</Btn></div>
    </Modal>

    <Modal open={showTkMod} onClose={()=>setShowTkMod(false)} title={editTk?"Editar tarefa":"Nova tarefa"} wide>
      <Inp label="Nome" value={tkF.name} onChange={e=>setTkF({...tkF,name:e.target.value})}/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 130px"}}><Inp label="Responsável" value={tkF.responsible} onChange={e=>setTkF({...tkF,responsible:e.target.value})}/></div><div style={{flex:"1 1 130px"}}><Sel label="Área" value={tkF.area} onChange={e=>setTkF({...tkF,area:e.target.value})} options={[{value:"",label:"…"},...AREAS]}/></div><div style={{flex:"1 1 100px"}}><Sel label="Prioridade" value={tkF.priority} onChange={e=>setTkF({...tkF,priority:e.target.value})} options={Object.entries(PRI).map(([v,c])=>({value:v,label:`${c.i} ${c.l}`}))}/></div></div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 110px"}}><Inp label="Início" type="date" value={tkF.startDate} onChange={e=>setTkF({...tkF,startDate:e.target.value})}/></div><div style={{flex:"1 1 110px"}}><Inp label="Prazo" type="date" value={tkF.deadline} onChange={e=>setTkF({...tkF,deadline:e.target.value})}/></div><div style={{flex:"1 1 90px"}}><Sel label="Status" value={tkF.status} onChange={e=>setTkF({...tkF,status:e.target.value})} options={Object.entries(TS).filter(([k])=>k!=="bloqueada").map(([v,c])=>({value:v,label:c.l}))}/></div></div>
      <Txa label="Descrição" value={tkF.description} onChange={e=>setTkF({...tkF,description:e.target.value})}/>
      {evTasks.filter(t=>!editTk||t.id!==editTk.id).length>0&&<div style={{marginBottom:8}}><span style={{display:"block",fontSize:10,fontWeight:700,marginBottom:4,color:C.t2,textTransform:"uppercase"}}>Depende de</span>{evTasks.filter(t=>!editTk||t.id!==editTk.id).map(t=><label key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:8,border:`1.5px solid ${(tkF.dependsOn||[]).includes(t.id)?C.accent:C.border}`,background:(tkF.dependsOn||[]).includes(t.id)?C.accentBg:C.white,cursor:"pointer",fontSize:12,marginBottom:3}}><input type="checkbox" checked={(tkF.dependsOn||[]).includes(t.id)} onChange={()=>toggleDep(t.id)} style={{accentColor:C.accent}}/>{t.name}</label>)}</div>}
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={()=>setShowTkMod(false)}>Cancelar</Btn><Btn onClick={saveTk} disabled={!tkF.name.trim()}>{editTk?"Salvar":"Criar"}</Btn></div>
    </Modal>

    <Modal open={showMtMod} onClose={()=>setShowMtMod(false)} title={editMt?"Editar reunião":"Nova reunião"} wide>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{flex:"1 1 170px"}}><Inp label="Título" value={mtF.title} onChange={e=>setMtF({...mtF,title:e.target.value})}/></div><div style={{flex:"0 0 130px"}}><Inp label="Data" type="date" value={mtF.date} onChange={e=>setMtF({...mtF,date:e.target.value})}/></div></div>
      <Inp label="Participantes" value={mtF.participants} onChange={e=>setMtF({...mtF,participants:e.target.value})}/>
      <Txa label="Decisões" value={mtF.decisions} onChange={e=>setMtF({...mtF,decisions:e.target.value})}/>
      <Txa label="Anotações" value={mtF.notes} onChange={e=>setMtF({...mtF,notes:e.target.value})} placeholder="Observações, pontos de atenção…"/>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={()=>setShowMtMod(false)}>Cancelar</Btn><Btn onClick={saveMt} disabled={!mtF.date}>{editMt?"Salvar":"Registrar"}</Btn></div>
    </Modal>

    <Modal open={showTplMod} onClose={()=>setShowTplMod(false)} title="Duplicar evento">
      <Sel label="Modelo" value={tplEvId} onChange={e=>{setTplEvId(e.target.value);const ev=data.events.find(x=>x.id===e.target.value);if(ev)setTplName(ev.name+" (cópia)");}} options={[{value:"",label:"…"},...data.events.map(e=>({value:e.id,label:e.name}))]}/>
      {tplEvId&&<><Inp label="Nome" value={tplName} onChange={e=>setTplName(e.target.value)}/><Inp label="Data" type="date" value={tplDate} onChange={e=>setTplDate(e.target.value)}/></>}
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><Btn variant="secondary" onClick={()=>setShowTplMod(false)}>Cancelar</Btn><Btn onClick={saveTpl} disabled={!tplEvId||!tplName.trim()||!tplDate}>Duplicar</Btn></div>
    </Modal>

    <Modal open={showExport} onClose={()=>setShowExport(false)} title="Backup">
      <div style={{padding:"16px",borderRadius:12,background:C.cream,marginBottom:10}}><div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Exportar</div><Btn onClick={exportData}>Exportar JSON</Btn></div>
      <div style={{padding:"16px",borderRadius:12,background:C.cream,marginBottom:10}}><div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Importar backup</div><input type="file" accept=".json" onChange={importData} style={{fontSize:12}}/></div>
      <div style={{padding:"16px",borderRadius:12,background:C.tealBg,border:`1.5px solid rgba(0,172,179,0.2)`}}><div style={{fontSize:13,fontWeight:700,marginBottom:3,color:C.teal}}>Importar calendário</div><div style={{fontSize:11,color:C.t2,marginBottom:6}}>Importe o JSON do calendário CBRio para adicionar todos os eventos com recorrência.</div><input type="file" accept=".json" onChange={importCalendar} style={{fontSize:12}}/></div>
    </Modal>

    {/* Confirm Dialog */}
    <Modal open={!!confirmAction} onClose={()=>setConfirmAction(null)} title="Confirmar">
      <div style={{fontSize:14,color:C.text,marginBottom:16}}>{confirmAction?.msg}</div>
      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
        <Btn variant="secondary" onClick={()=>setConfirmAction(null)}>Cancelar</Btn>
        <Btn variant="danger" onClick={execConfirm}>Excluir</Btn>
      </div>
    </Modal>
  </div>;
}

// Simplified sub-components referenced above
function Dashboard({data,onSelect}){
  const evs=data.events;const active=evs.filter(e=>e.status!=="concluido");const upcoming=active.sort((a,b)=>new Date(a.activeDate||a.date)-new Date(b.activeDate||b.date)).slice(0,8);
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
      {[{l:"Eventos ativos",v:active.length,c:C.accent},{l:"Tarefas abertas",v:data.tasks.filter(t=>t.status!=="concluida").length,c:C.teal},{l:"Pendências",v:(data.pendencies||[]).filter(p=>!p.done).length,c:"#D4910A"}].map(k=><div key={k.l} style={{padding:"18px 20px",borderRadius:14,background:`${k.c}0A`,border:`1.5px solid ${k.c}20`}}><div style={{fontSize:30,fontWeight:800,color:k.c,lineHeight:1}}>{k.v}</div><div style={{fontSize:10,color:C.t2,marginTop:6,fontWeight:600,textTransform:"uppercase"}}>{k.l}</div></div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>
      <Calendar events={data.events} onSelect={onSelect}/>
      <div style={{padding:"18px",borderRadius:16,background:C.white,border:`1.5px solid ${C.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:10}}>Próximos eventos</div>
        {upcoming.length===0?<div style={{fontSize:12,color:C.t3,textAlign:"center",padding:20}}>Nenhum evento ativo</div>:
          upcoming.map(ev=><div key={ev.id} onClick={()=>onSelect?.(ev.id)} style={{padding:"10px 12px",borderRadius:10,background:C.cream,border:`1.5px solid ${C.border}`,marginBottom:5,cursor:"pointer",borderLeft:`4px solid ${CAT_COLORS[ev.category]||C.t3}`,transition:"all .12s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:13,fontWeight:600}}>{ev.name}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
              <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t2}}>{ev.category&&<span style={{width:6,height:6,borderRadius:"50%",background:CAT_COLORS[ev.category]||C.t3,display:"inline-block"}}/>}{fD(ev.activeDate||ev.date)}</div>
              <Days date={ev.activeDate||ev.date}/>
            </div>
          </div>)}
      </div>
    </div>
  </div>;
}

function Calendar({events,onSelect}){const today=new Date();today.setHours(0,0,0,0);const[vY,setVY]=useState(today.getFullYear());const[vM,setVM]=useState(today.getMonth());const MO=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];const DA=["D","S","T","Q","Q","S","S"];const fd=new Date(vY,vM,1).getDay();const dim=new Date(vY,vM+1,0).getDate();const[selDay,setSelDay]=useState(null);const getEv=day=>{const ds=`${vY}-${String(vM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;return events.filter(e=>norm(e.date)===ds||(e.occurrences||[]).some(o=>norm(o)===ds));};const selEvs=selDay?getEv(selDay):[];return <div style={{padding:"20px",borderRadius:16,background:C.white,border:`1.5px solid ${C.border}`,marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><button onClick={()=>{if(vM===0){setVM(11);setVY(vY-1);}else setVM(vM-1);}} style={{background:C.cream,border:"none",borderRadius:10,cursor:"pointer",color:C.accent,fontSize:18,padding:"6px 14px",fontWeight:700}}>‹</button><div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.text}}>{MO[vM]}</div><div style={{fontSize:12,color:C.t2}}>{vY}</div></div><button onClick={()=>{if(vM===11){setVM(0);setVY(vY+1);}else setVM(vM+1);}} style={{background:C.cream,border:"none",borderRadius:10,cursor:"pointer",color:C.accent,fontSize:18,padding:"6px 14px",fontWeight:700}}>›</button></div><div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>{DA.map(d=><div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.t3,padding:6}}>{d}</div>)}{Array.from({length:fd}).map((_,i)=><div key={"e"+i}/>)}{Array.from({length:dim}).map((_,i)=>{const day=i+1;const evs=getEv(day);const isT=vY===today.getFullYear()&&vM===today.getMonth()&&day===today.getDate();const isSel=selDay===day;return <div key={day} onClick={()=>setSelDay(isSel?null:day)} style={{padding:"5px 2px",borderRadius:10,textAlign:"center",cursor:evs.length?"pointer":"default",background:isSel?C.mint:isT?C.accent:"transparent",border:`2px solid ${isT&&!isSel?C.accent:"transparent"}`,minHeight:44}}><div style={{fontSize:13,fontWeight:isT?800:500,color:isT&&!isSel?C.white:C.text}}>{day}</div>{evs.length>0&&<div style={{display:"flex",justifyContent:"center",gap:3,marginTop:3}}>{evs.slice(0,3).map((e,j)=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:CAT_COLORS[e.category]||C.t3}}/>)}</div>}</div>;})}</div>{selDay&&<div style={{marginTop:14,borderTop:`1.5px solid ${C.border}`,paddingTop:12}}><div style={{fontSize:11,fontWeight:700,color:C.t2,textTransform:"uppercase",marginBottom:8}}>{selDay} de {MO[vM]}</div>{selEvs.length===0?<div style={{fontSize:12,color:C.t3}}>Nenhum evento</div>:selEvs.map(ev=><div key={ev.id} onClick={()=>onSelect?.(ev.id)} style={{padding:"10px 12px",borderRadius:10,background:C.cream,border:`1.5px solid ${C.border}`,marginBottom:5,cursor:"pointer",borderLeft:`4px solid ${CAT_COLORS[ev.category]||C.t3}`}}><div style={{fontSize:13,fontWeight:700}}>{ev.name}</div><div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.t2}}>{ev.category&&<span style={{width:6,height:6,borderRadius:"50%",background:CAT_COLORS[ev.category]||C.t3,display:"inline-block"}}/>}{ev.category||""}</div></div>)}</div>}</div>;}
function AreaView({data}){const[sel,setSel]=useState("");const cats=[...new Set(data.events.map(e=>e.category).filter(Boolean))];const filteredEvs=sel?data.events.filter(e=>e.category===sel&&e.status!=="concluido"):[];return <div><div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>{cats.map(cat=><button key={cat} onClick={()=>setSel(sel===cat?"":cat)} style={{padding:"6px 14px",borderRadius:10,border:`1.5px solid ${sel===cat?(CAT_COLORS[cat]||C.accent):C.border}`,background:sel===cat?`${CAT_COLORS[cat]||C.accent}12`:C.white,color:sel===cat?(CAT_COLORS[cat]||C.accent):C.t2,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat]||C.t3}}/>{cat}</button>)}</div>{!sel?<Empty icon="—" title="Selecione uma categoria" sub="Veja todos os eventos e tarefas por categoria"/>:filteredEvs.length===0?<Empty icon="✅" title="Nenhum evento ativo" sub={`Nenhum evento aberto em ${sel}`}/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>{filteredEvs.map(ev=>{const et=data.tasks.filter(t=>t.eventId===ev.id);const done=et.filter(t=>t.status==="concluida").length;return <div key={ev.id} style={{padding:"14px 16px",borderRadius:14,border:`1.5px solid ${C.border}`,background:C.white,borderLeft:`4px solid ${CAT_COLORS[sel]||C.t3}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:et.length?6:0}}><div><div style={{fontSize:14,fontWeight:700,color:C.text}}>{ev.name}</div><div style={{fontSize:11,color:C.t2}}>{fD(ev.activeDate||ev.date)} {ev.recurrence&&ev.recurrence!=="Único"&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:6,background:C.tealBg,color:C.teal,fontWeight:700}}>{ev.recurrence} · {(ev.occurrences||[]).filter(d=>(ev.occurrenceData||{})[d]?.status==="finalizado").length}/{(ev.occurrences||[]).length}</span>} {ev.responsible&&`· ${ev.responsible}`}</div></div><div style={{display:"flex",alignItems:"center",gap:4}}><Badge status={ev.status}/><Days date={ev.activeDate||ev.date}/></div></div>{et.length>0&&<div style={{marginTop:6}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t2,marginBottom:3}}><span>{done}/{et.length} tarefas</span></div>{et.map(t=><div key={t.id} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.cream,marginBottom:3,borderLeft:`3px solid ${TS[t.status]?.c}`}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12}}><span style={{fontWeight:500}}>{t.name}</span><div style={{display:"flex",gap:4,alignItems:"center"}}>{t.responsible&&<span style={{fontSize:10,color:C.t2}}>{t.responsible}</span>}<Badge status={t.status} config={TS}/>{t.deadline&&<Days date={t.deadline}/>}</div></div></div>)}</div>}</div>})}</div>}</div>;}
function AgentsTab({data,reload}){const[agent,setAgent]=useState("transcriber");const[transcript,setTranscript]=useState("");const[selEvId,setSelEvId]=useState("");const[processing,setProcessing]=useState(false);const[monRes,setMonRes]=useState(null);const[queue,setQueue]=useState([]);
  useEffect(()=>{agentsApi.getQueue().then(setQueue).catch(()=>{});},[data]);
  const processT=async()=>{if(!transcript.trim()||!selEvId)return;setProcessing(true);try{await agentsApi.transcribe(selEvId,transcript);setTranscript("");const q=await agentsApi.getQueue();setQueue(q);}catch(e){console.error(e);}finally{setProcessing(false);}};
  const runMonitor=async()=>{try{const res=await agentsApi.monitor();setMonRes(res.alerts||[]);}catch(e){console.error(e);}};
  const approve=async(item)=>{try{await agentsApi.approve(item.id);const q=await agentsApi.getQueue();setQueue(q);reload();}catch(e){console.error(e);}};
  const reject=async(item)=>{try{await agentsApi.reject(item.id);const q=await agentsApi.getQueue();setQueue(q);}catch(e){console.error(e);}};
  const pending=queue.filter(q=>q.status==="pending");
  return <div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:16}}>{[{id:"transcriber",name:"Transcritor",color:C.accent},{id:"monitor",name:"Monitor",color:"#D4910A"},{id:"progress",name:"Progresso",color:C.teal}].map(a=><div key={a.id} onClick={()=>setAgent(a.id)} style={{padding:"12px",borderRadius:12,background:agent===a.id?C.accentBg:C.white,border:`1.5px solid ${agent===a.id?C.accent:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}><span style={{width:10,height:10,borderRadius:"50%",background:a.color,flexShrink:0}}/><span style={{fontSize:13,fontWeight:700}}>{a.name}</span></div>)}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><div style={{padding:"16px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`}}>{agent==="transcriber"&&<><Sel label="Evento" value={selEvId} onChange={e=>setSelEvId(e.target.value)} options={[{value:"",label:"…"},...data.events.filter(e=>e.status!=="concluido").map(e=>({value:e.id,label:e.name}))]}/>  <Txa label="Transcrição" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Cole aqui…" style={{minHeight:140,fontSize:12}}/><Btn onClick={processT} disabled={processing||!transcript.trim()||!selEvId}>{processing?"…":"Processar"}</Btn></>}{agent==="monitor"&&<><div style={{fontSize:12,color:C.t2,marginBottom:10}}>Varre riscos.</div><Btn variant="accent" onClick={runMonitor}>Varrer</Btn>{monRes&&<div style={{marginTop:10}}>{monRes.length===0?<div style={{color:C.accent,fontWeight:600,fontSize:12}}>Tudo ok!</div>:monRes.map((a,i)=><div key={i} style={{padding:"6px 8px",borderRadius:6,fontSize:11,borderLeft:`3px solid ${a.severity==="critico"?"#C94040":"#D4910A"}`,background:a.severity==="critico"?"rgba(201,64,64,0.04)":"rgba(212,145,10,0.04)",marginBottom:3}}>{a.message}</div>)}</div>}</>}{agent==="progress"&&<div style={{fontSize:12,color:C.t2}}>Use o agente Monitor para varredura ou o Transcritor para processar updates.</div>}</div><div style={{padding:"16px",borderRadius:14,background:C.white,border:`1.5px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,marginBottom:8}}>Fila ({pending.length})</div>{pending.length===0?<div style={{fontSize:12,color:C.t3,textAlign:"center",padding:16}}>Vazia</div>:pending.slice(0,8).map(item=><div key={item.id} style={{padding:"8px 10px",borderRadius:10,border:`1.5px solid ${C.border}`,background:C.cream,marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",gap:4}}><div><div style={{fontSize:12,fontWeight:600}}>{item.label}</div><div style={{fontSize:10,color:C.t2}}>{item.preview}</div></div><div style={{display:"flex",gap:3}}><Btn small variant="success" onClick={()=>approve(item)}>✓</Btn><Btn small variant="danger" onClick={()=>reject(item)}>✕</Btn></div></div></div>)}</div></div></div>;}
