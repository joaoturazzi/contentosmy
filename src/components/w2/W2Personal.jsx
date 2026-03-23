'use client';

import { useState } from 'react';
import { Inp, Btn, Empty, toast } from '../ui';
import { uid, today, dateStr, fmtFull } from '@/lib/utils';

export default function W2Personal({w2,setW2}){
  const personal=w2.personal||[];
  const setP=fn=>setW2(d=>({...d,personal:typeof fn==="function"?fn(d.personal||[]):fn}));
  const [sel,setSel]=useState(today());
  const [newT,setNewT]=useState("");

  const prev=()=>{const d=new Date(sel+'T12:00');d.setDate(d.getDate()-1);setSel(dateStr(d));};
  const next=()=>{const d=new Date(sel+'T12:00');d.setDate(d.getDate()+1);setSel(dateStr(d));};
  const goToday=()=>setSel(today());

  const dayItems=personal.filter(p=>p.date===sel).sort((a,b)=>a.done===b.done?0:a.done?1:-1);
  const doneCount=dayItems.filter(p=>p.done).length;

  const add=()=>{if(!newT.trim())return;setP(p=>[{id:uid(),title:newT,done:false,date:sel,notes:"",createdAt:new Date().toISOString()},...p]);setNewT("");toast("Tarefa adicionada");};
  const toggle=id=>setP(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));
  const del=id=>{if(!window.confirm("Excluir?"))return;setP(p=>p.filter(t=>t.id!==id));toast("Tarefa excluída");};
  const upd=(id,field,val)=>setP(p=>p.map(t=>t.id===id?{...t,[field]:val}:t));

  const isToday=sel===today();
  const td=today();
  // week overview
  const weekStart=new Date(sel+'T12:00');
  weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return dateStr(d);});

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Tarefas Pessoais</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>Organize seu dia</p>
        </div>
      </div>

      {/* Week bar */}
      <div style={{display:"flex",gap:4,marginBottom:16,alignItems:"center"}}>
        <Btn variant="ghost" sm onClick={prev}>‹</Btn>
        {weekDays.map(d=>{
          const cnt=(personal||[]).filter(p=>p.date===d).length;
          const done=(personal||[]).filter(p=>p.date===d&&p.done).length;
          const dayName=new Date(d+'T12:00').toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
          const dayNum=new Date(d+'T12:00').getDate();
          const isSel=d===sel;
          const isT=d===td;
          return(
            <button key={d} onClick={()=>setSel(d)} style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",border:isSel?"2px solid #1a1a1a":"2px solid transparent",background:isSel?"#f7f6f3":"transparent",textAlign:"center",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontSize:10,color:"#aaa",fontWeight:600,textTransform:"uppercase"}}>{dayName}</span>
              <span style={{fontSize:16,fontWeight:isT?800:600,color:isT?"#1a1a1a":"#555"}}>{dayNum}</span>
              {cnt>0&&<span style={{fontSize:9,color:done===cnt?"#1e8449":"#bbb"}}>{done}/{cnt}</span>}
            </button>
          );
        })}
        <Btn variant="ghost" sm onClick={next}>›</Btn>
        {!isToday&&<Btn variant="ghost" sm onClick={goToday}>Hoje</Btn>}
      </div>

      {/* Date header */}
      <p style={{margin:"0 0 14px",fontSize:14,fontWeight:600,color:"#555"}}>{fmtFull(sel)}{isToday&&<span style={{marginLeft:8,fontSize:11,color:"#1e8449",fontWeight:700}}>HOJE</span>}</p>

      {/* Quick add */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <Inp value={newT} onChange={e=>setNewT(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="O que precisa fazer?" style={{flex:1}} autoFocus/>
        <Btn onClick={add}>+</Btn>
      </div>

      {/* Tasks */}
      {!dayItems.length?<Empty text="Nenhuma tarefa para este dia."/>:
        dayItems.map(t=>(
          <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f4f1"}}>
            <input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)} style={{width:16,height:16,cursor:"pointer",flexShrink:0,marginTop:2,accentColor:"#1a1a1a"}}/>
            <div style={{flex:1,minWidth:0}}>
              <input value={t.title} onChange={e=>upd(t.id,"title",e.target.value)} style={{width:"100%",border:"none",outline:"none",fontSize:14,color:t.done?"#bbb":"#1a1a1a",textDecoration:t.done?"line-through":"none",fontFamily:"inherit",background:"transparent",padding:0,fontWeight:500}}/>
              {t.notes?<p style={{margin:"2px 0 0",fontSize:12,color:"#bbb",lineHeight:1.4}}>{t.notes}</p>:null}
            </div>
            <button onClick={()=>del(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#e0e0de",fontSize:14,padding:"0 2px",flexShrink:0}}>×</button>
          </div>
        ))
      }

      {dayItems.length>0&&<p style={{marginTop:10,fontSize:12,color:"#ccc"}}>{doneCount} de {dayItems.length} concluída{dayItems.length!==1?"s":""}</p>}
    </div>
  );
}
