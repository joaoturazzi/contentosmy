'use client';
import { useState, useEffect, useRef } from 'react';

export default function CommandPalette({open,onClose,ws,setWs,setW1Page,setW2Page,w1,w2,openQuick}){
  const [q,setQ]=useState("");
  const inputRef=useRef();
  useEffect(()=>{if(open){setQ("");setTimeout(()=>inputRef.current?.focus(),50);}},[open]);

  const results=[];
  const lq=q.toLowerCase();

  const w1Pages=[["home","Visão Geral"],["goals","Metas"],["tasks","Tasks"],["calendar","Calendário"],["ideas","Ideias"],["notes","Notas"],["guests","Convidados"]];
  const w2Pages=[["home","Visão Geral"],["projects","Projetos"],["clients","Clientes"],["tasks","Tasks"],["personal","Pessoal"],["goals","Metas"],["content","Conteúdo"],["notes","Notas"],["tools","Ferramentas"]];

  if(!q||"conteúdo content".includes(lq)){results.push({id:"ws1",icon:"C",label:"Ir para Content OS",sub:"Workspace 1",action:()=>{setWs("content");onClose();}});}
  if(!q||"business projetos".includes(lq)){results.push({id:"ws2",icon:"B",label:"Ir para One Person Business",sub:"Workspace 2",action:()=>{setWs("opb");onClose();}});}

  w1Pages.forEach(([id,label])=>{
    if(!q||label.toLowerCase().includes(lq))
      results.push({id:"w1-"+id,icon:"①",label:`Content OS → ${label}`,sub:"Navegar",action:()=>{setWs("content");setW1Page(id);onClose();}});
  });
  w2Pages.forEach(([id,label])=>{
    if(!q||label.toLowerCase().includes(lq))
      results.push({id:"w2-"+id,icon:"②",label:`One Person Business → ${label}`,sub:"Navegar",action:()=>{setWs("opb");setW2Page(id);onClose();}});
  });

  if(!q||"nova task tarefa".includes(lq)) results.push({id:"new-task",icon:"+",label:"Nova Task",sub:"Criar",action:()=>{onClose();openQuick("task");}});
  if(!q||"nova ideia".includes(lq)) results.push({id:"new-idea",icon:"+",label:"Nova Ideia",sub:"Criar",action:()=>{onClose();openQuick("idea");}});
  if(!q||"nova nota".includes(lq)) results.push({id:"new-note",icon:"+",label:"Nova Nota",sub:"Criar",action:()=>{onClose();openQuick("note");}});
  if(!q||"novo projeto".includes(lq)) results.push({id:"new-proj",icon:"+",label:"Novo Projeto",sub:"Criar",action:()=>{onClose();setWs("opb");setW2Page("projects");openQuick("project");}});
  if(!q||"nova meta objetivo".includes(lq)) results.push({id:"new-goal",icon:"+",label:"Nova Meta",sub:"Criar",action:()=>{onClose();openQuick("goal");}});
  if(!q||"novo convidado guest".includes(lq)) results.push({id:"new-guest",icon:"+",label:"Novo Convidado",sub:"Criar",action:()=>{onClose();openQuick("guest");}});
  if(!q||"novo cliente crm".includes(lq)) results.push({id:"new-client",icon:"+",label:"Novo Cliente",sub:"Criar",action:()=>{onClose();setWs("opb");openQuick("client");}});
  if(!q||"tarefa pessoal personal".includes(lq)) results.push({id:"new-personal",icon:"+",label:"Tarefa Pessoal",sub:"Criar",action:()=>{onClose();setWs("opb");openQuick("personal");}});

  if(q) w2.projects.filter(p=>p.name.toLowerCase().includes(lq)).forEach(p=>{
    results.push({id:"proj-"+p.id,icon:"⬡",label:p.name,sub:`Projeto · ${p.area}`,action:()=>{setWs("opb");setW2Page("projects_"+p.id);onClose();}});
  });
  if(q) w2.tasks.filter(t=>t.title.toLowerCase().includes(lq)).slice(0,4).forEach(t=>{
    const proj=w2.projects.find(p=>p.id===t.projectId);
    results.push({id:"task2-"+t.id,icon:"✓",label:t.title,sub:`Task · ${proj?.name||"sem projeto"}`,action:()=>{setWs("opb");setW2Page("tasks");onClose();}});
  });
  if(q) w1.tasks.filter(t=>t.title.toLowerCase().includes(lq)).slice(0,3).forEach(t=>{
    results.push({id:"task1-"+t.id,icon:"✓",label:t.title,sub:"Task · Content OS",action:()=>{setWs("content");setW1Page("tasks");onClose();}});
  });
  if(q) [...w1.goals,...w2.goals].filter(g=>g.title.toLowerCase().includes(lq)).slice(0,3).forEach(g=>{
    results.push({id:"goal-"+g.id,icon:"◎",label:g.title,sub:"Meta",action:()=>{setWs(w1.goals.includes(g)?"content":"opb");(w1.goals.includes(g)?setW1Page:setW2Page)("goals");onClose();}});
  });
  if(q) w1.notes.filter(n=>n.title.toLowerCase().includes(lq)).slice(0,2).forEach(n=>{
    results.push({id:"note-"+n.id,icon:"☰",label:n.title,sub:"Nota",action:()=>{setWs("content");setW1Page("notes");onClose();}});
  });
  if(q) (w1.guests||[]).filter(g=>g.name.toLowerCase().includes(lq)||(g.company||"").toLowerCase().includes(lq)).slice(0,3).forEach(g=>{
    results.push({id:"guest-"+g.id,icon:"◇",label:g.name,sub:`Convidado${g.company?" · "+g.company:""}`,action:()=>{setWs("content");setW1Page("guests");onClose();}});
  });
  if(q) (w2.clients||[]).filter(c=>c.name.toLowerCase().includes(lq)||(c.company||"").toLowerCase().includes(lq)).slice(0,3).forEach(c=>{
    results.push({id:"client-"+c.id,icon:"◇",label:c.name,sub:`Cliente${c.company?" · "+c.company:""}`,action:()=>{setWs("opb");setW2Page("clients");onClose();}});
  });

  const visible=results.slice(0,10);
  const [sel,setSel]=useState(0);
  useEffect(()=>setSel(0),[q]);

  const handleKey=e=>{
    if(e.key==="ArrowDown"){e.preventDefault();setSel(s=>Math.min(s+1,visible.length-1));}
    if(e.key==="ArrowUp"){e.preventDefault();setSel(s=>Math.max(s-1,0));}
    if(e.key==="Enter"&&visible[sel])visible[sel].action();
    if(e.key==="Escape")onClose();
  };

  if(!open)return null;
  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"80px 20px 20px"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,width:"100%",maxWidth:580,border:"1px solid #eceae5",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:"1px solid #f0efec"}}>
          <span style={{fontSize:14,color:"#bbb"}}>⌘</span>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={handleKey}
            placeholder="Buscar ou criar… (esc para fechar)" autoFocus
            style={{flex:1,fontSize:15,border:"none",outline:"none",fontFamily:"inherit",color:"#1a1a1a"}}/>
          {q&&<button onClick={()=>setQ("")} style={{background:"none",border:"none",cursor:"pointer",color:"#bbb",fontSize:14}}>×</button>}
        </div>
        <div style={{maxHeight:400,overflowY:"auto"}}>
          {!visible.length&&<p style={{padding:"1.5rem",fontSize:13,color:"#bbb",textAlign:"center"}}>Nenhum resultado para "{q}"</p>}
          {visible.map((r,i)=>(
            <div key={r.id} className="pal-item" onClick={r.action} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",background:sel===i?"#f7f6f3":"transparent",borderBottom:"1px solid #fafaf9",transition:"background .05s"}}>
              <span style={{width:24,height:24,borderRadius:6,background:sel===i?"#1a1a1a":"#f0efec",color:sel===i?"#fff":"#888",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{r.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:13,fontWeight:500,color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</p>
                <p style={{margin:0,fontSize:11,color:"#aaa"}}>{r.sub}</p>
              </div>
              {sel===i&&<span style={{fontSize:11,color:"#bbb"}}>↵</span>}
            </div>
          ))}
        </div>
        <div style={{padding:"8px 16px",background:"#fafaf9",borderTop:"1px solid #f0efec",display:"flex",gap:16}}>
          {[["↑↓","navegar"],["↵","selecionar"],["esc","fechar"]].map(([k,l])=>(
            <span key={k} style={{fontSize:11,color:"#bbb"}}><span style={{fontWeight:600,color:"#888"}}>{k}</span> {l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
