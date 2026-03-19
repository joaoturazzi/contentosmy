'use client';
import { useState, useEffect } from 'react';
import { Modal, Inp, Sel, Btn, FPill, toast } from './ui';
import { CH, CTYPES } from '@/lib/constants';
import { uid } from '@/lib/utils';

export default function QuickCapture({open,type:initialType,onClose,ws,w1,setW1,w2,setW2}){
  const [type,setType]=useState(initialType||"task");
  const [form,setForm]=useState({title:"",channel:"geral",priority:"media",dueDate:"",projectId:"",channel2:"youtube",contentType:"Post"});
  useEffect(()=>{setType(initialType||"task");setForm({title:"",channel:"geral",priority:"media",dueDate:"",projectId:"",channel2:"youtube",contentType:"Post"});},[initialType,open]);

  const save=()=>{
    if(!form.title.trim())return;
    if(type==="task"){
      if(ws==="content") setW1(d=>({...d,tasks:[{id:uid(),title:form.title,channel:form.channel,priority:form.priority,dueDate:form.dueDate,notes:"",done:false,createdAt:new Date().toISOString()},...d.tasks]}));
      else setW2(d=>({...d,tasks:[{id:uid(),title:form.title,projectId:form.projectId,priority:form.priority,dueDate:form.dueDate,notes:"",done:false,goalId:null,createdAt:new Date().toISOString()},...d.tasks]}));
    }
    if(type==="idea") setW1(d=>({...d,ideas:[{id:uid(),title:form.title,channel:form.channel,description:"",tags:"",priority:"media",scheduled:false,scoreThumbnail:false,scoreLoop:false,scoreOriginal:false,status:"ideia",createdAt:new Date().toISOString()},...d.ideas]}));
    if(type==="note") setW1(d=>({...d,notes:[{id:uid(),title:form.title,content:"",category:"Geral",eventId:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},...d.notes]}));
    if(type==="project") setW2(d=>({...d,projects:[{id:uid(),name:form.title,area:"Patagon AI",status:"todo",description:"",notes:"",goalId:null,createdAt:new Date().toISOString()},...d.projects]}));
    if(type==="goal"){
      if(ws==="content") setW1(d=>({...d,goals:[{id:uid(),title:form.title,category:"Canal",status:"ativo",progress:0,deadline:"",description:"",progressMode:"manual",keyResults:[],createdAt:new Date().toISOString()},...d.goals]}));
      else setW2(d=>({...d,goals:[{id:uid(),title:form.title,category:"Produto",status:"ativo",progress:0,deadline:"",description:"",progressMode:"manual",keyResults:[],createdAt:new Date().toISOString()},...d.goals]}));
    }
    if(type==="content") setW2(d=>({...d,content:[{id:uid(),title:form.title,channel:form.channel2,type:form.contentType,status:"idea",scheduledDate:"",description:"",createdAt:new Date().toISOString()},...d.content]}));
    if(type==="guest") setW1(d=>({...d,guests:[{id:uid(),name:form.title,company:"",role:"",linkedin:"",email:"",phone:"",status:"potencial",notes:"",createdAt:new Date().toISOString()},...(d.guests||[])]}));
    const labels={task:"Task criada",idea:"Ideia criada",note:"Nota criada",project:"Projeto criado",goal:"Meta criada",content:"Conteúdo criado",guest:"Convidado adicionado"};
    toast(labels[type]||"Criado");
    onClose();
  };

  const TYPES=ws==="content"
    ?[["task","Task"],["idea","Ideia"],["note","Nota"],["goal","Meta"],["guest","Convidado"]]
    :[["task","Task"],["project","Projeto"],["goal","Meta"],["content","Conteúdo"]];

  return(
    <Modal open={open} onClose={onClose} title={null} width={420}>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {TYPES.map(([t,l])=><FPill key={t} label={l} active={type===t} onClick={()=>setType(t)}/>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder={type==="task"?"O que precisa ser feito?":type==="idea"?"Qual é a ideia?":type==="note"?"Título da nota…":type==="project"?"Nome do projeto…":type==="goal"?"Qual é a meta?":type==="guest"?"Nome do convidado…":"Título do conteúdo…"} autoFocus onKeyDown={e=>e.key==="Enter"&&save()}/>
        {type==="task"&&ws==="content"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <Sel value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))} style={{width:"100%"}}>{Object.entries(CH).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel>
            <Sel value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={{width:"100%"}}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></Sel>
            <Inp type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
          </div>
        )}
        {type==="task"&&ws==="opb"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <Sel value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} style={{width:"100%"}}><option value="">— projeto —</option>{w2.projects.map(p=><option key={p.id} value={p.id}>{p.name.slice(0,22)}</option>)}</Sel>
            <Sel value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={{width:"100%"}}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></Sel>
            <Inp type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
          </div>
        )}
        {type==="idea"&&(
          <Sel value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))} style={{width:"100%"}}>{Object.entries(CH).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel>
        )}
        {type==="content"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Sel value={form.channel2} onChange={e=>setForm(f=>({...f,channel2:e.target.value}))} style={{width:"100%"}}>{Object.entries(CH).slice(0,3).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel>
            <Sel value={form.contentType} onChange={e=>setForm(f=>({...f,contentType:e.target.value}))} style={{width:"100%"}}>{CTYPES.map(t=><option key={t} value={t}>{t}</option>)}</Sel>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>
  );
}
