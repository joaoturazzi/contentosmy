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

// ── Finance helpers ─────────────────────────────────────────────
export const fmtBRL = v => {
  const n = typeof v === 'string' ? parseFloat(v) : (v || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
export const fmtDateBR = d => {
  if (!d) return '';
  try { return new Date(d + 'T12:00').toLocaleDateString('pt-BR'); } catch { return d; }
};
export const curMonth = () => new Date().getMonth() + 1;
export const curYear = () => new Date().getFullYear();

export function calcNextDue(currentDate, frequency) {
  const d = new Date((currentDate||today())+'T12:00');
  if(frequency==='daily') d.setDate(d.getDate()+1);
  else if(frequency==='weekly') d.setDate(d.getDate()+7);
  else if(frequency==='biweekly') d.setDate(d.getDate()+14);
  else if(frequency==='monthly') d.setMonth(d.getMonth()+1);
  else d.setDate(d.getDate()+7);
  return dateStr(d);
}
