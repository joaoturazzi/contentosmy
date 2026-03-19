'use client';

import { useState } from 'react';
import { Card, Modal, FormRow, Inp, Sel, Txa, Btn, FPill, toast } from '../ui';
import { TOOL_CYCLE, TOOL_ST } from '@/lib/constants';
import { uid } from '@/lib/utils';

export default function W2Tools({w2,setW2}){
  const {tools}=w2;
  const [cf,setCf]=useState("todos");const [modal,setModal]=useState(false);const [form,setForm]=useState({name:"",category:"",status:"on",url:"",desc:""});
  const cats=["todos",...[...new Set(tools.map(t=>t.category))]];
  const filtered=cf==="todos"?tools:tools.filter(t=>t.category===cf);
  const cycle=id=>setW2(d=>({...d,tools:d.tools.map(t=>t.id===id?{...t,status:TOOL_CYCLE[t.status]||"on"}:t)}));
  const del=id=>{if(!window.confirm("Excluir?"))return;setW2(d=>({...d,tools:d.tools.filter(t=>t.id!==id)}));toast("Ferramenta excluída");};
  const add=()=>{if(!form.name.trim())return;setW2(d=>({...d,tools:[...d.tools,{id:uid(),...form}]}));setForm({name:"",category:"",status:"on",url:"",desc:""});setModal(false);toast("Ferramenta adicionada");};
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({name:"",category:"",status:"on",url:"",desc:""});
  const openEdit=(t)=>{setEditForm({name:t.name||"",category:t.category||"",status:t.status||"on",url:t.url||"",desc:t.desc||""});setEditId(t.id);};
  const saveEdit=()=>{if(!editForm.name.trim())return;setW2(d=>({...d,tools:d.tools.map(t=>t.id===editId?{...t,...editForm}:t)}));setEditId(null);toast("Ferramenta atualizada");};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Stack de Ferramentas</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>{tools.filter(t=>t.status==="on").length} ativas · {tools.filter(t=>t.status==="warn").length} com atenção</p>
        </div>
        <Btn onClick={()=>setModal(true)}>+ Ferramenta</Btn>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {cats.map(c=><FPill key={c} label={c==="todos"?"Todas":c} active={cf===c} onClick={()=>setCf(c)}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
        {filtered.map(t=>{const st=TOOL_ST[t.status]||TOOL_ST.off;return(
          <Card key={t.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
              <div><p style={{margin:0,fontSize:14,fontWeight:700}}>{t.name}</p><span style={{fontSize:11,color:"#aaa"}}>{t.category}</span></div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <button onClick={()=>cycle(t.id)} style={{fontSize:10,fontWeight:700,background:st.bg,color:st.color,border:"none",borderRadius:10,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>{st.label}</button>
                <button onClick={()=>openEdit(t)} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:11,padding:"0 3px"}} title="Editar">✎</button>
                <button onClick={()=>del(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:13,padding:0}}>×</button>
              </div>
            </div>
            {t.desc&&<p style={{margin:"0 0 5px",fontSize:12,color:"#888",lineHeight:1.4}}>{t.desc}</p>}
            {t.url&&<a href={t.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#1a5276",textDecoration:"none"}}>↗ {t.url.replace("https://","")}</a>}
          </Card>
        );})}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Nova ferramenta" width={400}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <FormRow label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus onKeyDown={e=>{if(e.key==="Enter")add();}}/></FormRow>
            <FormRow label="Categoria"><Inp value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="IA, Automação…"/></FormRow>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <FormRow label="URL"><Inp value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://"/></FormRow>
            <FormRow label="Status"><Sel value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}><option value="on">On</option><option value="warn">Atenção</option><option value="off">Off</option></Sel></FormRow>
          </div>
          <FormRow label="Descrição"><Txa value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} rows={2}/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={add}>Adicionar</Btn></div>
        </div>
      </Modal>
      <Modal open={!!editId} onClose={()=>setEditId(null)} title="Editar ferramenta" width={400}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <FormRow label="Nome"><Inp value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} autoFocus onKeyDown={e=>{if(e.key==="Enter")saveEdit();}}/></FormRow>
            <FormRow label="Categoria"><Inp value={editForm.category} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))}/></FormRow>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <FormRow label="URL"><Inp value={editForm.url} onChange={e=>setEditForm(f=>({...f,url:e.target.value}))}/></FormRow>
            <FormRow label="Status"><Sel value={editForm.status} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}><option value="on">On</option><option value="warn">Atenção</option><option value="off">Off</option></Sel></FormRow>
          </div>
          <FormRow label="Descrição"><Txa value={editForm.desc} onChange={e=>setEditForm(f=>({...f,desc:e.target.value}))} rows={2}/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setEditId(null)}>Cancelar</Btn><Btn onClick={saveEdit}>Salvar</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
