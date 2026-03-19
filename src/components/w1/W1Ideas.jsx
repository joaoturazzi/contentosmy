'use client';

import { useState } from 'react';
import { Card, Inp, Sel, Txa, Btn, FPill, ChipBadge, Modal, FormRow, toast } from '../ui';
import { CH, CHECKLISTS_BY_TYPE, EVT_ST, EVT_ST_KEYS, IDEA_NEXT } from '@/lib/constants';
import { uid } from '@/lib/utils';

export default function W1Ideas({w1,setW1,setPage}){
  const {ideas}=w1;
  const setIdeas=fn=>setW1(d=>({...d,ideas:typeof fn==="function"?fn(d.ideas):fn}));
  const setEvents=fn=>setW1(d=>({...d,events:typeof fn==="function"?fn(d.events):fn}));
  const blankForm={title:"",channel:"youtube",description:"",tags:"",priority:"media",scoreThumbnail:false,scoreLoop:false,scoreOriginal:false};
  const [form,setForm]=useState(blankForm);
  const [cf,setCf]=useState("todos");const [sf,setSf]=useState(false);
  const [schedIdea,setSchedIdea]=useState(null);
  const [schedDate,setSchedDate]=useState("");
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState(blankForm);
  const [tagFilter,setTagFilter]=useState("");
  const [scoreFilter,setScoreFilter]=useState(-1);
  const allTags=[...new Set(ideas.flatMap(i=>(i.tags||"").split(",").map(t=>t.trim()).filter(Boolean)))];

  const add=()=>{
    if(!form.title.trim())return;
    setIdeas(p=>[{id:uid(),...form,status:"ideia",scheduled:false,createdAt:new Date().toISOString()},...p]);
    setForm(blankForm);
    setSf(false);
    toast("Ideia criada");
  };
  const del=id=>{if(!window.confirm("Excluir?"))return;setW1(d=>({...d,ideas:d.ideas.filter(i=>i.id!==id),events:d.events.map(e=>e.ideaId===id?{...e,ideaId:null}:e)}));toast("Ideia excluída");};
  const openEdit=(idea)=>{setEditForm({title:idea.title||"",channel:idea.channel||"youtube",description:idea.description||"",tags:idea.tags||"",priority:idea.priority||"media",scoreThumbnail:idea.scoreThumbnail||false,scoreLoop:idea.scoreLoop||false,scoreOriginal:idea.scoreOriginal||false});setEditId(idea.id);};
  const saveEdit=()=>{if(!editForm.title.trim())return;const idea=ideas.find(i=>i.id===editId);const titleChanged=idea&&editForm.title!==idea.title;const chChanged=idea&&editForm.channel!==idea.channel;if(idea?.scheduled&&(titleChanged||chChanged)){setW1(d=>({...d,ideas:d.ideas.map(i=>i.id===editId?{...i,...editForm}:i),events:d.events.map(e=>e.ideaId===editId?{...e,...(titleChanged?{title:editForm.title}:{}),...(chChanged?{channel:editForm.channel}:{})}:e)}));}else{setIdeas(p=>p.map(i=>i.id===editId?{...i,...editForm}:i));}setEditId(null);toast("Ideia atualizada");};

  const advance=id=>setW1(d=>{
    const idea=d.ideas.find(i=>i.id===id);if(!idea)return d;
    const n=IDEA_NEXT[idea.status||"ideia"];if(!n)return d;
    return {...d,ideas:d.ideas.map(i=>i.id===id?{...i,status:n}:i),events:idea.scheduled?d.events.map(e=>e.ideaId===id?{...e,status:n}:e):d.events};
  });
  const back=id=>setW1(d=>{
    const idea=d.ideas.find(i=>i.id===id);if(!idea)return d;
    const prev=Object.entries(IDEA_NEXT).find(([,v])=>v===(idea.status||"ideia"))?.[0];if(!prev)return d;
    return {...d,ideas:d.ideas.map(i=>i.id===id?{...i,status:prev}:i),events:idea.scheduled?d.events.map(e=>e.ideaId===id?{...e,status:prev}:e):d.events};
  });

  const scheduleIdea=()=>{
    if(!schedIdea||!schedDate)return;
    const idea=ideas.find(i=>i.id===schedIdea);
    if(!idea)return;
    setW1(d=>({
      ...d,
      events:[...d.events,{id:uid(),title:idea.title,channel:idea.channel,type:"Vídeo",description:idea.description||"",link:"",date:schedDate,status:"producao",altTitle:"",thumbnailConcept:"",openLoop:"",interviewee:"",checklist:CHECKLISTS_BY_TYPE["Vídeo"].map(()=>false),views:null,ctr:null,avgRetention:null,newSubs:null,winningThumb:"",scoreThumbnail:idea.scoreThumbnail||false,scoreLoop:idea.scoreLoop||false,scoreOriginal:idea.scoreOriginal||false,ideaId:idea.id,isProduction:false,guestId:null,structure:"",questions:"",cta:"",strategicNotes:"",createdAt:new Date().toISOString()}],
      ideas:d.ideas.map(i=>i.id===schedIdea?{...i,scheduled:true,status:"producao"}:i),
    }));
    setSchedIdea(null);
    setSchedDate("");
  };

  const ideaScore=(idea)=>[idea.scoreThumbnail,idea.scoreLoop,idea.scoreOriginal].filter(Boolean).length;

  const prioOrder={alta:0,media:1,baixa:2};
  const filtered=ideas.filter(i=>(cf==="todos"||i.channel===cf)&&(!tagFilter||(i.tags||"").toLowerCase().includes(tagFilter.toLowerCase()))&&(scoreFilter<0||ideaScore(i)===scoreFilter))
    .sort((a,b)=>{
      const pa=(prioOrder[a.priority]??1),pb=(prioOrder[b.priority]??1);
      if(pa!==pb)return pa-pb;
      const sa=ideaScore(a),sb=ideaScore(b);
      if(sa!==sb)return sb-sa;
      return 0;
    });

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 56px)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexShrink:0}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Banco de Ideias</h2>
        <Btn onClick={()=>setSf(s=>!s)}>+ Nova ideia</Btn>
      </div>
      {sf&&<Card style={{marginBottom:18,flexShrink:0}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ideia de conteúdo…" autoFocus onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&add()}/>
          <div style={{display:"flex",gap:8}}>
            <Sel value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}>{Object.entries(CH).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel>
            <Sel value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></Sel>
            <Inp value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="Tags (IA, tutorial…)" style={{flex:1}}/>
          </div>
          <Txa value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Contexto, ângulo, referências…"/>
          <div style={{background:"#fafaf9",borderRadius:6,padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:10,fontWeight:700,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase"}}>Validação rápida</span>
            {[["scoreThumbnail","Tem thumbnail clara possível?"],["scoreLoop","Tem loop aberto claro (curiosidade)?"],["scoreOriginal","É um ângulo original — ninguém fez exatamente isso?"]].map(([key,label])=>(
              <label key={key} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#555",cursor:"pointer"}}>
                <input type="checkbox" checked={form[key]} onChange={()=>setForm(f=>({...f,[key]:!f[key]}))} style={{width:14,height:14,cursor:"pointer"}}/>
                {label}
              </label>
            ))}
            <span style={{fontSize:12,color:"#888"}}>Score: {"★".repeat([form.scoreThumbnail,form.scoreLoop,form.scoreOriginal].filter(Boolean).length)}{"☆".repeat(3-[form.scoreThumbnail,form.scoreLoop,form.scoreOriginal].filter(Boolean).length)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setSf(false)}>Cancelar</Btn><Btn onClick={add}>Salvar</Btn></div>
        </div>
      </Card>}
      <div style={{display:"flex",gap:6,marginBottom:allTags.length?6:14,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
        {["todos",...Object.keys(CH)].map(c=><FPill key={c} label={c==="todos"?"Todas":CH[c].label} active={cf===c} color={c!=="todos"?CH[c].color:undefined} onClick={()=>setCf(c)}/>)}
        <span style={{color:"#e0e0de",alignSelf:"center"}}>|</span>
        {[-1,3,2,1,0].map(s=><FPill key={s} label={s<0?"Todas":s===0?"☆☆☆":"★".repeat(s)+"☆".repeat(3-s)} active={scoreFilter===s} color={s>0?"#d68910":undefined} onClick={()=>setScoreFilter(s)}/>)}
        <span style={{fontSize:12,color:"#bbb",alignSelf:"center",marginLeft:4}}>{filtered.length} ideia{filtered.length!==1?"s":""}</span>
      </div>
      {allTags.length>0&&<div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
        <span style={{fontSize:10,color:"#bbb",fontWeight:600,marginRight:2}}>Tags:</span>
        {allTags.map(t=><button key={t} onClick={()=>setTagFilter(tagFilter===t?"":t)} style={{fontSize:10,padding:"2px 8px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",fontWeight:600,background:tagFilter===t?"#1a1a1a":"#f4f4f3",color:tagFilter===t?"#fff":"#888",border:"none"}}>{t}</button>)}
        {tagFilter&&<button onClick={()=>setTagFilter("")} style={{fontSize:10,color:"#c0392b",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>limpar</button>}
      </div>}

      {/* Kanban board */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,flex:1,minHeight:0,overflow:"hidden"}}>
        {EVT_ST_KEYS.map(col=>{
          const st=EVT_ST[col];
          const cards=filtered.filter(i=>(i.status||"ideia")===col);
          return(
            <div key={col} style={{background:"#f7f6f3",borderRadius:8,padding:"10px",overflowY:"auto",minHeight:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:st.color}}>{st.label}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{cards.length}</span>
              </div>
              {!cards.length&&<p style={{fontSize:11,color:"#ccc",textAlign:"center",padding:"0.5rem 0"}}>—</p>}
              {cards.map(idea=>{
                const sc=ideaScore(idea);
                return(
                  <div key={idea.id} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:6,padding:"10px",marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                        <ChipBadge ch={idea.channel}/>
                        <span style={{fontSize:10,color:"#d68910",letterSpacing:1}}>{"★".repeat(sc)}{"☆".repeat(3-sc)}</span>
                        {idea.scheduled&&<span style={{fontSize:9,color:"#1e8449",background:"#eafaf1",padding:"1px 4px",borderRadius:3,fontWeight:600}}>agendada</span>}
                      </div>
                      <div style={{display:"flex",gap:2,flexShrink:0}}>
                        <button onClick={()=>openEdit(idea)} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:11,padding:"0 2px"}} title="Editar">✎</button>
                        <button onClick={()=>del(idea.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:13,padding:"0 2px"}}>×</button>
                      </div>
                    </div>
                    <p style={{margin:"0 0 4px",fontSize:12,fontWeight:600,lineHeight:1.3}}>{idea.title}</p>
                    {idea.description&&<p style={{margin:"0 0 4px",fontSize:11,color:"#888",lineHeight:1.4}}>{idea.description.slice(0,80)}{idea.description.length>80?"…":""}</p>}
                    {idea.tags&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:4}}>{idea.tags.split(",").map(t=>t.trim()).filter(Boolean).map((t,i)=><span key={i} style={{fontSize:9,background:"#f4f4f3",color:"#888",padding:"1px 5px",borderRadius:3,fontWeight:600}}>{t}</span>)}</div>}
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
                      {!idea.scheduled&&<button onClick={()=>{setSchedIdea(idea.id);setSchedDate("");}} style={{fontSize:10,color:"#1a5276",background:"#eaf2fb",border:"none",cursor:"pointer",padding:"2px 6px",borderRadius:3,fontWeight:600,fontFamily:"inherit"}}>Agendar</button>}
                      {idea.scheduled&&setPage&&<button onClick={()=>setPage("calendar")} style={{fontSize:10,color:"#1e8449",background:"#eafaf1",border:"none",cursor:"pointer",padding:"2px 6px",borderRadius:3,fontWeight:600,fontFamily:"inherit"}}>Calendário →</button>}
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      {col!=="ideia"&&<button onClick={()=>back(idea.id)} style={{fontSize:10,padding:"2px 6px",borderRadius:4,cursor:"pointer",background:"transparent",border:"1px solid #e0e0de",color:"#888",fontFamily:"inherit"}}>← voltar</button>}
                      {IDEA_NEXT[col]&&<button onClick={()=>advance(idea.id)} style={{fontSize:10,padding:"2px 7px",borderRadius:4,cursor:"pointer",background:"#1a1a1a",border:"none",color:"#fff",fontFamily:"inherit",fontWeight:600}}>avançar →</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Schedule idea modal */}
      <Modal open={!!schedIdea} onClose={()=>setSchedIdea(null)} title="Agendar ideia no calendário" width={360}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <p style={{margin:0,fontSize:13,color:"#555"}}>Escolha a data para agendar: <strong>{ideas.find(i=>i.id===schedIdea)?.title}</strong></p>
          <FormRow label="Data"><Inp type="date" value={schedDate} onChange={e=>setSchedDate(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter")scheduleIdea();}}/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setSchedIdea(null)}>Cancelar</Btn><Btn onClick={scheduleIdea}>Agendar</Btn></div>
        </div>
      </Modal>

      {/* Edit idea modal */}
      <Modal open={!!editId} onClose={()=>setEditId(null)} title="Editar ideia" width={480}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FormRow label="Título"><Inp value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} autoFocus onKeyDown={e=>{if(e.key==="Enter")saveEdit();}}/></FormRow>
          <div style={{display:"flex",gap:8}}>
            <Sel value={editForm.channel} onChange={e=>setEditForm(f=>({...f,channel:e.target.value}))}>{Object.entries(CH).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel>
            <Sel value={editForm.priority} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></Sel>
            <Inp value={editForm.tags} onChange={e=>setEditForm(f=>({...f,tags:e.target.value}))} placeholder="Tags (IA, tutorial…)" style={{flex:1}}/>
          </div>
          <FormRow label="Descrição"><Txa value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={2}/></FormRow>
          <div style={{background:"#fafaf9",borderRadius:6,padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
            <span style={{fontSize:10,fontWeight:700,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase"}}>Validação rápida</span>
            {[["scoreThumbnail","Tem thumbnail clara possível?"],["scoreLoop","Tem loop aberto claro (curiosidade)?"],["scoreOriginal","É um ângulo original — ninguém fez exatamente isso?"]].map(([key,label])=>(
              <label key={key} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#555",cursor:"pointer"}}>
                <input type="checkbox" checked={editForm[key]} onChange={()=>setEditForm(f=>({...f,[key]:!f[key]}))} style={{width:14,height:14,cursor:"pointer"}}/>
                {label}
              </label>
            ))}
            <span style={{fontSize:12,color:"#888"}}>Score: {"★".repeat([editForm.scoreThumbnail,editForm.scoreLoop,editForm.scoreOriginal].filter(Boolean).length)}{"☆".repeat(3-[editForm.scoreThumbnail,editForm.scoreLoop,editForm.scoreOriginal].filter(Boolean).length)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>setEditId(null)}>Cancelar</Btn><Btn onClick={saveEdit}>Salvar</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
