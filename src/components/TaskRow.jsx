'use client';
import { ChipBadge, AreaBadge } from './ui';
import { PRIOS } from '@/lib/constants';
import { today, fmtD } from '@/lib/utils';

export default function TaskRow({task,onToggle,onDelete,onEdit,project,showProject=false}){
  const late=!task.done&&task.dueDate&&task.dueDate<today();
  return(
    <div style={{display:"flex",alignItems:"stretch",gap:0,borderBottom:"1px solid #f5f4f1"}}>
      <div style={{width:3,flexShrink:0,borderRadius:2,background:PRIOS[task.priority]||"#e0e0de"}}/>
      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0 9px 10px",flex:1,minWidth:0}}>
        <input type="checkbox" checked={task.done} onChange={onToggle} style={{width:15,height:15,cursor:"pointer",flexShrink:0,marginTop:2}}/>
        <div style={{flex:1,minWidth:0}}>
          <p onClick={onEdit} style={{margin:0,fontSize:13,color:task.done?"#bbb":"#1a1a1a",textDecoration:task.done?"line-through":"none",cursor:onEdit?"pointer":"default",lineHeight:1.4}}>{task.title}</p>
          <div style={{display:"flex",gap:6,marginTop:2,alignItems:"center",flexWrap:"wrap"}}>
            {task.channel&&<ChipBadge ch={task.channel}/>}
            {showProject&&project&&<><AreaBadge area={project.area}/><span style={{fontSize:11,color:"#aaa",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block",verticalAlign:"middle"}}>{project.name}</span></>}
            {task.dueDate&&<span style={{fontSize:11,color:late?"#c0392b":"#bbb"}}>{late?"Atrasada · ":""}{fmtD(task.dueDate)}</span>}
            {task.isRecurring&&<span style={{fontSize:10,color:"#8e44ad",fontWeight:600}}>↻</span>}
            {task.notes&&<span style={{fontSize:11,color:"#ccc"}}>• nota</span>}
          </div>
        </div>
        <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#e0e0de",fontSize:14,padding:"0 2px"}}>×</button>
      </div>
    </div>
  );
}
