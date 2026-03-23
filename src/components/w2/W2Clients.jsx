'use client';

import { useState } from 'react';
import { Inp, Sel, Txa, Btn, Modal, FormRow, SLabel, AreaBadge, FPill, toast } from '../ui';
import { AREAS, AREA_C, CLIENT_ST, CLIENT_PIPE_KEYS, CLIENT_ST_KEYS, CLIENT_NEXT } from '@/lib/constants';
import { uid, fmtD } from '@/lib/utils';

export default function W2Clients({w2,setW2}){
  const clients=w2.clients||[];
  const {projects}=w2;
  const setClients=fn=>setW2(d=>({...d,clients:typeof fn==="function"?fn(d.clients||[]):fn}));
  const [modal,setModal]=useState(false);
  const [editId,setEditId]=useState(null);
  const [search,setSearch]=useState("");
  const [detailId,setDetailId]=useState(null);

  const blankForm={name:"",company:"",contact:"",email:"",phone:"",area:"Patagon AI",dealValue:0,status:"lead",notes:""};
  const [form,setForm]=useState(blankForm);

  const save=()=>{
    if(!form.name.trim())return;
    if(editId){
      setClients(p=>p.map(c=>c.id===editId?{...c,...form}:c));
    } else {
      setClients(p=>[{id:uid(),...form,createdAt:new Date().toISOString()},...p]);
    }
    toast(editId?"Cliente atualizado":"Cliente adicionado");
    setForm(blankForm);setEditId(null);setModal(false);
  };

  const del=id=>{if(!window.confirm("Excluir cliente?"))return;setW2(d=>({...d,clients:(d.clients||[]).filter(c=>c.id!==id),projects:d.projects.map(p=>p.clientId===id?{...p,clientId:null}:p)}));if(detailId===id)setDetailId(null);toast("Cliente excluído");};
  const openAdd=()=>{setEditId(null);setForm(blankForm);setModal(true);};
  const openEdit=client=>{setEditId(client.id);setForm({name:client.name||"",company:client.company||"",contact:client.contact||"",email:client.email||"",phone:client.phone||"",area:client.area||"Patagon AI",dealValue:client.dealValue||0,status:client.status||"lead",notes:client.notes||""});setModal(true);};
  const upd=(id,field,val)=>setClients(p=>p.map(c=>c.id===id?{...c,[field]:val}:c));

  const advance=id=>setW2(d=>{
    const c=(d.clients||[]).find(x=>x.id===id);if(!c)return d;
    const n=CLIENT_NEXT[c.status||"lead"];if(!n)return d;
    return {...d,clients:d.clients.map(x=>x.id===id?{...x,status:n}:x)};
  });
  const back=id=>setW2(d=>{
    const c=(d.clients||[]).find(x=>x.id===id);if(!c)return d;
    const prev=Object.entries(CLIENT_NEXT).find(([,v])=>v===(c.status||"lead"))?.[0];if(!prev)return d;
    return {...d,clients:d.clients.map(x=>x.id===id?{...x,status:prev}:x)};
  });

  const filtered=clients.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||(c.company||"").toLowerCase().includes(search.toLowerCase()));
  const dg=detailId?clients.find(c=>c.id===detailId):null;
  const dgProjects=dg?(projects||[]).filter(p=>p.clientId===dg.id):[];

  const fmtVal=v=>{if(!v)return"";return"R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:0});};

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 56px)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexShrink:0}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,letterSpacing:"-0.3px"}}>Clientes</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#888"}}>{clients.length} cliente{clients.length!==1?"s":""} · {fmtVal(clients.filter(c=>c.status==="proposta"||c.status==="negociacao").reduce((s,c)=>s+(c.dealValue||0),0))} em pipeline</p>
        </div>
        <Btn onClick={openAdd}>+ Cliente</Btn>
      </div>

      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14,flexShrink:0}}>
        <Inp value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente…" style={{fontSize:12,padding:"5px 10px",maxWidth:240}}/>
        {search&&<button onClick={()=>setSearch("")} style={{fontSize:10,color:"#c0392b",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>limpar</button>}
      </div>

      {/* Kanban */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr) minmax(0,0.7fr)",gap:8,flex:1,minHeight:0,overflow:"hidden"}}>
        {CLIENT_PIPE_KEYS.map(col=>{
          const st=CLIENT_ST[col];
          const cards=filtered.filter(c=>(c.status||"lead")===col);
          const colVal=cards.reduce((s,c)=>s+(c.dealValue||0),0);
          return(
            <div key={col} style={{background:"#f7f6f3",borderRadius:8,padding:"10px",overflowY:"auto",minHeight:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:st.color}}>{st.label}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{cards.length}</span>
              </div>
              {colVal>0&&<p style={{margin:"0 0 6px",fontSize:10,color:"#aaa"}}>{fmtVal(colVal)}</p>}
              {!cards.length&&<p style={{fontSize:11,color:"#ccc",textAlign:"center",padding:"0.5rem 0"}}>—</p>}
              {cards.map(c=>(
                <div key={c.id} onClick={()=>setDetailId(c.id)} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:6,padding:"10px",marginBottom:6,cursor:"pointer",transition:"border-color .12s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <AreaBadge area={c.area}/>
                    <button onClick={e=>{e.stopPropagation();del(c.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ddd",fontSize:13,padding:"0 2px",flexShrink:0}}>×</button>
                  </div>
                  <p style={{margin:"0 0 2px",fontSize:12,fontWeight:600,lineHeight:1.3}}>{c.name}</p>
                  {c.company&&<p style={{margin:"0 0 4px",fontSize:11,color:"#888"}}>{c.company}</p>}
                  {c.dealValue>0&&<p style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#1e8449"}}>{fmtVal(c.dealValue)}</p>}
                  <div style={{display:"flex",gap:4}}>
                    {col!=="lead"&&<button onClick={e=>{e.stopPropagation();back(c.id);}} style={{fontSize:10,padding:"2px 6px",borderRadius:4,cursor:"pointer",background:"transparent",border:"1px solid #e0e0de",color:"#888",fontFamily:"inherit"}}>← voltar</button>}
                    {CLIENT_NEXT[col]&&<button onClick={e=>{e.stopPropagation();advance(c.id);}} style={{fontSize:10,padding:"2px 7px",borderRadius:4,cursor:"pointer",background:"#1a1a1a",border:"none",color:"#fff",fontFamily:"inherit",fontWeight:600}}>avançar →</button>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Perdido column */}
        {(()=>{
          const st=CLIENT_ST.perdido;
          const cards=filtered.filter(c=>c.status==="perdido");
          return(
            <div style={{background:"#f7f6f3",borderRadius:8,padding:"10px",overflowY:"auto",minHeight:0,borderLeft:"2px dashed #f0e0e0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:st.color}}>{st.label}</span>
                <span style={{fontSize:11,color:"#bbb"}}>{cards.length}</span>
              </div>
              {!cards.length&&<p style={{fontSize:11,color:"#ccc",textAlign:"center",padding:"0.5rem 0"}}>—</p>}
              {cards.map(c=>(
                <div key={c.id} onClick={()=>setDetailId(c.id)} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:6,padding:"10px",marginBottom:6,cursor:"pointer",opacity:0.7}}>
                  <p style={{margin:"0 0 2px",fontSize:12,fontWeight:600}}>{c.name}</p>
                  {c.company&&<p style={{margin:"0 0 4px",fontSize:11,color:"#888"}}>{c.company}</p>}
                  <button onClick={e=>{e.stopPropagation();upd(c.id,"status","lead");}} style={{fontSize:10,padding:"2px 7px",borderRadius:4,cursor:"pointer",background:"#1a1a1a",border:"none",color:"#fff",fontFamily:"inherit",fontWeight:600}}>Reabrir</button>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Detail modal */}
      <Modal open={!!dg} onClose={()=>setDetailId(null)} title="Cliente" width={520}>
        {dg&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {dg.status!=="perdido"&&CLIENT_NEXT[dg.status||"lead"]&&<Btn sm onClick={()=>advance(dg.id)}>Avançar → {CLIENT_ST[CLIENT_NEXT[dg.status||"lead"]]?.label}</Btn>}
              {dg.status!=="perdido"&&dg.status!=="lead"&&<Btn sm variant="ghost" onClick={()=>back(dg.id)}>← Voltar</Btn>}
              {dg.status!=="perdido"&&<Btn sm variant="ghost" onClick={()=>upd(dg.id,"status","perdido")} style={{color:"#c0392b",borderColor:"#f5c6c6"}}>Perdido</Btn>}
              {dg.status==="perdido"&&<Btn sm onClick={()=>upd(dg.id,"status","lead")}>Reabrir</Btn>}
            </div>
            <input value={dg.name} onChange={e=>upd(dg.id,"name",e.target.value)} style={{fontSize:20,fontWeight:700,border:"none",outline:"none",color:"#1a1a1a",fontFamily:"inherit",letterSpacing:"-0.3px",width:"100%",background:"transparent",padding:0}}/>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase",letterSpacing:"0.05em"}}>Status</span>
              <Sel value={dg.status||"lead"} onChange={e=>upd(dg.id,"status",e.target.value)} style={{fontSize:11,padding:"3px 8px",width:"auto"}}>
                {CLIENT_ST_KEYS.map(k=><option key={k} value={k}>{CLIENT_ST[k].label}</option>)}
              </Sel>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Empresa</label><input value={dg.company||""} onChange={e=>upd(dg.id,"company",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Área</label><Sel value={dg.area||"Patagon AI"} onChange={e=>upd(dg.id,"area",e.target.value)} style={{fontSize:12,padding:"4px 8px",width:"100%"}}>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</Sel></div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Contato</label><input value={dg.contact||""} onChange={e=>upd(dg.id,"contact",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Valor do deal</label><input type="number" min="0" value={dg.dealValue||""} onChange={e=>upd(dg.id,"dealValue",e.target.value===""?0:Number(e.target.value))} placeholder="0" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Email</label><input value={dg.email||""} onChange={e=>upd(dg.id,"email",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Telefone</label><input value={dg.phone||""} onChange={e=>upd(dg.id,"phone",e.target.value)} placeholder="—" style={{fontSize:12,padding:"4px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3}}><label style={{fontSize:10,fontWeight:700,color:"#aaa",textTransform:"uppercase"}}>Notas</label><textarea value={dg.notes||""} onChange={e=>upd(dg.id,"notes",e.target.value)} placeholder="Notas sobre o cliente…" style={{fontSize:12,lineHeight:1.6,padding:"6px 8px",border:"1px solid #e5e4e0",borderRadius:4,fontFamily:"inherit",resize:"none",minHeight:60,background:"transparent"}}/></div>
            {dgProjects.length>0&&(
              <div style={{borderTop:"1px solid #f5f4f1",paddingTop:12}}>
                <SLabel>Projetos vinculados ({dgProjects.length})</SLabel>
                {dgProjects.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #f8f7f5"}}>
                    <AreaBadge area={p.area}/>
                    <span style={{fontSize:12,color:"#555",flex:1}}>{p.name}</span>
                    <span style={{fontSize:10,color:"#888"}}>{p.status==="doing"?"Em andamento":p.status==="done"?"Concluído":"A fazer"}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{margin:0,fontSize:11,color:"#ccc"}}>Criado {dg.createdAt?new Date(dg.createdAt).toLocaleDateString("pt-BR"):""}</p>
          </div>
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal open={modal} onClose={()=>{setModal(false);setEditId(null);}} title={editId?"Editar cliente":"Novo cliente"} width={440}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <FormRow label="Nome"><Inp value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome do cliente" autoFocus onKeyDown={e=>{if(e.key==="Enter")save();}}/></FormRow>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FormRow label="Empresa"><Inp value={form.company} onChange={e=>setForm(f=>({...f,company:e.target.value}))} placeholder="Empresa"/></FormRow>
            <FormRow label="Área"><Sel value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))} style={{width:"100%"}}>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</Sel></FormRow>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FormRow label="Contato"><Inp value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))} placeholder="Nome do contato"/></FormRow>
            <FormRow label="Valor do deal (R$)"><Inp type="number" min="0" value={form.dealValue||""} onChange={e=>setForm(f=>({...f,dealValue:e.target.value===""?0:Number(e.target.value)}))}/></FormRow>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <FormRow label="Email"><Inp value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@exemplo.com"/></FormRow>
            <FormRow label="Telefone"><Inp value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(XX) XXXXX-XXXX"/></FormRow>
          </div>
          <FormRow label="Status"><Sel value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={{width:"100%"}}>{CLIENT_ST_KEYS.map(k=><option key={k} value={k}>{CLIENT_ST[k].label}</option>)}</Sel></FormRow>
          <FormRow label="Notas"><Txa value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Observações…"/></FormRow>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn variant="ghost" onClick={()=>{setModal(false);setEditId(null);}}>Cancelar</Btn><Btn onClick={save}>{editId?"Salvar":"Adicionar"}</Btn></div>
        </div>
      </Modal>
    </div>
  );
}
