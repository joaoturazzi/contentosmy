'use client';

import { Card, SLabel, PBar, AreaBadge, PrioDot, ChipBadge, Empty } from '../ui';
import { PL, PL_COLS, CLIENT_ST } from '@/lib/constants';
import { today, fmtD, fmtFull, computeGoalProgress, uid, calcNextDue } from '@/lib/utils';

export default function W2Focus({w2,setW2,setPage}){
  const now=new Date(),td=today();
  const h=now.getHours();
  const greet=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
  const {tasks,projects,goals,content,clients,personal}=w2;
  const pending=tasks.filter(t=>!t.done);
  const urgent=pending.filter(t=>t.priority==="alta"||(t.dueDate&&t.dueDate<=td));
  const overdue=pending.filter(t=>t.dueDate&&t.dueDate<td);
  const focus=[...new Map([...overdue,...urgent].filter(t=>!t.isRecurring).map(t=>[t.id,t])).values()].slice(0,6);
  const rotinas=pending.filter(t=>t.isRecurring&&t.dueDate&&t.dueDate<=td);
  const activeG=goals.filter(g=>g.status==="ativo");
  const avgG=activeG.length?Math.round(activeG.reduce((s,g)=>s+computeGoalProgress(g,tasks),0)/activeG.length):0;
  const todayC=content.filter(c=>c.scheduledDate===td&&c.status!=="published");
  const pipelineClients=(clients||[]).filter(c=>c.status==="proposta"||c.status==="negociacao");
  const personalToday=(personal||[]).filter(p=>p.date===td);
  const personalDone=personalToday.filter(p=>p.done).length;

  const toggle=id=>setW2(d=>{
    const t=d.tasks.find(x=>x.id===id);if(!t)return d;
    if(t.isRecurring&&!t.done){
      const nd=calcNextDue(t.dueDate||td,t.frequency);
      const clone={...t,id:uid(),done:false,dueDate:nd,nextDue:nd,createdAt:new Date().toISOString()};
      return{...d,tasks:[...d.tasks.map(x=>x.id===id?{...x,done:true}:x),clone]};
    }
    return{...d,tasks:d.tasks.map(x=>x.id===id?{...x,done:!x.done}:x)};
  });
  const togglePersonal=id=>setW2(d=>({...d,personal:(d.personal||[]).map(p=>p.id===id?{...p,done:!p.done}:p)}));

  return(
    <div>
      <p style={{margin:"0 0 2px",fontSize:26,fontWeight:700,letterSpacing:"-0.5px"}}>{greet}, João 👋</p>
      <p style={{margin:"0 0 24px",fontSize:13,color:"#888"}}>{fmtFull(td)} · One Person Business</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
        {[
          {label:"Em atraso",value:overdue.length,accent:overdue.length?"#c0392b":"#bbb"},
          {label:"Urgentes",value:urgent.length,accent:urgent.length?"#d68910":"#bbb"},
          {label:"Progresso médio",value:`${avgG}%`,accent:"#1e8449"},
          {label:"Em pipeline",value:pipelineClients.length,accent:pipelineClients.length?"#8e44ad":"#bbb"},
        ].map((s,i)=>(
          <Card key={i} style={{padding:"12px 14px"}}>
            <p style={{margin:0,fontSize:11,color:"#aaa",fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>{s.label}</p>
            <p style={{margin:"6px 0 0",fontSize:26,fontWeight:700,color:s.accent,letterSpacing:"-0.5px"}}>{s.value}</p>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <SLabel>Foco do dia — tasks urgentes</SLabel>
            <button onClick={()=>setPage("tasks")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>ver todas →</button>
          </div>
          {!focus.length?<Empty text="Nenhuma task urgente. 🎉"/>:focus.map(t=>{
            const proj=projects.find(p=>p.id===t.projectId);
            const late=t.dueDate&&t.dueDate<td;
            return(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f5f4f1"}}>
                <input type="checkbox" checked={!!t.done} onChange={()=>toggle(t.id)} style={{width:15,height:15,cursor:"pointer",flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:13,fontWeight:500}}>{t.title}</p>
                  <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center"}}>
                    {proj&&<AreaBadge area={proj.area}/>}
                    {late&&<span style={{fontSize:10,color:"#c0392b",fontWeight:700}}>ATRASADA</span>}
                    {t.dueDate&&!late&&<span style={{fontSize:11,color:"#bbb"}}>{fmtD(t.dueDate)}</span>}
                  </div>
                </div>
                <PrioDot p={t.priority}/>
              </div>
            );
          })}
          {rotinas.length>0&&(
            <div style={{marginTop:20}}>
              <SLabel>Rotinas de hoje</SLabel>
              {rotinas.map(t=>{
                const proj=projects.find(p=>p.id===t.projectId);
                return(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f5f4f1"}}>
                    <input type="checkbox" checked={!!t.done} onChange={()=>toggle(t.id)} style={{width:15,height:15,cursor:"pointer",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:13,fontWeight:500}}>{t.title}</p>
                      <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center"}}>
                        {proj&&<AreaBadge area={proj.area}/>}
                        <span style={{fontSize:10,color:"#8e44ad",fontWeight:600}}>↻</span>
                        {t.dueDate&&<span style={{fontSize:11,color:"#bbb"}}>{fmtD(t.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {todayC.length>0&&(
            <div style={{marginTop:20}}>
              <SLabel>Conteúdo programado hoje</SLabel>
              {todayC.map(c=>(
                <div key={c.id} style={{display:"flex",gap:8,padding:"8px 10px",background:"#fafaf9",borderRadius:6,border:"1px solid #f0efec",marginBottom:6,alignItems:"center"}}>
                  <ChipBadge ch={c.channel}/>
                  <span style={{fontSize:13,flex:1}}>{c.title}</span>
                  <span style={{fontSize:11,color:"#bbb"}}>{PL[c.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <SLabel>Metas — progresso</SLabel>
              <button onClick={()=>setPage("goals")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>ver →</button>
            </div>
            {activeG.map(g=>{
              const pct=computeGoalProgress(g,tasks);
              return(
                <div key={g.id} style={{padding:"7px 0",borderBottom:"1px solid #f5f4f1"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12}}>{g.title}</span>
                    <span style={{fontSize:12,fontWeight:700,color:pct>=100?"#1e8449":pct>=60?"#d68910":"#888"}}>{pct}%</span>
                  </div>
                  <PBar pct={pct} color={pct>=100?"#1e8449":pct>=60?"#d68910":"#1a1a1a"} thin/>
                </div>
              );
            })}
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <SLabel>Projetos em andamento</SLabel>
              <button onClick={()=>setPage("projects")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>ver →</button>
            </div>
            {projects.filter(p=>p.status==="doing").map(p=>{
              const pt=tasks.filter(t=>t.projectId===p.id&&!t.done).length;
              return(
                <div key={p.id} style={{padding:"7px 0",borderBottom:"1px solid #f5f4f1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><AreaBadge area={p.area}/><p style={{margin:"4px 0 0",fontSize:13,fontWeight:500}}>{p.name}</p></div>
                  {pt>0&&<span style={{fontSize:11,color:"#888",flexShrink:0}}>{pt} task{pt!==1?"s":""}</span>}
                </div>
              );
            })}
          </div>
          <div>
            <SLabel>Pipeline por etapa</SLabel>
            {PL_COLS.map(col=>{
              const cnt=content.filter(c=>c.status===col).length;
              if(!cnt)return null;
              return(
                <div key={col} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:11,color:"#888",minWidth:64}}>{PL[col]}</span>
                  <div style={{flex:1,background:"#f0efec",borderRadius:3,height:5,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,cnt*15)}%`,height:"100%",background:"#8e44ad",borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:12,color:"#888",minWidth:16,textAlign:"right"}}>{cnt}</span>
                </div>
              );
            })}
          </div>
          {personalToday.length>0&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <SLabel>Pessoal — hoje</SLabel>
                <button onClick={()=>setPage("personal")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>ver →</button>
              </div>
              {personalToday.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid #f5f4f1"}}>
                  <input type="checkbox" checked={p.done} onChange={()=>togglePersonal(p.id)} style={{width:14,height:14,cursor:"pointer",flexShrink:0}}/>
                  <span style={{fontSize:12,color:p.done?"#bbb":"#555",textDecoration:p.done?"line-through":"none"}}>{p.title}</span>
                </div>
              ))}
              <p style={{margin:"4px 0 0",fontSize:11,color:"#ccc"}}>{personalDone}/{personalToday.length}</p>
            </div>
          )}
          {pipelineClients.length>0&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <SLabel>Clientes em pipeline</SLabel>
                <button onClick={()=>setPage("clients")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>ver →</button>
              </div>
              {pipelineClients.map(c=>{
                const st=CLIENT_ST[c.status];
                return(
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid #f5f4f1"}}>
                    <span style={{fontSize:10,fontWeight:700,color:st?.color,background:st?.bg,padding:"1px 5px",borderRadius:3}}>{st?.label}</span>
                    <span style={{fontSize:12,color:"#555",flex:1}}>{c.name}</span>
                    {c.dealValue>0&&<span style={{fontSize:11,color:"#1e8449",fontWeight:600}}>R$ {Number(c.dealValue).toLocaleString("pt-BR")}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
