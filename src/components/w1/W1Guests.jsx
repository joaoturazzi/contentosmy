'use client';

import { useState } from 'react';
import { Inp, Sel, Txa, Btn, Modal, FormRow, SLabel, ChipBadge, toast } from '../ui';
import { GUEST_ST, GUEST_ST_KEYS, GUEST_NEXT, GUEST_PIPE_KEYS, EVT_ST, CH } from '@/lib/constants';
import { uid, fmtD } from '@/lib/utils';

export default function W1Guests({w1,setW1}){
  const guests=w1.guests||[];
  const {events}=w1;
  const setGuests=fn=>setW1(d=>({...d,guests:typeof fn==="function"?fn(d.guests||[]):fn}));
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [search,setSearch]=useState("");
  const [detailId,setDetailId]=useState(null);

  const blankForm={name:"",company:"",role:"",linkedin:"",email:"",phone:"",status:"potencial",notes:""};
  const [form,setForm]=useState(blankForm);

  const save=()=>{
    if(!form.name.trim())return;
    if(editId){
      setGuests(p=>p.map(g=>g.id===editId?{...g,...form}:g));
    } else {
      setGuests(p=>[{id:uid(),...form,createdAt:new Date().toISOString()},...p]);
    }
    toast(editId?"Convidado atualizado":"Convidado adicionado");
    setForm(blankForm);setEditId(null);setModal(false);
  };

  const del=id=>{if(!window.confirm("Excluir convidado?"))return;setW1(d=>({...d,guests:(d.guests||[]).filter(g=>g.id!==id),events:d.events.map(e=>e.guestId===id?{...e,guestId:null}:e)}));if(detailId===id)setDetailId(null);toast("Convidado excluído");};
  const openAdd=()=>{setEditId(null);setForm(blankForm);setModal(true);};
  const openEdit=guest=>{setEditId(guest.id);setForm({name:guest.name||"",company:guest.company||"",role:guest.role||"",linkedin:guest.linkedin||"",email:guest.email||"",phone:guest.phone||"",status:guest.status||"potencial",notes:guest.notes||""});setModal(true);};
  const upd=(id,field,val)=>setGuests(p=>p.map(g=>g.id===id?{...g,[field]:val}:g));

  const advance=id=>setW1(d=>{
    const g=(d.guests||[]).find(x=>x.id===id);if(!g)return d;
    const n=GUEST_NEXT[g.status||"potencial"];if(!n)return d;
    return {...d,guests:d.guests.map(x=>x.id===id?{...x,status:n}:x)};
  });
  const back=id=>setW1(d=>{
    const g=(d.guests||[]).find(x=>x.id===id);if(!g)return d;
    const prev=Object.entries(GUEST_NEXT).find(([,v])=>v===(g.status||"potencial"))?.[0];if(!prev)return d;
    return {...d,guests:d.guests.map(x=>x.id===id?{...x,status:prev}:x)};
  });
  const recusar=id=>setGuests(p=>p.map(g=>g.id===id?{...g,status:"recusou"}:g));
  const reabrir=id=>setGuests(p=>p.map(g=>g.id===id?{...g,status:"potencial"}:g));

  const guestEvCount=id=>(events||[]).filter(e=>e.guestId===id).length;
  const filtered=guests.filter(g=>!search||g.name.toLowerCase().includes(search.toLowerCase())||(g.company||"").toLowerCase().includes(search.toLowerCase())||(g.role||"").toLowerCase().includes(search.toLowerCase()));
  const dg=detailId?guests.find(g=>g.id===detailId):null;
  const dgEvents=dg?(events||[]).filter(e=>e.guestId===dg.id).sort((a,b)=>(a.date||"").localeCompare(b.date||"")):[];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 56px)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexShrink:0}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Convidados</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>{guests.length} convidado{guests.length!==1?"s":""} · {guests.filter(g=>g.status==="confirmado"||g.status==="gravado").length} em andamento</p>
        </div>
        <Btn onClick={openAdd}>+ Convidado</Btn>
      </div>

      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexShrink:0}}>
        <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar convidado…" style={{fontSize:12,padding:"5px 10px",maxWidth:240}}/>
        {search&&<button onClick={()=>setSearch("")} style={{fontSize:10,color:"#c0392b",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>limpar</button>}
        <span style={{fontSize:12,color:"#bbb",marginLeft:4}}>{filtered.length} resultado{filtered.length!==1?"s":""}</span>
      </div>

      {/* Kanban board */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr) minmax(0,0.7fr)",gap:8,flex:1,minHeight:0,overflow:"hidden"}}>
        {GUEST_PIPE_KEYS.map(col=>{
          const st=GUEST_ST[col];
          const cards=filtered.filter(g=>(g.status||"potencial")===col);
          return(
            <div key={col} style={{background:"#f7f6f3",borderRadius:8,padding:"10px",overflowY:"auto",minHeight:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:st.color}}>{st.label}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{cards.length}</span>
              </div>
              {!cards.length&&<p style={{fontSize:11,color:"#ccc",textAlign:"center",padding:"0.5rem 0"}}>—</p>}
              {cards.map(g=>{
                const evCnt=guestEvCount(g.id);
                return(
                  <div key={g.id} onClick={()=>setDetailId(g.id)} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:6,padding:"10px",marginBottom:6,cursor:"pointer",transition:"border-color .12s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                      <p style={{margin:0,fontSize:12,fontWeight:600,lineHeight:1.3,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</p>
                      <button onClick={e=>{e.stopPropagation();del(g.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:13,padding:"0 2px",flexShrink:0}}>×</button>
                    </div>
                    {g.company&&<p style={{margin:"0 0 4px",fontSize:11,color:"#888"}}>{g.company}</p>}
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                      {g.role&&<span style={{fontSize:9,fontWeight:600,background:"#f4f4f3",color:"#888",padding:"1px 5px",borderRadius:3}}>{g.role}</span>}
                      {evCnt>0&&<span style={{fontSize:9,fontWeight:600,background:"#eaf2fb",color:"#1a5276",padding:"1px 5px",borderRadius:3}}>{evCnt} aparição{evCnt!==1?"es":""}</span>}
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      {col!=="potencial"&&<button onClick={e=>{e.stopPropagation();back(g.id);}} style={{fontSize:10,padding:"2px 6px",borderRadius:4,cursor:"pointer",background:"transparent",border:"1px solid #e0e0de",color:"#888",fontFamily:"inherit"}}>← voltar</button>}
                      {GUEST_NEXT[col]&&<button onClick={e=>{e.stopPropagation();advance(g.id);}} style={{fontSize:10,padding:"2px 7px",borderRadius:4,cursor:"pointer",background:"#1a1a1a",border:"none",color:"#fff",fontFamily:"inherit",fontWeight:600}}>avançar →</button>}
                      {col!=="publicado"&&<button onClick={e=>{e.stopPropagation();recusar(g.id);}} style={{fontSize:10,padding:"2px 6px",borderRadius:4,cursor:"pointer",background:"transparent",border:"1px solid #f5c6c6",color:"#c0392b",fontFamily:"inherit",marginLeft:"auto"}}>Recusar</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Recusou column */}
        {(()=>{
          const st=GUEST_ST.recusou;
          const cards=filtered.filter(g=>g.status==="recusou");
          return(
            <div style={{background:"#f7f6f3",borderRadius:8,padding:"10px",overflowY:"auto",minHeight:0,borderLeft:"2px dashed #f0e0e0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:st.color}}>{st.label}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{cards.length}</span>
              </div>
              {!cards.length&&<p style={{fontSize:11,color:"#ccc",textAlign:"center",padding:"0.5rem 0"}}>—</p>}
              {cards.map(g=>(
                <div key={g.id} onClick={()=>setDetailId(g.id)} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:6,padding:"10px",marginBottom:6,cursor:"pointer",opacity:0.7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <p style={{margin:0,fontSize:12,fontWeight:600,lineHeight:1.3,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</p>
                    <button onClick={e=>{e.stopPropagation();del(g.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:13,padding:"0 2px",flexShrink:0}}>×</button>
                  </div>
                  {g.company&&<p style={{margin:"0 0 4px",fontSize:11,color:"#888"}}>{g.company}</p>}
                  <button onClick={e=>{e.stopPropagation();reabrir(g.id);}} style={{fontSize:10,padding:"2px 7px",borderRadius:4,cursor:"pointer",background:"#1a1a1a",border:"none",color:"#fff",fontFamily:"inherit",fontWeight:600}}>Reabrir</button>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Detail modal */}
      <Modal open={!!dg} onClose={()=>setDetailId(null)} title="Convidado" width={520}>
        {dg&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Action buttons */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {dg.status!=="recusou"&&GUEST_NEXT[dg.status||"potencial"]&&<Btn sm onClick={()=>advance(dg.id)}>Avançar → {GUEST_ST[GUEST_NEXT[dg.status||"potencial"]]?.label}</Btn>}
              {dg.status!=="recusou"&&dg.status!=="potencial"&&<Btn sm variant="ghost" onClick={()=>back(dg.id)}>← Voltar</Btn>}
              {dg.status!=="recusou"&&<Btn sm variant="ghost" onClick={()=>recusar(dg.id)} style={{color:"#c0392b",borderColor:"#f5c6c6"}}>Recusar</Btn>}
              {dg.status==="recusou"&&<Btn sm onClick={()=>reabrir(dg.id)}>Reabrir</Btn>}
            </div>

            {/* Name */}
            <input value={dg.name} onChange={e=>upd(dg.id,"name",e.target.value)} style={{fontSize:20,fontWeight:700,border:"none",outline:"none",color:"#1a1a1a",fontFamily:"inherit",letterSpacing:"-0.3px",width:"100%",background:"transparent",padding:0}}/>

            {/* Status */}
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:"0.05em"}}>Status</span>
              <Sel value={dg.status||"potencial"} onChange={e=>upd(dg.id,"status",e.target.value)} style={{fontSize:11,padding:"3px 8px",width:"auto"}}>
                {GUEST_ST_KEYS.map(k=><option key={k} value={k}>{GUEST_ST[k].label}</option>)}
              </Sel>
            </div>

            {/* Contact grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Empresa</label>
                <input value={dg.company||""} onChange={e=>upd(dg.id,"company",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Cargo</label>
                <input value={dg.role||""} onChange={e=>upd(dg.id,"role",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Email</label>
                <input value={dg.email||""} onChange={e=>upd(dg.id,"email",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Telefone</label>
                <input value={dg.phone||""} onChange={e=>upd(dg.id,"phone",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* LinkedIn */}
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>LinkedIn</label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input value={dg.linkedin||""} onChange={e=>upd(dg.id,"linkedin",e.target.value)} placeholder="URL do LinkedIn" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",flex:1,boxSizing:"border-box"}}/>
                {dg.linkedin&&<a href={dg.linkedin.startsWith("http")?dg.linkedin:"https://"+dg.linkedin} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#1a5276",textDecoration:"none",flexShrink:0}}>↗ Abrir</a>}
              </div>
            </div>

            {/* Notes */}
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Notas</label>
              <textarea value={dg.notes||""} onChange={e=>upd(dg.id,"notes",e.target.value)} placeholder="Notas sobre o convidado…" style={{fontSize:12,lineHeight:1.6,padding:"6px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",resize:"none",minHeight:60,background:"transparent"}}/>
            </div>

            {/* Linked events */}
            {dgEvents.length>0&&(
              <div style={{borderTop:"1px solid #f5f4f1",paddingTop:12}}>
                <SLabel>Aparições ({dgEvents.length})</SLabel>
                {dgEvents.map(ev=>{
                  const est=EVT_ST[ev.status];
                  return(
                    <div key={ev.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #f8f7f5"}}>
                      <span style={{fontSize:11,color:"#888",minWidth:70}}>{fmtD(ev.date)}</span>
                      <ChipBadge ch={ev.channel}/>
                      <span style={{fontSize:12,color:"#555",flex:1}}>{ev.title}</span>
                      {est&&<span style={{fontSize:10,fontWeight:700,color:est.color,background:est.bg,padding:"1px 5px",borderRadius:3}}>{est.label}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{margin:0,fontSize:11,color:"#ccc"}}>Criado {dg.createdAt?new Date(dg.createdAt).toLocaleDateString("pt-BR"):""}</p>
          </div>
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal open={modal} onClose={()=>{setModal(false);setEditId(null);}} title={editId?"Editar convidado":"Novo convidado"} width={440}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FormRow label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome completo" autoFocus onKeyDown={e=>{if(e.key==="Enter")save();}}/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FormRow label="Empresa"><Inp value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} placeholder="Empresa"/></FormRow>
            <FormRow label="Cargo"><Inp value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Cargo / função"/></FormRow>
          </div>
          <FormRow label="LinkedIn"><Inp value={form.linkedin} onChange={e=>setForm(f=>({...f,linkedin:e.target.value}))} placeholder="URL do LinkedIn"/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FormRow label="Email"><Inp value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com"/></FormRow>
            <FormRow label="Telefone"><Inp value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(XX) XXXXX-XXXX"/></FormRow>
          </div>
          <FormRow label="Status"><Sel value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}>{GUEST_ST_KEYS.map(k=><option key={k} value={k}>{GUEST_ST[k].label}</option>)}</Sel></FormRow>
          <FormRow label="Notas"><Txa value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Observações, contexto..."/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>{setModal(false);setEditId(null);}}>Cancelar</Btn><Btn onClick={save}>{editId?"Salvar":"Adicionar"}</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
