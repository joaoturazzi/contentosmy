'use client';
import { useState, useEffect } from 'react';
import { Modal, FormRow, Inp, Sel, Txa, Btn } from './ui';
import { GST } from '@/lib/constants';
import { blankGoal, blankKR, uid } from '@/lib/utils';

export default function GoalModal({open,onClose,initial,onSave,cats}){
  const [d,setD]=useState(initial||blankGoal(cats));
  useEffect(()=>setD(initial||blankGoal(cats)),[initial,open]);
  const addKR=()=>setD(g=>({...g,keyResults:[...(g.keyResults||[]),blankKR()]}));
  const updKR=(id,f,v)=>setD(g=>({...g,keyResults:g.keyResults.map(k=>k.id===id?{...k,[f]:v}:k)}));
  const delKR=id=>setD(g=>({...g,keyResults:g.keyResults.filter(k=>k.id!==id)}));
  return(
    <Modal open={open} onClose={onClose} title={initial?"Editar meta":"Nova meta"} width={560}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <FormRow label="Título"><Inp value={d.title} onChange={e=>setD(g=>({...g,title:e.target.value}))} placeholder="Qual é a meta?" autoFocus/></FormRow>
        <FormRow label="Descrição"><Txa value={d.description} onChange={e=>setD(g=>({...g,description:e.target.value}))} rows={2} placeholder="Por que essa meta importa?"/></FormRow>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
          <FormRow label="Categoria"><Sel value={d.category} onChange={e=>setD(g=>({...g,category:e.target.value}))} style={{width:"100%"}}>{cats.map(c=><option key={c} value={c}>{c}</option>)}</Sel></FormRow>
          <FormRow label="Status"><Sel value={d.status} onChange={e=>setD(g=>({...g,status:e.target.value}))} style={{width:"100%"}}>{Object.entries(GST).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel></FormRow>
          <FormRow label="Progresso"><Sel value={d.progressMode} onChange={e=>setD(g=>({...g,progressMode:e.target.value}))} style={{width:"100%"}}><option value="manual">Manual</option><option value="tasks">Automático (tasks)</option><option value="keyResults">Key Results</option></Sel></FormRow>
          <FormRow label="Prazo"><Inp type="date" value={d.deadline} onChange={e=>setD(g=>({...g,deadline:e.target.value}))}/></FormRow>
        </div>
        {d.progressMode==="manual"&&<FormRow label={`Progresso manual: ${d.progress||0}%`}><input type="range" min={0} max={100} value={d.progress||0} onChange={e=>setD(g=>({...g,progress:Number(e.target.value)}))} style={{accentColor:"#1a1a1a"}}/></FormRow>}
        {d.progressMode==="keyResults"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase"}}>Key Results</label>
              <Btn variant="ghost" sm onClick={addKR}>+ KR</Btn>
            </div>
            {!(d.keyResults||[]).length&&<p style={{fontSize:12,color:"#ccc",margin:"0 0 4px"}}>Adicione KRs mensuráveis.</p>}
            {(d.keyResults||[]).map(kr=>(
              <div key={kr.id} style={{display:"grid",gridTemplateColumns:"1fr 72px 72px 56px 20px",gap:6,marginBottom:6,alignItems:"center"}}>
                <Inp value={kr.title} onChange={e=>updKR(kr.id,"title",e.target.value)} placeholder="KR"/>
                <Inp type="number" value={kr.current} onChange={e=>updKR(kr.id,"current",Number(e.target.value))} placeholder="Atual"/>
                <Inp type="number" value={kr.target} onChange={e=>updKR(kr.id,"target",Number(e.target.value))} placeholder="Meta"/>
                <Inp value={kr.unit} onChange={e=>updKR(kr.id,"unit",e.target.value)} placeholder="unit"/>
                <button onClick={()=>delKR(kr.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:15,padding:0}}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:4}}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={()=>{if(d.title.trim()){onSave(d);onClose();}}}>Salvar meta</Btn>
        </div>
      </div>
    </Modal>
  );
}
