'use client';

import { useState } from 'react';
import { Btn, FPill, Empty, toast } from '../ui';
import { GST, GCATS2 } from '@/lib/constants';
import GoalCard from '../GoalCard';
import GoalModal from '../GoalModal';

export default function W2Goals({w2,setW2}){
  const {goals,tasks}=w2;
  const setGoals=fn=>setW2(d=>({...d,goals:typeof fn==="function"?fn(d.goals):fn}));
  const [modal,setModal]=useState(null);
  const [filter,setFilter]=useState("todos");
  const visible=filter==="todos"?goals:goals.filter(g=>g.status===filter);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Metas & Objetivos</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>{goals.filter(g=>g.status==="ativo").length} ativas · {goals.filter(g=>g.status==="concluido").length} concluídas</p>
        </div>
        <Btn onClick={()=>setModal("new")}>+ Nova meta</Btn>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:18}}>
        {["todos","ativo","pausado","concluido"].map(f=><FPill key={f} label={f==="todos"?"Todos":GST[f]?.label} active={filter===f} onClick={()=>setFilter(f)}/>)}
      </div>
      {!visible.length?<Empty text="Nenhuma meta aqui."/>:visible.map(g=>(
        <GoalCard key={g.id} goal={g} tasks={tasks}
          onEdit={()=>setModal(g.id)}
          onDelete={()=>{if(!window.confirm("Excluir?"))return;setGoals(p=>p.filter(x=>x.id!==g.id));toast("Meta excluída");}}
          onSetProgress={v=>setGoals(p=>p.map(x=>x.id===g.id?{...x,progress:v}:x))}
          onSetKRCurrent={(kid,val)=>setGoals(p=>p.map(x=>x.id===g.id?{...x,keyResults:x.keyResults.map(k=>k.id===kid?{...k,current:Number(val)}:k)}:x))}
        />
      ))}
      <GoalModal open={!!modal} onClose={()=>setModal(null)} initial={modal&&modal!=="new"?goals.find(g=>g.id===modal):null} cats={GCATS2}
        onSave={d=>{setGoals(p=>modal==="new"?[d,...p]:p.map(g=>g.id===modal?d:g));toast(modal==="new"?"Meta criada":"Meta atualizada");}}/>
    </div>
  );
}
