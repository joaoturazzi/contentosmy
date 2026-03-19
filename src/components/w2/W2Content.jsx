'use client';

import { useState } from 'react';
import { Modal, FormRow, Inp, Sel, Txa, Btn, Card, FPill, ChipBadge, Empty, toast } from '../ui';
import { CH, CTYPES, PL, PL_COLS, PL_NEXT } from '@/lib/constants';
import { uid } from '@/lib/utils';

export default function W2Content({w2,setW2}){
  const {content}=w2;
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({title:"",channel:"linkedin",type:"Post",status:"idea",scheduledDate:"",description:""});
  const [cf,setCf]=useState("todos");
  const filtered=cf==="todos"?content:content.filter(c=>c.channel===cf);
  const addC=()=>{if(!form.title.trim())return;setW2(d=>({...d,content:[...d.content,{...form,id:uid(),createdAt:new Date().toISOString()}]}));setForm({title:"",channel:"linkedin",type:"Post",status:"idea",scheduledDate:"",description:""});setModal(false);toast("Conteúdo criado");};
  const advance=id=>setW2(d=>({...d,content:d.content.map(c=>{if(c.id!==id)return c;const n=PL_NEXT[c.status];return n?{...c,status:n}:c;})}));
  const back=id=>setW2(d=>({...d,content:d.content.map(c=>{if(c.id!==id)return c;const prev=Object.entries(PL_NEXT).find(([,v])=>v===c.status)?.[0];return prev?{...c,status:prev}:c;})}));
  const del=id=>{if(!window.confirm("Excluir?"))return;setW2(d=>({...d,content:d.content.filter(c=>c.id!==id)}));toast("Conteúdo excluído");};
  const setDate=(id,date)=>setW2(d=>({...d,content:d.content.map(c=>c.id===id?{...c,scheduledDate:date}:c)}));
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({title:"",channel:"linkedin",type:"Post",status:"idea",scheduledDate:"",description:""});
  const openEdit=(c)=>{setEditForm({title:c.title||"",channel:c.channel||"linkedin",type:c.type||"Post",status:c.status||"idea",scheduledDate:c.scheduledDate||"",description:c.description||""});setEditId(c.id);};
  const saveEdit=()=>{if(!editForm.title.trim())return;setW2(d=>({...d,content:d.content.map(c=>c.id===editId?{...c,...editForm}:c)}));setEditId(null);toast("Conteúdo atualizado");};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Pipeline de Conteúdo</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>{content.filter(c=>c.status!=="published").length} em produção · {content.filter(c=>c.status==="published").length} publicados · <span style={{color:"#8e44ad"}}>datas sincronizam com calendário W1</span></p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Novo conteúdo</Btn>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        <FPill label="Todos" active={cf==="todos"} onClick={()=>setCf("todos")}/>
        {Object.entries(CH).slice(0,3).map(([k,v])=><FPill key={k} label={v.label} active={cf===k} color={v.color} onClick={()=>setCf(k)}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,alignItems:"start"}}>
        {PL_COLS.map(col=>{
          const cards=filtered.filter(c=>c.status===col);
          return(
            <div key={col} style={{background:"#f7f6f3",borderRadius:8,padding:"10px",minHeight:120}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#888"}}>{PL[col]}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{cards.length}</span>
              </div>
              {!cards.length&&<p style={{fontSize:11,color:"#ccc",textAlign:"center",padding:"0.5rem 0"}}>—</p>}
              {cards.map(c=>(
                <div key={c.id} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:6,padding:"10px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div style={{display:"flex",gap:4}}><ChipBadge ch={c.channel}/><span style={{fontSize:10,color:"#bbb",alignSelf:"center"}}>{c.type}</span></div>
                    <button onClick={()=>openEdit(c)} style={{background:"none",border:"none",cursor:"pointer",color:"#e0e0de",fontSize:11,padding:0}} title="Editar">✎</button>
                    <button onClick={()=>del(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#e0e0de",fontSize:12,padding:0,marginLeft:2}}>×</button>
                  </div>
                  <p style={{margin:"0 0 5px",fontSize:12,fontWeight:600,lineHeight:1.3}}>{c.title}</p>
                  {c.description&&<p style={{margin:"0 0 5px",fontSize:11,color:"#888",lineHeight:1.4}}>{c.description.slice(0,55)}{c.description.length>55?"…":""}</p>}
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:5}}>
                    <input type="date" value={c.scheduledDate||""} onChange={e=>setDate(c.id,e.target.value)} style={{fontSize:10,border:"none",background:"transparent",color:"#aaa",fontFamily:"inherit",cursor:"pointer",padding:0,width:"100%"}}/>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    {col!=="idea"&&<button onClick={()=>back(c.id)} style={{fontSize:10,padding:"2px 6px",borderRadius:4,cursor:"pointer",background:"transparent",border:"1px solid #e0e0de",color:"#888",fontFamily:"inherit"}}>← voltar</button>}
                    {PL_NEXT[col]&&<button onClick={()=>advance(c.id)} style={{fontSize:10,padding:"2px 7px",borderRadius:4,cursor:"pointer",background:"#1a1a1a",border:"none",color:"#fff",fontFamily:"inherit",fontWeight:600}}>avançar →</button>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Novo conteúdo" width={460}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FormRow label="Título"><Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Título do conteúdo" autoFocus onKeyDown={e=>{if(e.key==="Enter")addC();}}/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <FormRow label="Canal"><Sel value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))} style={{width:"100%"}}>{Object.entries(CH).slice(0,3).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel></FormRow>
            <FormRow label="Tipo"><Sel value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{width:"100%"}}>{CTYPES.map(t=><option key={t} value={t}>{t}</option>)}</Sel></FormRow>
            <FormRow label="Etapa"><Sel value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}>{PL_COLS.map(s=><option key={s} value={s}>{PL[s]}</option>)}</Sel></FormRow>
          </div>
          <FormRow label="Data programada"><Inp type="date" value={form.scheduledDate} onChange={e=>setForm(f=>({...f,scheduledDate:e.target.value}))}/></FormRow>
          <FormRow label="Descrição"><Txa value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2}/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={addC}>Adicionar</Btn></div>
        </div>
      </Modal>
      <Modal open={!!editId} onClose={()=>setEditId(null)} title="Editar conteúdo" width={460}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <FormRow label="Título"><Inp value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} autoFocus onKeyDown={e=>{if(e.key==="Enter")saveEdit();}}/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <FormRow label="Canal"><Sel value={editForm.channel} onChange={e=>setEditForm(f=>({...f,channel:e.target.value}))} style={{width:"100%"}}>{Object.entries(CH).slice(0,3).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel></FormRow>
            <FormRow label="Tipo"><Sel value={editForm.type} onChange={e=>setEditForm(f=>({...f,type:e.target.value}))} style={{width:"100%"}}>{CTYPES.map(t=><option key={t} value={t}>{t}</option>)}</Sel></FormRow>
            <FormRow label="Etapa"><Sel value={editForm.status} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}>{PL_COLS.map(s=><option key={s} value={s}>{PL[s]}</option>)}</Sel></FormRow>
          </div>
          <FormRow label="Data programada"><Inp type="date" value={editForm.scheduledDate} onChange={e=>setEditForm(f=>({...f,scheduledDate:e.target.value}))}/></FormRow>
          <FormRow label="Descrição"><Txa value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={2}/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setEditId(null)}>Cancelar</Btn><Btn onClick={saveEdit}>Salvar</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
