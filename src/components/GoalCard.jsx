'use client';
import { Card, SLabel, PBar, Btn } from './ui';
import { GST } from '@/lib/constants';
import { computeGoalProgress, today, fmtD } from '@/lib/utils';

export default function GoalCard({goal,tasks=[],onEdit,onDelete,onSetProgress,onSetKRCurrent}){
  const pct=computeGoalProgress(goal,tasks);
  const krs=goal.keyResults||[];
  const linked=tasks.filter(t=>t.goalId===goal.id);
  return(
    <Card style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",gap:8,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:700,color:GST[goal.status]?.c||"#888",letterSpacing:"0.06em",textTransform:"uppercase"}}>{GST[goal.status]?.label}</span>
            <span style={{fontSize:11,color:"#ccc"}}>·</span>
            <span style={{fontSize:11,color:"#bbb"}}>{goal.category}</span>
            {goal.deadline&&<><span style={{fontSize:11,color:"#ccc"}}>·</span><span style={{fontSize:11,color:goal.deadline<today()&&goal.status==="ativo"?"#c0392b":"#bbb"}}>prazo {fmtD(goal.deadline)}</span></>}
            {linked.length>0&&<span style={{fontSize:10,background:"#f4f4f3",color:"#888",padding:"1px 6px",borderRadius:10}}>{linked.filter(t=>t.done).length}/{linked.length} tasks</span>}
          </div>
          <p style={{margin:0,fontSize:15,fontWeight:700}}>{goal.title}</p>
          {goal.description&&<p style={{margin:"3px 0 0",fontSize:13,color:"#888",lineHeight:1.4}}>{goal.description}</p>}
        </div>
        <div style={{display:"flex",gap:4,marginLeft:10,flexShrink:0}}>
          {onEdit&&<Btn variant="ghost" sm onClick={onEdit}>Editar</Btn>}
          {onDelete&&<Btn variant="danger" sm onClick={onDelete}>×</Btn>}
        </div>
      </div>
      <div style={{marginBottom:krs.length?10:0}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,color:"#888"}}>Progresso</span><span style={{fontSize:13,fontWeight:700}}>{pct}%</span></div>
        <PBar pct={pct} color={pct>=100?"#1e8449":pct>=60?"#d68910":"#1a1a1a"}/>
        {goal.progressMode==="manual"&&goal.status==="ativo"&&onSetProgress&&(
          <input type="range" min={0} max={100} step={1} value={Math.round(goal.progress||0)} onChange={e=>onSetProgress(Number(e.target.value))} style={{width:"100%",marginTop:4}}/>
        )}
      </div>
      {krs.length>0&&(
        <div style={{paddingTop:10,borderTop:"1px solid #f5f4f1"}}>
          <SLabel style={{marginBottom:6}}>Key Results</SLabel>
          {krs.map(kr=>{
            const kp=kr.target>0?Math.min(100,Math.round((kr.current/kr.target)*100)):0;
            return(
              <div key={kr.id} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:"#555",flex:1}}>{kr.title}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:10,flexShrink:0}}>
                    {goal.status==="ativo"&&onSetKRCurrent&&(
                      <input type="number" value={kr.current} onChange={e=>onSetKRCurrent(kr.id,e.target.value)} style={{width:56,fontSize:12,padding:"2px 5px",border:"1px solid #e5e4e0",borderRadius:4,textAlign:"center",fontFamily:"inherit"}}/>
                    )}
                    <span style={{fontSize:11,color:"#aaa"}}>/{kr.target} {kr.unit} · {kp}%</span>
                  </div>
                </div>
                <PBar pct={kp} color="#1a1a1a" thin/>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
