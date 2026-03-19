'use client';

import { useState } from 'react';
import { Modal, FormRow, Inp, Sel, Txa, Btn, FPill, Empty, toast } from '../ui';
import { AREA_C } from '@/lib/constants';
import { uid, today, dateStr } from '@/lib/utils';
import TaskRow from '../TaskRow';

export default function W2Tasks({w2,setW2}){
  const {tasks,projects}=w2;
  const [modal,setModal]=useState(null);
  const [draft,setDraft]=useState({});
  const [sf,setSf]=useState("pendentes");
  const [pf,setPf]=useState("todos");
  const newT=()=>({id:uid(),title:"",projectId:"",priority:"media",dueDate:"",notes:"",done:false,goalId:null,createdAt:new Date().toISOString()});
  const openEdit=t=>{setDraft({...t});setModal(t.id);};
  const save=()=>{if(!draft.title?.trim())return;setW2(d=>({...d,tasks:modal==="new"?[draft,...d.tasks]:d.tasks.map(t=>t.id===modal?draft:t)}));setModal(null);toast(modal==="new"?"Task criada":"Task atualizada");};
  const toggle=id=>setW2(d=>({...d,tasks:d.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)}));
  const del=id=>{if(!window.confirm("Excluir?"))return;setW2(d=>({...d,tasks:d.tasks.filter(t=>t.id!==id)}));toast("Task excluída");};
  const visible=tasks.filter(t=>{const s=sf==="pendentes"?!t.done:sf==="concluídas"?t.done:true;const p=pf==="todos"||t.projectId===pf;return s&&p;}).sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;const td2=today();const aL=a.dueDate&&a.dueDate<td2?0:1;const bL=b.dueDate&&b.dueDate<td2?0:1;if(aL!==bL)return aL-bL;const pd={alta:0,media:1,baixa:2};return(pd[a.priority]||1)-(pd[b.priority]||1)||((a.dueDate||"9")<(b.dueDate||"9")?-1:1);});
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Tasks</h2>
        <Btn onClick={()=>{setDraft(newT());setModal("new");}}>+ Nova task</Btn>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
        {["todas","pendentes","concluídas"].map(f=><FPill key={f} label={f} active={sf===f} onClick={()=>setSf(f)}/>)}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        <FPill label="Todos" active={pf==="todos"} onClick={()=>setPf("todos")}/>
        {projects.map(p=>{const c=AREA_C[p.area];return <FPill key={p.id} label={p.name.length>22?p.name.slice(0,22)+"…":p.name} active={pf===p.id} color={c?.color} onClick={()=>setPf(p.id)}/>;  })}
      </div>
      {!visible.length?<Empty text="Nenhuma task aqui."/>:sf==="concluídas"?visible.map(t=>{
        const proj=projects.find(p=>p.id===t.projectId);
        return <TaskRow key={t.id} task={t} project={proj} showProject onToggle={()=>toggle(t.id)} onDelete={()=>del(t.id)} onEdit={()=>openEdit(t)}/>;
      }):(()=>{const td=today();const eoW=(()=>{const d2=new Date();d2.setDate(d2.getDate()+(7-d2.getDay())%7);return dateStr(d2);})();const pending=visible.filter(t=>!t.done);const done=visible.filter(t=>t.done);const grps=[{k:"hoje",l:"Hoje",items:pending.filter(t=>t.dueDate&&t.dueDate<=td)},{k:"semana",l:"Esta semana",items:pending.filter(t=>t.dueDate&&t.dueDate>td&&t.dueDate<=eoW)},{k:"depois",l:"Mais tarde",items:pending.filter(t=>t.dueDate&&t.dueDate>eoW)},{k:"sem",l:"Sem data",items:pending.filter(t=>!t.dueDate)}].filter(g=>g.items.length>0);const rT=t=>{const proj=projects.find(p=>p.id===t.projectId);return <TaskRow key={t.id} task={t} project={proj} showProject onToggle={()=>toggle(t.id)} onDelete={()=>del(t.id)} onEdit={()=>openEdit(t)}/>;};return(<>{grps.map(g=>(<div key={g.k}><p style={{fontSize:11,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:"0.5px",margin:"16px 0 6px"}}>{g.l}</p>{g.items.map(rT)}</div>))}{done.length>0&&<div><p style={{fontSize:11,fontWeight:600,color:"#999",textTransform:"uppercase",letterSpacing:"0.5px",margin:"16px 0 6px"}}>Concluídas</p>{done.map(rT)}</div>}</>);})()}
      <p style={{marginTop:10,fontSize:12,color:"#ccc"}}>{visible.filter(t=>!t.done).length} pendentes · {visible.filter(t=>t.done).length} concluídas</p>
      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==="new"?"Nova task":"Editar task"} width={480}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FormRow label="Título"><Inp value={draft.title||""} onChange={e=>setDraft(d=>({...d,title:e.target.value}))} placeholder="O que precisa ser feito?" autoFocus onKeyDown={e=>{if(e.key==="Enter")save();}}/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <FormRow label="Projeto"><Sel value={draft.projectId||""} onChange={e=>setDraft(d=>({...d,projectId:e.target.value}))} style={{width:"100%"}}><option value="">— sem projeto —</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name.slice(0,24)}</option>)}</Sel></FormRow>
            <FormRow label="Prioridade"><Sel value={draft.priority||"media"} onChange={e=>setDraft(d=>({...d,priority:e.target.value}))} style={{width:"100%"}}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></Sel></FormRow>
            <FormRow label="Vencimento"><Inp type="date" value={draft.dueDate||""} onChange={e=>setDraft(d=>({...d,dueDate:e.target.value}))}/></FormRow>
          </div>
          <FormRow label="Meta vinculada"><Sel value={draft.goalId||""} onChange={e=>setDraft(d=>({...d,goalId:e.target.value||null}))} style={{width:"100%"}}><option value="">— sem meta —</option>{w2.goals.map(g=><option key={g.id} value={g.id}>{g.title.slice(0,40)}</option>)}</Sel></FormRow>
          <FormRow label="Notas"><Txa value={draft.notes||""} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} rows={2} placeholder="Contexto, links…"/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
