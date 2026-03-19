'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, FormRow, Inp, Sel, Txa, Btn, ChipBadge, SLabel, Card, PBar, FPill, toast } from '../ui';
import { CH, CTYPES, MONTHS, WDAYS, EVT_ST, EVT_ST_KEYS, CHECKLISTS_BY_TYPE } from '@/lib/constants';
import { uid, today, fmtD, fmtFull } from '@/lib/utils';

const getChecklist=(type)=>CHECKLISTS_BY_TYPE[type]||[];
const defaultChecklist=(type)=>getChecklist(type).map(()=>false);

export default function W1Calendar({w1,setW1,w2content=[],setW2}){
  // Reconcile: sync event status with linked idea status (idea is source of truth)
  const reconciledRef=useRef(false);
  useEffect(()=>{
    if(reconciledRef.current)return;
    const {events,ideas}=w1;
    if(!events.length||!ideas.length)return;
    const fixes=[];
    events.forEach(e=>{
      if(!e.ideaId)return;
      const idea=ideas.find(i=>i.id===e.ideaId);
      if(!idea)return;
      if(e.status!==(idea.status||"ideia")) fixes.push({eventId:e.id,newStatus:idea.status||"ideia"});
    });
    if(fixes.length){
      reconciledRef.current=true;
      setW1(d=>({...d,events:d.events.map(e=>{const f=fixes.find(x=>x.eventId===e.id);return f?{...e,status:f.newStatus}:e;})}));
    } else {
      reconciledRef.current=true;
    }
  },[w1,setW1]);
  const now=new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [sel,setSel]=useState(null);
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [detailId,setDetailId]=useState(null);
  const [view,setView]=useState("calendar");
  const blankForm={title:"",channel:"youtube",type:"Vídeo",description:"",link:"",status:"ideia",altTitle:"",thumbnailConcept:"",openLoop:"",interviewee:"",date:"",isProduction:false,guestId:null,structure:"",questions:"",cta:"",strategicNotes:""};
  const [form,setForm]=useState(blankForm);
  const [descTab,setDescTab]=useState("desc");
  const {events}=w1;
  const setEvents=fn=>setW1(d=>({...d,events:typeof fn==="function"?fn(d.events):fn}));

  const fd=new Date(year,month,1).getDay(),dm=new Date(year,month+1,0).getDate();
  const cells=Array.from({length:fd+dm},(_,i)=>i<fd?null:i-fd+1);
  const ds=d=>`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const allEvsOn=d=>[
    ...events.filter(e=>e.date===ds(d)),
    ...w2content.filter(c=>c.scheduledDate===ds(d)&&c.status!=="published").map(c=>({...c,date:c.scheduledDate,_fromW2:true}))
  ];

  const prev=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);};
  const next=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);};

  const openAddModal=(day)=>{
    const d=day||sel;
    setEditId(null);
    setForm({...blankForm,date:d?ds(d):""});
    setDescTab("desc");
    setSel(d);
    setModal(true);
  };

  const openEditModal=(ev)=>{
    setEditId(ev.id);
    setForm({
      title:ev.title||"",channel:ev.channel||"youtube",type:ev.type||"Vídeo",
      description:ev.description||"",link:ev.link||"",status:ev.status||"ideia",
      altTitle:ev.altTitle||"",thumbnailConcept:ev.thumbnailConcept||"",
      openLoop:ev.openLoop||"",interviewee:ev.interviewee||"",date:ev.date||"",
      isProduction:ev.isProduction||false,guestId:ev.guestId||null,
      structure:ev.structure||"",questions:ev.questions||"",cta:ev.cta||"",strategicNotes:ev.strategicNotes||""
    });
    setDescTab("desc");
    setModal(true);
  };

  const saveEv=()=>{
    if(!form.title.trim())return;
    if(editId){
      const ev=events.find(e=>e.id===editId);
      if(ev?.ideaId&&form.status!==ev.status){
        setW1(d=>({...d,events:d.events.map(e=>e.id===editId?{...e,...form}:e),ideas:d.ideas.map(i=>i.id===ev.ideaId?{...i,status:form.status}:i)}));
      } else {
        setEvents(p=>p.map(e=>e.id===editId?{...e,...form}:e));
      }
    } else {
      if(!sel)return;
      setEvents(p=>[...p,{id:uid(),...form,date:form.date||ds(sel),checklist:defaultChecklist(form.type),views:null,ctr:null,avgRetention:null,newSubs:null,winningThumb:"",scoreThumbnail:null,scoreLoop:null,scoreOriginal:null,ideaId:null,createdAt:new Date().toISOString()}]);
    }
    toast(editId?"Evento atualizado":"Evento criado");
    setForm(blankForm);
    setEditId(null);
    setModal(false);
  };

  const delEv=(id,fromW2)=>{
    if(!window.confirm("Excluir?"))return;
    if(fromW2&&setW2){
      setW2(d=>({...d,content:d.content.filter(c=>c.id!==id)}));
    } else {
      const ev=events.find(e=>e.id===id);
      setW1(d=>({
        ...d,
        events:d.events.filter(e=>e.id!==id),
        notes:d.notes.map(n=>n.eventId===id?{...n,eventId:""}:n),
        ideas:ev?.ideaId?d.ideas.map(i=>i.id===ev.ideaId?{...i,scheduled:false,status:"ideia"}:i):d.ideas,
      }));
      if(detailId===id) setDetailId(null);
    }
    toast("Evento excluído");
  };

  const updateEvent=(id,patch)=>setEvents(p=>p.map(e=>e.id===id?{...e,...patch}:e));

  const toggleChecklist=(id,idx)=>{
    setW1(d=>{
      let syncIdeaId=null;
      const newEvents=d.events.map(e=>{
        if(e.id!==id)return e;
        const template=getChecklist(e.type);
        const cl=template.map((_,i)=>(e.checklist||[])[i]||false);
        cl[idx]=!cl[idx];
        const allDone=cl.every(Boolean)&&template.length>0;
        if(allDone&&e.status!=="publicado"&&e.ideaId) syncIdeaId=e.ideaId;
        return {...e,checklist:cl,...(allDone?{status:"publicado"}:{})};
      });
      return {...d,events:newEvents,ideas:syncIdeaId?d.ideas.map(i=>i.id===syncIdeaId?{...i,status:"publicado"}:i):d.ideas};
    });
  };

  const selEvs=sel?allEvsOn(sel):[];
  const mKey=`${year}-${String(month+1).padStart(2,"0")}`;
  const mEvs=[...events.filter(e=>e.date?.startsWith(mKey)),...w2content.filter(c=>c.scheduledDate?.startsWith(mKey)&&c.status!=="published")];
  const detailEv=detailId?events.find(e=>e.id===detailId):null;

  // List view state
  const [listChFilter,setListChFilter]=useState("todos");
  const [listStFilter,setListStFilter]=useState("todos");
  const [listProdFilter,setListProdFilter]=useState("todos");
  const [sortCol,setSortCol]=useState("date");
  const [sortDir,setSortDir]=useState("desc");
  const toggleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir("desc");}};
  const listEvs=events.filter(e=>{
    const ch=listChFilter==="todos"||e.channel===listChFilter;
    const st=listStFilter==="todos"||e.status===listStFilter;
    const prod=listProdFilter==="todos"||(listProdFilter==="content"&&!e.isProduction)||(listProdFilter==="production"&&e.isProduction);
    return ch&&st&&prod;
  }).sort((a,b)=>{
    let av,bv;
    if(sortCol==="date"){av=a.date||"";bv=b.date||"";}
    else if(sortCol==="views"){av=a.views??-1;bv=b.views??-1;}
    else if(sortCol==="ctr"){av=a.ctr??-1;bv=b.ctr??-1;}
    else if(sortCol==="retention"){av=a.avgRetention??-1;bv=b.avgRetention??-1;}
    else{av=0;bv=0;}
    if(av<bv)return sortDir==="asc"?-1:1;
    if(av>bv)return sortDir==="asc"?1:-1;
    return 0;
  });

  const checklistProgress=(ev)=>{
    const template=getChecklist(ev.type);
    if(!template.length)return{done:0,total:0};
    const cl=ev.checklist||[];
    return{done:template.map((_,i)=>cl[i]||false).filter(Boolean).length,total:template.length};
  };

  // ─── Detail page (full-width) ─────────────────────────────────
  if(detailEv){
    const cp=(()=>{const tpl=getChecklist(detailEv.type);if(!tpl.length)return null;const stored=detailEv.checklist||[];const norm=tpl.map((_,i)=>stored[i]||false);return{tpl,norm,done:norm.filter(Boolean).length};})();
    const originIdea=detailEv.ideaId?(w1.ideas||[]).find(i=>i.id===detailEv.ideaId):null;
    const guest=detailEv.guestId?(w1.guests||[]).find(g=>g.id===detailEv.guestId):null;
    const linkedNotes=(w1.notes||[]).filter(n=>n.eventId===detailEv.id);
    const FS={fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2};
    return(
      <div>
        <button onClick={()=>setDetailId(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:13,padding:0,fontFamily:"inherit",marginBottom:14,display:"flex",alignItems:"center",gap:4}}>← Voltar ao calendário</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <p style={{margin:0,fontSize:20,fontWeight:700,lineHeight:1.3}}>{detailEv.title}</p>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8,alignItems:"center"}}>
              <ChipBadge ch={detailEv.channel}/>
              <span style={{fontSize:11,color:"#bbb"}}>{detailEv.type}</span>
              <span style={{fontSize:10,fontWeight:700,color:EVT_ST[detailEv.status]?.color,background:EVT_ST[detailEv.status]?.bg,padding:"2px 8px",borderRadius:4}}>{EVT_ST[detailEv.status]?.label}</span>
              {detailEv.isProduction&&<span style={{fontSize:10,fontWeight:600,color:"#888",background:"#f4f4f3",padding:"2px 6px",borderRadius:4}}>produção</span>}
              <span style={{fontSize:11,color:"#bbb"}}>· {fmtFull(detailEv.date)}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <Btn variant="ghost" sm onClick={()=>openEditModal(detailEv)}>✎ Editar</Btn>
            <Btn variant="danger" sm onClick={()=>delEv(detailEv.id)}>× Excluir</Btn>
          </div>
        </div>
        {originIdea&&<p style={{margin:"0 0 12px",fontSize:11,color:"#1e8449",background:"#eafaf1",padding:"4px 8px",borderRadius:4,display:"inline-block"}}>✦ Originada da ideia: {originIdea.title}</p>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          {/* Left column */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {detailEv.description&&<div><p style={FS}>Descrição</p><p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{detailEv.description}</p></div>}
            {detailEv.structure&&<div><p style={FS}>Estrutura / Roteiro</p><p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{detailEv.structure}</p></div>}
            {detailEv.questions&&<div><p style={FS}>Perguntas</p><p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{detailEv.questions}</p></div>}
            {detailEv.cta&&<div><p style={FS}>CTA</p><p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.5}}>{detailEv.cta}</p></div>}
            {detailEv.strategicNotes&&<div><p style={FS}>Notas Estratégicas</p><p style={{margin:0,fontSize:13,color:"#555",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{detailEv.strategicNotes}</p></div>}
            {detailEv.link&&<div><p style={FS}>Link</p><a href={detailEv.link} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#1a5276",textDecoration:"none"}}>↗ {detailEv.link.replace("https://","")}</a></div>}
            {detailEv.altTitle&&<div><p style={FS}>Título Alternativo</p><p style={{margin:0,fontSize:13,color:"#555"}}>{detailEv.altTitle}</p></div>}
            {detailEv.thumbnailConcept&&<div><p style={FS}>Conceito de Thumbnail</p><p style={{margin:0,fontSize:13,color:"#555"}}>{detailEv.thumbnailConcept}</p></div>}
            {detailEv.openLoop&&<div><p style={FS}>Loop Aberto</p><p style={{margin:0,fontSize:13,color:"#555"}}>{detailEv.openLoop}</p></div>}
            {detailEv.interviewee&&<div><p style={FS}>Entrevistado</p><p style={{margin:0,fontSize:13,color:"#555"}}>{detailEv.interviewee}</p></div>}
            {guest&&<div><p style={FS}>Convidado</p><div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:13,color:"#555",fontWeight:600}}>{guest.name}</span>{guest.company&&<span style={{fontSize:12,color:"#888"}}>({guest.company})</span>}{guest.linkedin&&<a href={guest.linkedin} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#1a5276"}}>LinkedIn</a>}</div></div>}
            {linkedNotes.length>0&&<div><SLabel style={{marginBottom:4}}>Notas vinculadas</SLabel>{linkedNotes.map(n=>(<div key={n.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}><span style={{fontSize:11,color:"#1a5276"}}>☰</span><span style={{fontSize:12,color:"#555"}}>{n.title}</span></div>))}</div>}
          </div>

          {/* Right column */}
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {cp&&(
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><SLabel style={{margin:0}}>Checklist de Produção</SLabel><span style={{fontSize:11,color:"#888"}}>{cp.done}/{cp.tpl.length}</span></div>
                <PBar pct={(cp.done/cp.tpl.length)*100} color="#1a1a1a" thin/>
                <div style={{marginTop:8}}>{cp.tpl.map((item,idx)=>{const chk=cp.norm[idx];return(<div key={idx} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid #f8f7f5"}}><input type="checkbox" checked={chk} onChange={()=>toggleChecklist(detailEv.id,idx)} style={{width:14,height:14,cursor:"pointer",flexShrink:0}}/><span style={{fontSize:12,color:chk?"#bbb":"#555",textDecoration:chk?"line-through":"none"}}>{item}</span></div>);})}</div>
              </Card>
            )}
            {detailEv.status==="publicado"&&(
              <Card>
                <SLabel>Métricas pós-publicação</SLabel>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Views</label><input type="number" min="0" value={detailEv.views!=null?detailEv.views:""} onChange={e=>updateEvent(detailEv.id,{views:e.target.value===""?null:Math.max(0,Number(e.target.value))})} placeholder="0" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>CTR (%)</label><input type="number" min="0" max="100" step="0.1" value={detailEv.ctr!=null?detailEv.ctr:""} onChange={e=>updateEvent(detailEv.id,{ctr:e.target.value===""?null:Math.min(100,Math.max(0,Number(e.target.value)))})} placeholder="0.0" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Retenção (%)</label><input type="number" min="0" max="100" step="0.1" value={detailEv.avgRetention!=null?detailEv.avgRetention:""} onChange={e=>updateEvent(detailEv.id,{avgRetention:e.target.value===""?null:Math.min(100,Math.max(0,Number(e.target.value)))})} placeholder="0.0" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Novos inscritos</label><input type="number" min="0" value={detailEv.newSubs!=null?detailEv.newSubs:""} onChange={e=>updateEvent(detailEv.id,{newSubs:e.target.value===""?null:Math.max(0,Number(e.target.value))})} placeholder="0" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
                </div>
                <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Thumbnail vencedora</label><input value={detailEv.winningThumb||""} onChange={e=>updateEvent(detailEv.id,{winningThumb:e.target.value})} placeholder="Versão A, B ou C" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
              </Card>
            )}
          </div>
        </div>

        {/* Edit modal still available from detail page */}
        <Modal open={modal} onClose={()=>{setModal(false);setEditId(null);}} title="Editar evento" width={520}>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <FormRow label="Título"><Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Título do conteúdo" autoFocus onKeyDown={e=>{if(e.key==="Enter")saveEv();}}/></FormRow>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <FormRow label="Canal"><Sel value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))} style={{width:"100%"}}>{Object.entries(CH).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel></FormRow>
              <FormRow label="Tipo"><Sel value={form.type} onChange={e=>{const t=e.target.value;setForm(f=>({...f,type:t,isProduction:t==="Outro"}));}} style={{width:"100%"}}>{CTYPES.map(t=><option key={t} value={t}>{t}</option>)}</Sel></FormRow>
              <FormRow label="Status"><Sel value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}>{EVT_ST_KEYS.map(k=><option key={k} value={k}>{EVT_ST[k].label}</option>)}</Sel></FormRow>
            </div>
            <FormRow label="Data"><Inp type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>{form.date&&form.date<today()&&<span style={{fontSize:10,color:"#c0392b",marginTop:2}}>Esta data já passou</span>}</FormRow>
            <div><div style={{display:"flex",gap:4,marginBottom:6}}>{[["desc","Descrição"],["structure","Estrutura"],["questions","Perguntas"],["cta","CTA"],["strategic","Notas Estratégicas"]].map(([tab,label])=>(<button key={tab} onClick={()=>setDescTab(tab)} style={{fontSize:10,padding:"3px 8px",borderRadius:4,cursor:"pointer",fontFamily:"inherit",fontWeight:600,border:"1px solid #e0e0de",background:descTab===tab?"#1a1a1a":"transparent",color:descTab===tab?"#fff":"#888"}}>{label}</button>))}</div>{descTab==="desc"&&<Txa value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Resumo / overview do conteúdo"/>}{descTab==="structure"&&<Txa value={form.structure} onChange={e=>setForm(f=>({...f,structure:e.target.value}))} rows={3} placeholder="Roteiro, timestamps, seções do vídeo..."/>}{descTab==="questions"&&<Txa value={form.questions} onChange={e=>setForm(f=>({...f,questions:e.target.value}))} rows={3} placeholder="Perguntas da entrevista..."/>}{descTab==="cta"&&<Txa value={form.cta} onChange={e=>setForm(f=>({...f,cta:e.target.value}))} rows={2} placeholder="Call to action..."/>}{descTab==="strategic"&&<Txa value={form.strategicNotes} onChange={e=>setForm(f=>({...f,strategicNotes:e.target.value}))} rows={3} placeholder="Notas estratégicas, sequência, observações..."/>}</div>
            <FormRow label="Link"><Inp value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://"/></FormRow>
            <FormRow label="Título Alternativo"><Inp value={form.altTitle} onChange={e=>setForm(f=>({...f,altTitle:e.target.value}))} placeholder="Título alternativo (opcional)"/></FormRow>
            <FormRow label="Conceito de Thumbnail"><Inp value={form.thumbnailConcept} onChange={e=>setForm(f=>({...f,thumbnailConcept:e.target.value}))} placeholder="Descreva o conceito visual (opcional)"/></FormRow>
            <FormRow label="Loop Aberto"><Inp value={form.openLoop} onChange={e=>setForm(f=>({...f,openLoop:e.target.value}))} placeholder="Qual curiosidade este conteúdo desperta?"/></FormRow>
            <FormRow label="Entrevistado"><Inp value={form.interviewee} onChange={e=>setForm(f=>({...f,interviewee:e.target.value}))} placeholder="Nome do entrevistado (se houver)"/></FormRow>
            {(w1.guests||[]).length>0&&(<FormRow label="Convidado"><Sel value={form.guestId||""} onChange={e=>{const gId=e.target.value;const guest2=(w1.guests||[]).find(g=>g.id===gId);setForm(f=>({...f,guestId:gId||null,interviewee:guest2?`${guest2.name}${guest2.company?" · "+guest2.company:""}`:f.interviewee}));}} style={{width:"100%"}}><option value="">— Nenhum convidado —</option>{(w1.guests||[]).map(g=><option key={g.id} value={g.id}>{g.name}{g.company?" ("+g.company+")":""}</option>)}</Sel></FormRow>)}
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#555",cursor:"pointer"}}><input type="checkbox" checked={form.isProduction||false} onChange={()=>setForm(f=>({...f,isProduction:!f.isProduction}))} style={{width:14,height:14,cursor:"pointer"}}/>Evento de produção (marco interno, não publicação)</label>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>{setModal(false);setEditId(null);}}>Cancelar</Btn><Btn onClick={saveEv}>Salvar</Btn></div>
          </div>
        </Modal>
      </div>
    );
  }

  return(
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Calendário de Conteúdo</h2>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",gap:2,marginRight:8}}>
            <button onClick={()=>setView("calendar")} style={{fontSize:11,padding:"4px 10px",borderRadius:"4px 0 0 4px",cursor:"pointer",fontFamily:"inherit",fontWeight:600,border:"1px solid #e0e0de",background:view==="calendar"?"#1a1a1a":"transparent",color:view==="calendar"?"#fff":"#888"}}>Calendário</button>
            <button onClick={()=>setView("list")} style={{fontSize:11,padding:"4px 10px",borderRadius:"0 4px 4px 0",cursor:"pointer",fontFamily:"inherit",fontWeight:600,border:"1px solid #e0e0de",borderLeft:"none",background:view==="list"?"#1a1a1a":"transparent",color:view==="list"?"#fff":"#888"}}>Lista</button>
          </div>
          <Btn variant="ghost" onClick={prev}>‹</Btn>
          <span style={{fontSize:14,fontWeight:600,minWidth:130,textAlign:"center"}}>{MONTHS[month]} {year}</span>
          <Btn variant="ghost" onClick={next}>›</Btn>
        </div>
      </div>

      {/* Channel stats */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {Object.entries(CH).slice(0,3).map(([k,v])=>{
          const cnt=mEvs.filter(e=>e.channel===k).length;
          return <span key={k} style={{fontSize:11,fontWeight:700,background:v.bg,color:v.color,padding:"2px 8px",borderRadius:4}}>{v.short} {cnt}</span>;
        })}
        <span style={{fontSize:11,color:"#aaa"}}>Total: {mEvs.length}</span>
        {w2content.some(c=>c.scheduledDate?.startsWith(mKey)&&c.status!=="published")&&<span style={{fontSize:11,color:"#8e44ad",background:"#f8f3fc",padding:"2px 8px",borderRadius:4}}>inclui pipeline W2</span>}
      </div>

      {view==="list"?(
        /* ========== LIST VIEW ========== */
        <div>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
            <FPill label="Todos" active={listChFilter==="todos"} onClick={()=>setListChFilter("todos")}/>
            {Object.entries(CH).slice(0,3).map(([k,v])=><FPill key={k} label={v.short} active={listChFilter===k} color={v.color} onClick={()=>setListChFilter(k)}/>)}
            <span style={{color:"#e0e0de",alignSelf:"center"}}>|</span>
            <FPill label="Todos" active={listStFilter==="todos"} onClick={()=>setListStFilter("todos")}/>
            {EVT_ST_KEYS.map(k=><FPill key={k} label={EVT_ST[k].label} active={listStFilter===k} color={EVT_ST[k].color} onClick={()=>setListStFilter(k)}/>)}
            <span style={{color:"#e0e0de",alignSelf:"center"}}>|</span>
            <FPill label="Todos" active={listProdFilter==="todos"} onClick={()=>setListProdFilter("todos")}/>
            <FPill label="Conteúdo" active={listProdFilter==="content"} onClick={()=>setListProdFilter("content")}/>
            <FPill label="Produção" active={listProdFilter==="production"} color="#888" onClick={()=>setListProdFilter("production")}/>
          </div>
          <div style={{border:"1px solid #eceae5",borderRadius:10,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#fafaf9",borderBottom:"1px solid #eceae5"}}>
                  {[["date","Data"],["title","Título"],["channel","Canal"],["type","Tipo"],["status","Status"],["views","Views"],["ctr","CTR"],["retention","Retenção"],["score","Score"]].map(([col,label])=>{
                    const sortable=["date","views","ctr","retention"].includes(col);
                    return(
                      <th key={col} onClick={sortable?()=>toggleSort(col):undefined} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:"0.05em",textTransform:"uppercase",cursor:sortable?"pointer":"default",userSelect:"none"}}>
                        {label}{sortable&&sortCol===col?(sortDir==="asc"?" ▲":" ▼"):""}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {!listEvs.length?(
                  <tr><td colSpan={9} style={{padding:"2rem",textAlign:"center",color:"#bbb",fontSize:13}}>Nenhum evento encontrado.</td></tr>
                ):listEvs.map(ev=>{
                  const st=EVT_ST[ev.status];
                  const hasScore=ev.scoreThumbnail!=null||ev.scoreLoop!=null||ev.scoreOriginal!=null;
                  const sc=hasScore?[ev.scoreThumbnail,ev.scoreLoop,ev.scoreOriginal].filter(Boolean).length:null;
                  const isProd=ev.isProduction;
                  return(
                    <tr key={ev.id} style={{borderBottom:"1px solid #f5f4f1",cursor:"pointer",opacity:isProd?0.6:1}} onClick={()=>{const d=new Date(ev.date+"T12:00:00");setYear(d.getFullYear());setMonth(d.getMonth());setSel(d.getDate());setDetailId(ev.id);}}>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#888"}}>{fmtD(ev.date)}</td>
                      <td style={{padding:"10px 12px",fontWeight:600}}>{ev.title}{isProd&&<span style={{fontSize:10,color:"#888",background:"#f4f4f3",padding:"1px 5px",borderRadius:3,marginLeft:6,fontWeight:600}}>produção</span>}</td>
                      <td style={{padding:"10px 12px"}}><ChipBadge ch={ev.channel}/></td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#888"}}>{ev.type}</td>
                      <td style={{padding:"10px 12px"}}>{st&&<span style={{fontSize:10,fontWeight:700,color:st.color,background:st.bg,padding:"2px 6px",borderRadius:3}}>{st.label}</span>}</td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#555"}}>{ev.views!=null?ev.views.toLocaleString("pt-BR"):"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#555"}}>{ev.ctr!=null?`${ev.ctr}%`:"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,color:"#555"}}>{ev.avgRetention!=null?`${ev.avgRetention}%`:"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12}}>{sc!=null?("★".repeat(sc)+"☆".repeat(3-sc)):"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{marginTop:8,fontSize:12,color:"#ccc"}}>{listEvs.length} evento{listEvs.length!==1?"s":""}</p>
        </div>
      ):(
        /* ========== CALENDAR VIEW ========== */
        <>
          <div style={{border:"1px solid #eceae5",borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
              {WDAYS.map(d=><div key={d} style={{fontSize:11,textAlign:"center",color:"#999",padding:"8px 0",fontWeight:600,background:"#fafaf9",borderBottom:"1px solid #eceae5"}}>{d}</div>)}
              {cells.map((day,i)=>{
                if(!day) return <div key={i} style={{background:"#fafaf9",borderBottom:"1px solid #f5f4f1",borderRight:i%7!==6?"1px solid #f5f4f1":"none",minHeight:100}}/>;
                const evs=allEvsOn(day),isToday=ds(day)===today(),isSel=sel===day;
                return(
                  <div key={i} onClick={()=>{setSel(isSel?null:day);setDetailId(null);}} style={{minHeight:100,minWidth:0,overflow:"hidden",padding:"5px 6px",cursor:"pointer",borderBottom:"1px solid #f5f4f1",borderRight:i%7!==6?"1px solid #f5f4f1":"none",background:isSel?"#f0efec":"#fff",transition:"background .1s"}}>
                    <p style={{margin:"0 0 4px",fontSize:12,fontWeight:isToday?700:400,textAlign:"left"}}>
                      {isToday
                        ?<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:"#1a1a1a",color:"#fff",fontSize:11,fontWeight:700}}>{day}</span>
                        :<span style={{color:isSel?"#1a1a1a":"#666"}}>{day}</span>
                      }
                    </p>
                    {evs.slice(0,3).map((e,ei)=>{
                      const isProd=e.isProduction;
                      return(
                        <div key={e.id||ei} style={{fontSize:isProd?10:11,lineHeight:"16px",background:isProd?"#f4f4f3":(CH[e.channel]?.bg||"#f4f4f3"),color:isProd?"#aaa":(CH[e.channel]?.color||"#555"),borderRadius:4,padding:"2px 6px",marginBottom:3,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",borderLeft:`3px solid ${isProd?"#ddd":(CH[e.channel]?.color||"#ccc")}`,opacity:e._fromW2?0.8:(isProd?0.6:1)}}>
                          {e.title}
                        </div>
                      );
                    })}
                    {evs.length>3&&<p style={{margin:0,fontSize:10,color:"#888",textAlign:"center"}}>+{evs.length-3}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          <div style={{marginTop:16}}>
            {sel?(
              <div style={{background:"#fafaf9",borderRadius:10,border:"1px solid #eceae5",padding:"16px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div>
                    <p style={{margin:0,fontSize:15,fontWeight:700,color:"#1a1a1a"}}>{fmtFull(ds(sel))}</p>
                    <p style={{margin:"2px 0 0",fontSize:12,color:"#aaa"}}>{selEvs.length} evento{selEvs.length!==1?"s":""}</p>
                  </div>
                  <Btn sm onClick={()=>openAddModal()}>+ Evento</Btn>
                </div>
                {!selEvs.length?(
                  <div style={{padding:"16px 0",textAlign:"center"}}><p style={{margin:0,fontSize:13,color:"#ccc"}}>Nenhum evento nesse dia.</p></div>
                ):(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
                    {selEvs.map(e=>{
                      const st=EVT_ST[e.status];
                      const cp=checklistProgress(e);
                      const isProd=e.isProduction;
                      return(
                        <div key={e.id} onClick={()=>{if(!e._fromW2)setDetailId(e.id);}} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:8,padding:"12px 14px",borderLeft:`3px solid ${isProd?"#ddd":(CH[e.channel]?.color||"#ccc")}`,cursor:e._fromW2?"default":"pointer",transition:"border-color .12s",opacity:isProd?0.7:1}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                              <ChipBadge ch={e.channel}/>
                              <span style={{fontSize:11,color:"#bbb"}}>{e.type}</span>
                              {st&&<span style={{fontSize:10,fontWeight:700,color:st.color,background:st.bg,padding:"1px 6px",borderRadius:3}}>{st.label}</span>}
                              {isProd&&<span style={{fontSize:10,fontWeight:600,color:"#888",background:"#f4f4f3",padding:"1px 5px",borderRadius:3}}>produção</span>}
                              {!e._fromW2&&!isProd&&cp.total>0&&<span style={{fontSize:10,color:"#bbb"}}>{cp.done}/{cp.total}</span>}
                              {e._fromW2&&<span style={{fontSize:10,color:"#8e44ad",background:"#f8f3fc",padding:"1px 5px",borderRadius:3,fontWeight:600}}>pipeline</span>}
                            </div>
                            <div style={{display:"flex",gap:4,flexShrink:0}}>
                              {!e._fromW2&&<button onClick={ev=>{ev.stopPropagation();openEditModal(e);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:13,padding:"0 2px",lineHeight:1}} title="Editar">✎</button>}
                              <button onClick={ev=>{ev.stopPropagation();delEv(e.id,e._fromW2);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:16,padding:"0 2px",lineHeight:1}} title="Excluir">×</button>
                            </div>
                          </div>
                          <p style={{margin:"0 0 4px",fontSize:13,fontWeight:600,lineHeight:1.3}}>{e.title}</p>
                          {e.description&&<p style={{margin:0,fontSize:12,color:"#888",lineHeight:1.4}}>{e.description.slice(0,100)}{e.description.length>100?"…":""}</p>}
                          {e.link&&<a href={e.link} target="_blank" rel="noreferrer" onClick={ev=>ev.stopPropagation()} style={{fontSize:11,color:"#1a5276",textDecoration:"none",marginTop:4,display:"inline-block"}}>↗ {e.link.replace("https://","").slice(0,30)}</a>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ):(
              <div style={{background:"#fafaf9",borderRadius:10,border:"1px solid #eceae5",padding:"20px",textAlign:"center"}}>
                <p style={{margin:0,fontSize:13,color:"#bbb"}}>Clique em um dia para ver e gerenciar os eventos</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Legend */}
      <div style={{display:"flex",gap:16,marginTop:14,alignItems:"center"}}>
        {Object.entries(CH).map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:8,height:8,borderRadius:2,background:v.color}}/>
            <span style={{fontSize:11,color:"#888"}}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Add/Edit Event Modal */}
      <Modal open={modal} onClose={()=>{setModal(false);setEditId(null);}} title={editId?"Editar evento":`Evento — ${sel?fmtD(ds(sel)):""}`} width={520}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FormRow label="Título"><Inp value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Título do conteúdo" autoFocus onKeyDown={e=>{if(e.key==="Enter")saveEv();}}/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <FormRow label="Canal"><Sel value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))} style={{width:"100%"}}>{Object.entries(CH).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</Sel></FormRow>
            <FormRow label="Tipo"><Sel value={form.type} onChange={e=>{const t=e.target.value;setForm(f=>({...f,type:t,isProduction:t==="Outro"}));}} style={{width:"100%"}}>{CTYPES.map(t=><option key={t} value={t}>{t}</option>)}</Sel></FormRow>
            <FormRow label="Status"><Sel value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}>{EVT_ST_KEYS.map(k=><option key={k} value={k}>{EVT_ST[k].label}</option>)}</Sel></FormRow>
          </div>
          <FormRow label="Data"><Inp type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>{form.date&&form.date<today()&&<span style={{fontSize:10,color:"#c0392b",marginTop:2}}>Esta data já passou</span>}</FormRow>

          {/* Structured description tabs */}
          <div>
            <div style={{display:"flex",gap:4,marginBottom:6}}>
              {[["desc","Descrição"],["structure","Estrutura"],["questions","Perguntas"],["cta","CTA"],["strategic","Notas Estratégicas"]].map(([tab,label])=>(
                <button key={tab} onClick={()=>setDescTab(tab)} style={{fontSize:10,padding:"3px 8px",borderRadius:4,cursor:"pointer",fontFamily:"inherit",fontWeight:600,border:"1px solid #e0e0de",background:descTab===tab?"#1a1a1a":"transparent",color:descTab===tab?"#fff":"#888"}}>{label}</button>
              ))}
            </div>
            {descTab==="desc"&&<Txa value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="Resumo / overview do conteúdo"/>}
            {descTab==="structure"&&<Txa value={form.structure} onChange={e=>setForm(f=>({...f,structure:e.target.value}))} rows={3} placeholder="Roteiro, timestamps, seções do vídeo..."/>}
            {descTab==="questions"&&<Txa value={form.questions} onChange={e=>setForm(f=>({...f,questions:e.target.value}))} rows={3} placeholder="Perguntas da entrevista..."/>}
            {descTab==="cta"&&<Txa value={form.cta} onChange={e=>setForm(f=>({...f,cta:e.target.value}))} rows={2} placeholder="Call to action..."/>}
            {descTab==="strategic"&&<Txa value={form.strategicNotes} onChange={e=>setForm(f=>({...f,strategicNotes:e.target.value}))} rows={3} placeholder="Notas estratégicas, sequência, observações..."/>}
          </div>

          <FormRow label="Link"><Inp value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://"/></FormRow>
          <FormRow label="Título Alternativo"><Inp value={form.altTitle} onChange={e=>setForm(f=>({...f,altTitle:e.target.value}))} placeholder="Título alternativo (opcional)"/></FormRow>
          <FormRow label="Conceito de Thumbnail"><Inp value={form.thumbnailConcept} onChange={e=>setForm(f=>({...f,thumbnailConcept:e.target.value}))} placeholder="Descreva o conceito visual (opcional)"/></FormRow>
          <FormRow label="Loop Aberto"><Inp value={form.openLoop} onChange={e=>setForm(f=>({...f,openLoop:e.target.value}))} placeholder="Qual curiosidade este conteúdo desperta?"/></FormRow>
          <FormRow label="Entrevistado"><Inp value={form.interviewee} onChange={e=>setForm(f=>({...f,interviewee:e.target.value}))} placeholder="Nome do entrevistado (se houver)"/></FormRow>

          {/* Guest selector */}
          {(w1.guests||[]).length>0&&(
            <FormRow label="Convidado">
              <Sel value={form.guestId||""} onChange={e=>{const gId=e.target.value;const guest=(w1.guests||[]).find(g=>g.id===gId);setForm(f=>({...f,guestId:gId||null,interviewee:guest?`${guest.name}${guest.company?" · "+guest.company:""}`:f.interviewee}));}} style={{width:"100%"}}>
                <option value="">— Nenhum convidado —</option>
                {(w1.guests||[]).map(g=><option key={g.id} value={g.id}>{g.name}{g.company?" ("+g.company+")":""}</option>)}
              </Sel>
            </FormRow>
          )}

          {/* Production checkbox */}
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#555",cursor:"pointer"}}>
            <input type="checkbox" checked={form.isProduction||false} onChange={()=>setForm(f=>({...f,isProduction:!f.isProduction}))} style={{width:14,height:14,cursor:"pointer"}}/>
            Evento de produção (marco interno, não publicação)
          </label>

          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>{setModal(false);setEditId(null);}}>Cancelar</Btn><Btn onClick={saveEv}>{editId?"Salvar":"Adicionar"}</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
