'use client';

import { Card, SLabel, PBar, ChipBadge, PrioDot, Empty } from '../ui';
import { CH, MONTHS, EVT_ST } from '@/lib/constants';
import { today, dateStr, fmtD, fmtFull, computeGoalProgress } from '@/lib/utils';

export default function W1Focus({w1,setW1,setPage,w2content=[]}){
  const now=new Date(),td=today();
  const h=now.getHours();
  const greet=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite";
  const {tasks,goals,events,ideas}=w1;

  // Tomorrow date
  const tmrw=new Date(now);tmrw.setDate(tmrw.getDate()+1);
  const tdTmrw=dateStr(tmrw);

  // Stat cards — real data from events
  const overdueEvs=events.filter(e=>e.date<td&&(e.status||"ideia")!=="publicado");
  const focusTodayEvs=events.filter(e=>e.date===td&&(e.status||"ideia")!=="publicado");
  const mKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const publishedThisMonth=events.filter(e=>e.date?.startsWith(mKey)&&e.status==="publicado");
  const activeGoals=goals.filter(g=>g.status==="ativo"&&computeGoalProgress(g,tasks)<100);

  // Focus items: events today/tomorrow + next in production + oldest high-priority unscheduled idea
  const todayTmrwEvs=[...events.filter(e=>(e.date===td||e.date===tdTmrw)&&(e.status||"ideia")!=="publicado")].sort((a,b)=>a.channel.localeCompare(b.channel));
  const nextInProd=events.filter(e=>e.date>=td&&(e.status==="producao"||e.status==="gravado"||e.status==="editado")).sort((a,b)=>a.date.localeCompare(b.date))[0];
  const topIdea=(ideas||[]).filter(i=>i.priority==="alta"&&!i.scheduled).sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""))[0];

  // Build focus list
  const focusItems=[];
  todayTmrwEvs.forEach(e=>{
    if(!focusItems.find(f=>f.id===e.id)) focusItems.push({id:e.id,type:"event",title:e.title,channel:e.channel,sub:e.date===td?"Hoje":"Amanhã",status:e.status});
  });
  if(nextInProd&&!focusItems.find(f=>f.id===nextInProd.id)){
    focusItems.push({id:nextInProd.id,type:"event",title:nextInProd.title,channel:nextInProd.channel,sub:`${EVT_ST[nextInProd.status]?.label} · ${fmtD(nextInProd.date)}`,status:nextInProd.status});
  }
  if(topIdea){
    focusItems.push({id:topIdea.id,type:"idea",title:topIdea.title,channel:topIdea.channel,sub:"Ideia prioritária"});
  }

  // Tasks for focus (keep backward compat)
  const todayTs=tasks.filter(t=>!t.done&&t.dueDate===td);
  const overdueTasks=tasks.filter(t=>!t.done&&t.dueDate&&t.dueDate<td);
  const highPrio=tasks.filter(t=>!t.done&&t.priority==="alta");
  const taskFocus=[...new Map([...overdueTasks,...todayTs,...highPrio].map(t=>[t.id,t])).values()].slice(0,4);

  const toggle=id=>setW1(d=>({...d,tasks:d.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)}));

  // Channel CTR averages
  const channelCtr={};
  Object.keys(CH).slice(0,3).forEach(k=>{
    const pubs=events.filter(e=>e.date?.startsWith(mKey)&&e.status==="publicado"&&e.channel===k&&e.ctr!=null);
    if(pubs.length) channelCtr[k]=(pubs.reduce((s,e)=>s+e.ctr,0)/pubs.length).toFixed(1);
  });

  const topGoal=goals.filter(g=>g.status==="ativo").sort((a,b)=>computeGoalProgress(b,tasks)-computeGoalProgress(a,tasks))[0];
  const mEvs=events.filter(e=>e.date?.startsWith(mKey));

  return(
    <div>
      <p style={{margin:"0 0 2px",fontSize:26,fontWeight:700,letterSpacing:"-0.5px"}}>{greet}, João 👋</p>
      <p style={{margin:"0 0 24px",fontSize:13,color:"#888"}}>{fmtFull(td)}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
        {[
          {label:"Em atraso",value:overdueEvs.length,accent:overdueEvs.length?"#c0392b":"#bbb"},
          {label:"Foco hoje",value:focusTodayEvs.length,accent:"#1a1a1a"},
          {label:"Publicados no mês",value:publishedThisMonth.length,accent:"#1a5276"},
          {label:"Metas ativas",value:activeGoals.length,accent:"#1e8449"},
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
            <SLabel>Foco do dia</SLabel>
            <button onClick={()=>setPage("calendar")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>calendário →</button>
          </div>
          {!focusItems.length&&!taskFocus.length?<Empty text="Nenhuma task prioritária. 🎉"/>:(
            <>
              {/* Content focus */}
              {focusItems.map(item=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f4f1"}}>
                  <span style={{fontSize:11,opacity:0.5}}>{item.type==="event"?"◫":"✦"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:13,fontWeight:500}}>{item.title}</p>
                    <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center"}}>
                      <ChipBadge ch={item.channel}/>
                      <span style={{fontSize:11,color:"#bbb"}}>{item.sub}</span>
                      {item.status&&EVT_ST[item.status]&&<span style={{fontSize:10,fontWeight:600,color:EVT_ST[item.status].color}}>{EVT_ST[item.status].label}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {/* Task focus */}
              {taskFocus.map(t=>{
                const late=t.dueDate&&t.dueDate<td;
                return(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f4f1"}}>
                    <input type="checkbox" checked={!!t.done} onChange={()=>toggle(t.id)} style={{width:15,height:15,cursor:"pointer",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:13,fontWeight:500}}>{t.title}</p>
                      <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center"}}>
                        <ChipBadge ch={t.channel}/>
                        {late&&<span style={{fontSize:10,color:"#c0392b",fontWeight:700}}>ATRASADA</span>}
                        {t.dueDate&&!late&&<span style={{fontSize:11,color:"#bbb"}}>{fmtD(t.dueDate)}</span>}
                      </div>
                    </div>
                    <PrioDot p={t.priority}/>
                  </div>
                );
              })}
            </>
          )}
          {(()=>{
            const todayContent=[
              ...events.filter(e=>e.date===td),
              ...w2content.filter(c=>c.scheduledDate===td&&c.status!=="published").map(c=>({...c,date:c.scheduledDate,_fromW2:true}))
            ];
            return todayContent.length>0?(
              <div style={{marginTop:20}}>
                <SLabel>Conteúdo hoje</SLabel>
                {todayContent.map(e=>(
                  <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#fafaf9",borderRadius:6,border:"1px solid #f0efec",marginBottom:6}}>
                    <ChipBadge ch={e.channel}/>
                    <span style={{fontSize:13,flex:1}}>{e.title}</span>
                    {e._fromW2?<span style={{fontSize:10,color:"#8e44ad",background:"#f8f3fc",padding:"1px 5px",borderRadius:3,fontWeight:600}}>pipeline</span>
                      :<span style={{fontSize:10,fontWeight:600,color:EVT_ST[e.status]?.color||"#888"}}>{EVT_ST[e.status]?.label||"Ideia"}</span>}
                    <span style={{fontSize:11,color:"#bbb"}}>{e.type}</span>
                  </div>
                ))}
              </div>
            ):null;
          })()}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {topGoal&&(
            <div>
              <SLabel>Meta prioritária</SLabel>
              <Card style={{cursor:"default"}} onClick={()=>setPage("goals")}>
                <p style={{margin:"0 0 6px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{topGoal.title}</p>
                {topGoal.description&&<p style={{margin:"0 0 8px",fontSize:12,color:"#888",lineHeight:1.4}}>{topGoal.description}</p>}
                {topGoal.deadline&&<p style={{margin:"0 0 8px",fontSize:11,color:"#bbb"}}>prazo {fmtD(topGoal.deadline)}</p>}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,color:"#888"}}>Progresso</span>
                  <span style={{fontSize:12,fontWeight:700}}>{computeGoalProgress(topGoal,tasks)}%</span>
                </div>
                <PBar pct={computeGoalProgress(topGoal,tasks)} color="#1a1a1a"/>
              </Card>
            </div>
          )}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <SLabel>Canais — {MONTHS[now.getMonth()]}</SLabel>
              <button onClick={()=>setPage("calendar")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>calendário →</button>
            </div>
            {Object.entries(CH).slice(0,3).map(([k,v])=>{
              const cnt=mEvs.filter(e=>e.channel===k).length;
              return(
                <div key={k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:v.color,minWidth:24}}>{v.short}</span>
                  <div style={{flex:1,background:"#f0efec",borderRadius:3,height:5,overflow:"hidden"}}>
                    <div style={{width:`${Math.min(100,cnt*8)}%`,height:"100%",background:v.color,borderRadius:3}}/>
                  </div>
                  <span style={{fontSize:12,color:"#888",minWidth:16,textAlign:"right"}}>{cnt}</span>
                  {channelCtr[k]&&<span style={{fontSize:10,color:"#bbb",minWidth:38,textAlign:"right"}}>CTR {channelCtr[k]}%</span>}
                </div>
              );
            })}
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <SLabel>Todas as metas</SLabel>
              <button onClick={()=>setPage("goals")} style={{fontSize:11,color:"#aaa",background:"none",border:"none",cursor:"pointer",padding:0}}>ver →</button>
            </div>
            {goals.filter(g=>g.status==="ativo").map(g=>{
              const pct=computeGoalProgress(g,tasks);
              return(
                <div key={g.id} style={{padding:"7px 0",borderBottom:"1px solid #f5f4f1"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12}}>{g.title}</span>
                    <span style={{fontSize:12,fontWeight:600,color:"#888"}}>{pct}%</span>
                  </div>
                  <PBar pct={pct} color={pct>=100?"#1e8449":pct>=60?"#d68910":"#1a1a1a"} thin/>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
