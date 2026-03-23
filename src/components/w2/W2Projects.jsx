'use client';

import { useState } from 'react';
import { Modal, FormRow, Inp, Sel, Txa, Btn, AreaBadge, PBar, toast } from '../ui';
import { AREAS, AREA_C } from '@/lib/constants';
import { uid, computeGoalProgress } from '@/lib/utils';
import ProjectPage from './ProjectPage';

export default function W2Projects({w2,setW2,openProject,setOpenProject}){
  const {projects,tasks,goals}=w2;
  const [modal,setModal]=useState(null);
  const [draft,setDraft]=useState({});

  const newP=()=>({id:uid(),name:"",area:"Patagon AI",status:"todo",description:"",notes:"",goalId:null,createdAt:new Date().toISOString()});

  const save=()=>{
    if(!draft.name?.trim())return;
    setW2(d=>({...d,projects:modal==="new"?[draft,...d.projects]:d.projects.map(p=>p.id===modal?draft:p)}));
    toast(modal==="new"?"Projeto criado":"Projeto atualizado");
    setModal(null);
  };
  const del=id=>{if(!window.confirm("Excluir projeto?"))return;setW2(d=>({...d,projects:d.projects.filter(p=>p.id!==id)}));toast("Projeto excluído");};
  const move=(id,dir)=>{const cols=["todo","doing","done"];setW2(d=>({...d,projects:d.projects.map(p=>{if(p.id!==id)return p;const i=cols.indexOf(p.status),ni=i+dir;return ni>=0&&ni<cols.length?{...p,status:cols[ni]}:p;})}));};

  if(openProject){
    const proj=projects.find(p=>p.id===openProject);
    if(proj) return(
      <ProjectPage project={proj} tasks={tasks} goals={goals} clients={w2.clients||[]} projectNotes={w2.notes||[]}
        onBack={()=>setOpenProject(null)}
        onUpdateProject={updated=>setW2(d=>({...d,projects:d.projects.map(p=>p.id===updated.id?updated:p)}))}
        onToggleTask={id=>setW2(d=>({...d,tasks:d.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)}))}
        onDeleteTask={id=>{if(!window.confirm("Excluir?"))return;setW2(d=>({...d,tasks:d.tasks.filter(t=>t.id!==id)}));toast("Task excluída");}}
        onAddTask={t=>setW2(d=>({...d,tasks:[...d.tasks,t]}))}
        onAddNote={n=>setW2(d=>({...d,notes:[n,...(d.notes||[])]}))}
        onUpdateNote={(id,f,v)=>setW2(d=>({...d,notes:(d.notes||[]).map(n=>n.id===id?{...n,[f]:v,updatedAt:new Date().toISOString()}:n)}))}
        onDeleteNote={id=>{setW2(d=>({...d,notes:(d.notes||[]).filter(n=>n.id!==id)}));toast("Nota excluída");}}
      />
    );
  }

  const COLS=[{id:"todo",label:"A fazer"},{id:"doing",label:"Em andamento"},{id:"done",label:"Concluído"}];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Projetos</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>{projects.filter(p=>p.status==="doing").length} em andamento · {projects.filter(p=>p.status==="todo").length} a fazer</p>
        </div>
        <Btn onClick={()=>{setDraft(newP());setModal("new");}}>+ Novo projeto</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,alignItems:"start"}}>
        {COLS.map(col=>{
          const colP=projects.filter(p=>p.status===col.id);
          return(
            <div key={col.id} style={{background:"#f7f6f3",borderRadius:8,padding:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#888"}}>{col.label}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{colP.length}</span>
              </div>
              {!colP.length&&<p style={{fontSize:12,color:"#ccc",textAlign:"center",padding:"1rem 0"}}>—</p>}
              {colP.map(p=>{
                const pt=tasks.filter(t=>t.projectId===p.id&&!t.done).length;
                const linkedGoal=goals.find(g=>g.id===p.goalId);
                const gpct=linkedGoal?computeGoalProgress(linkedGoal,tasks):null;
                return(
                  <div key={p.id} className="card-hover" style={{background:"#fff",border:"1px solid #eceae5",borderRadius:6,padding:"12px",marginBottom:8,cursor:"pointer",transition:"border-color .12s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <AreaBadge area={p.area}/>
                      <div style={{display:"flex",gap:2}}>
                        {col.id!=="todo"&&<button onClick={e=>{e.stopPropagation();move(p.id,-1);}} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:12,padding:"0 3px"}}>←</button>}
                        {col.id!=="done"&&<button onClick={e=>{e.stopPropagation();move(p.id,1);}} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:12,padding:"0 3px"}}>→</button>}
                        <button onClick={e=>{e.stopPropagation();setDraft({...p});setModal(p.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:11,padding:"0 3px"}}>✎</button>
                        <button onClick={e=>{e.stopPropagation();del(p.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#e0e0de",fontSize:13,padding:"0 2px"}}>×</button>
                      </div>
                    </div>
                    <p onClick={()=>setOpenProject(p.id)} style={{margin:"0 0 4px",fontSize:13,fontWeight:700,lineHeight:1.3,color:"#1a1a1a"}}>{p.name}</p>
                    {p.description&&<p style={{margin:"0 0 6px",fontSize:12,color:"#888",lineHeight:1.4}}>{p.description.slice(0,70)}{p.description.length>70?"…":""}</p>}
                    {gpct!==null&&<div style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10,color:"#aaa"}}>{linkedGoal?.title?.slice(0,30)}</span><span style={{fontSize:10,fontWeight:700,color:"#888"}}>{gpct}%</span></div><PBar pct={gpct} color={gpct>=100?"#1e8449":"#1a1a1a"} thin/></div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      {pt>0?<span style={{fontSize:11,color:"#888"}}>{pt} task{pt!==1?"s":""} pendente{pt!==1?"s":""}</span>:<span/>}
                      <button onClick={()=>setOpenProject(p.id)} style={{fontSize:11,color:"#1a5276",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0,fontWeight:600}}>Abrir →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <Modal open={!!modal} onClose={()=>setModal(null)} title={modal==="new"?"Novo projeto":"Editar projeto"} width={480}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FormRow label="Nome"><Inp value={draft.name||""} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Nome do projeto" autoFocus/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FormRow label="Área"><Sel value={draft.area||"Patagon AI"} onChange={e=>setDraft(d=>({...d,area:e.target.value}))} style={{width:"100%"}}>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</Sel></FormRow>
            <FormRow label="Status"><Sel value={draft.status||"todo"} onChange={e=>setDraft(d=>({...d,status:e.target.value}))} style={{width:"100%"}}><option value="todo">A fazer</option><option value="doing">Em andamento</option><option value="done">Concluído</option></Sel></FormRow>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FormRow label="Meta vinculada">
              <Sel value={draft.goalId||""} onChange={e=>setDraft(d=>({...d,goalId:e.target.value||null}))} style={{width:"100%"}}>
                <option value="">— sem meta —</option>
                {w2.goals.map(g=><option key={g.id} value={g.id}>{g.title.slice(0,40)}</option>)}
              </Sel>
            </FormRow>
            <FormRow label="Cliente vinculado">
              <Sel value={draft.clientId||""} onChange={e=>setDraft(d=>({...d,clientId:e.target.value||null}))} style={{width:"100%"}}>
                <option value="">— sem cliente —</option>
                {(w2.clients||[]).map(c=><option key={c.id} value={c.id}>{c.name}{c.company?" ("+c.company+")":""}</option>)}
              </Sel>
            </FormRow>
          </div>
          <FormRow label="Descrição"><Txa value={draft.description||""} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} rows={2} placeholder="Objetivo e contexto…"/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn><Btn onClick={save}>Salvar</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
