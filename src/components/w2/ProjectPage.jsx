'use client';

import { useState, useEffect } from 'react';
import { SLabel, AreaBadge, Inp, Sel, Btn, PBar, Empty, IS, toast } from '../ui';
import { uid, computeGoalProgress } from '@/lib/utils';
import TaskRow from '../TaskRow';

export default function ProjectPage({project,tasks,goals,onBack,onUpdateProject,onToggleTask,onDeleteTask,onAddTask}){
  const [notes,setNotes]=useState(project.notes||"");
  const [newTask,setNewTask]=useState("");
  const [prio,setPrio]=useState("media");
  const [due,setDue]=useState("");
  const ptasks=tasks.filter(t=>t.projectId===project.id).sort((a,b)=>a.done===b.done?0:a.done?1:-1);
  const linkedGoal=goals.find(g=>g.id===project.goalId);
  const pct=linkedGoal?computeGoalProgress(linkedGoal,tasks):null;

  useEffect(()=>{setNotes(project.notes||"");},[project.id]);
  const saveNotes=()=>{onUpdateProject({...project,notes});toast("Notas salvas");};
  const addT=()=>{if(!newTask.trim())return;onAddTask({id:uid(),title:newTask,projectId:project.id,priority:prio,dueDate:due,notes:"",done:false,goalId:project.goalId||null,createdAt:new Date().toISOString()});setNewTask("");setDue("");toast("Task criada");};

  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13,padding:"0 0 16px",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>← Projetos</button>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <div>
          <div style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}><AreaBadge area={project.area}/><span style={{fontSize:12,color:"#888"}}>{project.status==="doing"?"Em andamento":project.status==="todo"?"A fazer":"Concluído"}</span></div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>{project.name}</h2>
          {project.description&&<p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>{project.description}</p>}
        </div>
        {linkedGoal&&(
          <div style={{background:"#f7f6f3",borderRadius:8,padding:"10px 14px",minWidth:200,maxWidth:260}}>
            <p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase"}}>Meta vinculada</p>
            <p style={{margin:"0 0 6px",fontSize:13,fontWeight:600}}>{linkedGoal.title}</p>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"#888"}}>Progresso</span><span style={{fontSize:12,fontWeight:700}}>{pct}%</span></div>
            <PBar pct={pct||0} color={pct>=100?"#1e8449":pct>=60?"#d68910":"#1a1a1a"}/>
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
        <div>
          <SLabel>Tasks ({ptasks.filter(t=>!t.done).length} pendentes)</SLabel>
          <div style={{marginBottom:12,display:"flex",gap:6}}>
            <Inp value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addT()} placeholder="Nova task…" style={{flex:1}}/>
            <Sel value={prio} onChange={e=>setPrio(e.target.value)} style={{width:90}}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></Sel>
            <Inp type="date" value={due} onChange={e=>setDue(e.target.value)} style={{width:110}}/>
            <Btn sm onClick={addT}>+</Btn>
          </div>
          {!ptasks.length?<Empty text="Nenhuma task nesse projeto."/>:ptasks.map(t=>(
            <TaskRow key={t.id} task={t} onToggle={()=>onToggleTask(t.id)} onDelete={()=>onDeleteTask(t.id)}/>
          ))}
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <SLabel>Notas do projeto</SLabel>
            <Btn variant="ghost" sm onClick={saveNotes}>Salvar</Btn>
          </div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contexto, decisões, próximos passos, links relevantes…"
            style={{...IS,resize:"none",lineHeight:1.7,minHeight:320,fontSize:13}}/>
          <p style={{fontSize:11,color:"#ccc",marginTop:6}}>Clique em "Salvar" para persistir</p>
        </div>
      </div>
    </div>
  );
}
