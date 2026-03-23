'use client';

import { useState } from 'react';
import { Inp, Sel, toast } from '../ui';
import { NOTE_CATS_W2 } from '@/lib/constants';
import { uid } from '@/lib/utils';

export default function W2Notes({w2,setW2}){
  const notes=w2.notes||[];
  const {projects}=w2;
  const setNotes=fn=>setW2(d=>({...d,notes:typeof fn==="function"?fn(d.notes||[]):fn}));
  const [active,setActive]=useState(null);const [newTit,setNewTit]=useState("");const [addM,setAddM]=useState(false);const [search,setSearch]=useState("");
  const add=()=>{if(!newTit.trim())return;const n={id:uid(),title:newTit,content:"",projectId:"",category:"Geral",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};setNotes(p=>[n,...p]);setNewTit("");setAddM(false);setActive(n.id);toast("Nota criada");};
  const upd=(id,f,v)=>setNotes(p=>p.map(n=>n.id===id?{...n,[f]:v,updatedAt:new Date().toISOString()}:n));
  const del=id=>{if(!window.confirm("Excluir?"))return;setNotes(p=>p.filter(n=>n.id!==id));if(active===id)setActive(null);toast("Nota excluída");};
  const filtered=notes.filter(n=>!search||n.title.toLowerCase().includes(search.toLowerCase())||(n.content||"").toLowerCase().includes(search.toLowerCase()));
  const an=notes.find(n=>n.id===active);
  const linkedProject=an&&an.projectId?(projects||[]).find(p=>p.id===an.projectId):null;
  const catColor={"Reunião":"#1a5276","Decisão":"#c0392b","Referência":"#d68910","Geral":"#888"};

  return(
    <div style={{display:"grid",gridTemplateColumns:"220px 1fr",minHeight:540,border:"1px solid #eceae5",borderRadius:10,overflow:"hidden"}}>
      <div style={{background:"#fafaf9",borderRight:"1px solid #eceae5",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 14px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:"0.09em",textTransform:"uppercase"}}>Notas</span>
            <button onClick={()=>setAddM(s=>!s)} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:17,padding:"0 3px",lineHeight:1}}>+</button>
          </div>
          <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…" style={{fontSize:12,padding:"5px 8px"}}/>
        </div>
        {addM&&<div style={{padding:"0 14px 10px"}}><Inp value={newTit} onChange={e=>setNewTit(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Nome da nota…" autoFocus style={{fontSize:12,padding:"5px 8px"}}/></div>}
        <div style={{flex:1,overflowY:"auto"}}>
          {!filtered.length?<p style={{fontSize:12,color:"#ccc",textAlign:"center",padding:"1.5rem 0"}}>Sem notas.</p>:
            filtered.map(n=>(
              <div key={n.id} onClick={()=>{setActive(n.id);setAddM(false);}} style={{padding:"9px 14px",cursor:"pointer",background:active===n.id?"#fff":"transparent",borderLeft:active===n.id?"2px solid #1a1a1a":"2px solid transparent",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{minWidth:0,flex:1}}>
                  <p style={{margin:0,fontSize:13,fontWeight:active===n.id?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title||"Sem título"}</p>
                  <div style={{display:"flex",gap:4,marginTop:2,alignItems:"center"}}>
                    <span style={{fontSize:10,color:catColor[n.category]||"#888",fontWeight:600}}>{n.category||"Geral"}</span>
                    {n.projectId&&<span style={{fontSize:10,color:"#1a5276"}}>⬡</span>}
                    <span style={{fontSize:11,color:"#ccc"}}>{new Date(n.updatedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();del(n.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:13,padding:"0 2px",marginLeft:4}}>×</button>
              </div>
            ))}
        </div>
      </div>
      <div style={{background:"#fff",display:"flex",flexDirection:"column"}}>
        {an?(
          <div style={{flex:1,padding:"20px 24px",display:"flex",flexDirection:"column",gap:10}}>
            <input value={an.title} onChange={e=>upd(an.id,"title",e.target.value)} style={{fontSize:20,fontWeight:700,border:"none",outline:"none",color:"#1a1a1a",fontFamily:"inherit",letterSpacing:"-0.3px",width:"100%",background:"transparent"}}/>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <Sel value={an.category||"Geral"} onChange={e=>upd(an.id,"category",e.target.value)} style={{fontSize:11,padding:"3px 8px",width:"auto"}}>
                {NOTE_CATS_W2.map(c=><option key={c} value={c}>{c}</option>)}
              </Sel>
              <Sel value={an.projectId||""} onChange={e=>upd(an.id,"projectId",e.target.value)} style={{fontSize:11,padding:"3px 8px",flex:1}}>
                <option value="">— Vincular a projeto —</option>
                {(projects||[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </Sel>
            </div>
            {linkedProject&&<div style={{margin:"4px 0",padding:"6px 10px",background:"#eaf2fb",borderRadius:6,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:"#1a5276"}}>⬡</span><span style={{fontSize:12,color:"#1a5276",fontWeight:600}}>Projeto: {linkedProject.name}</span></div>}
            <p style={{margin:0,fontSize:11,color:"#ccc"}}>Salvo {new Date(an.updatedAt).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</p>
            <textarea value={an.content} onChange={e=>upd(an.id,"content",e.target.value)} placeholder="Começa a escrever aqui…" style={{flex:1,border:"none",outline:"none",resize:"none",fontSize:14,lineHeight:1.8,color:"#333",fontFamily:"inherit",background:"transparent",minHeight:400}}/>
          </div>
        ):<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontSize:13,color:"#ccc"}}>Selecione ou crie uma nota</p></div>}
      </div>
    </div>
  );
}
