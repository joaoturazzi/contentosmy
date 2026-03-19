export const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5);
export const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const today = () => dateStr(new Date());
export const fmtD = d => { try { return new Date(d+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}); } catch { return d; }};
export const fmtFull = d => { try { return new Date(d+"T12:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"}); } catch { return d; }};

export function computeGoalProgress(goal, tasks=[]) {
  const krs = goal.keyResults||[];
  if (goal.progressMode==="keyResults" && krs.length)
    return Math.round(krs.reduce((s,k)=>s+Math.min(100,k.target>0?(k.current/k.target)*100:0),0)/krs.length);
  if (goal.progressMode==="tasks") {
    const linked = tasks.filter(t=>t.goalId===goal.id);
    if (linked.length) return Math.round((linked.filter(t=>t.done).length/linked.length)*100);
  }
  return Math.round(goal.progress||0);
}

export const blankGoal=(cats)=>({id:uid(),title:"",description:"",category:cats[0],status:"ativo",progress:0,deadline:"",progressMode:"manual",keyResults:[],createdAt:new Date().toISOString()});
export const blankKR=()=>({id:uid(),title:"",current:0,target:100,unit:""});
