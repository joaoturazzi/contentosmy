'use client';
import { useState, useEffect, useCallback } from 'react';
import { useDatabaseSync } from '@/lib/sync';
import { CH, AREA_C, AREAS, W1_NAV, W2_NAV, W3_NAV, W4_NAV, WS, FIN_FUNDED, W4_FUNC } from '@/lib/constants';
import { today } from '@/lib/utils';

import { UserButton } from '@clerk/nextjs';
import { Toast } from './ui';
import CommandPalette from './CommandPalette';
import QuickCapture from './QuickCapture';

import W1Focus from './w1/W1Focus';
import W1Goals from './w1/W1Goals';
import W1Tasks from './w1/W1Tasks';
import W1Calendar from './w1/W1Calendar';
import W1Ideas from './w1/W1Ideas';
import W1Notes from './w1/W1Notes';
import W1Guests from './w1/W1Guests';

import W2Focus from './w2/W2Focus';
import W2Projects from './w2/W2Projects';
import W2Tasks from './w2/W2Tasks';
import W2Goals from './w2/W2Goals';
import W2Content from './w2/W2Content';
import W2Tools from './w2/W2Tools';
import W2Clients from './w2/W2Clients';
import W2Notes from './w2/W2Notes';
import W2Personal from './w2/W2Personal';

import W3Dashboard from './w3/W3Dashboard';
import W3Mensal from './w3/W3Mensal';
import W3Gastos from './w3/W3Gastos';
import W3Fixos from './w3/W3Fixos';
import W3Projecao from './w3/W3Projecao';
import W3Reserva from './w3/W3Reserva';
import W3Config from './w3/W3Config';
import W3Cartoes from './w3/W3Cartoes';
import W3Parcelas from './w3/W3Parcelas';
import W3Dividas from './w3/W3Dividas';
import W3Calendario from './w3/W3Calendario';
import W3Importar from './w3/W3Importar';

import W4Home from './w4/W4Home';
import W4Rebirth from './w4/W4Rebirth';
import W4Brand from './w4/W4Brand';
import W4Ads from './w4/W4Ads';
import W4Components from './w4/W4Components';
import W4Projects from './w4/W4Projects';
import W4Config from './w4/W4Config';

const W1_ENTITIES = ['tasks', 'ideas', 'notes', 'events', 'goals', 'guests'];
const W2_ENTITIES = ['projects', 'tasks', 'goals', 'content', 'tools', 'clients', 'notes', 'personal'];
const W3_ENTITIES = ['categories', 'income_sources', 'fixed_costs', 'fixed_payments', 'transactions', 'emergency_reserve', 'monthly_budgets', 'credit_cards', 'card_bills', 'installments', 'debts', 'goals', 'alerts'];
const W4_ENTITIES = ['projects', 'outputs', 'settings'];

export default function App(){
  const [ws,setWs]=useState("content");
  const [wsOpen,setWsOpen]=useState(false);
  const [w1Page,setW1Page]=useState("home");
  const [w2Page,setW2PageRaw]=useState("home");
  const [w3Page,setW3Page]=useState("home");
  const [w4Page,setW4Page]=useState("home");
  const [openProject,setOpenProject]=useState(null);

  // Command palette & quick capture
  const [cmdOpen,setCmdOpen]=useState(false);
  const [quickOpen,setQuickOpen]=useState(false);
  const [quickType,setQuickType]=useState("task");

  // Database-synced state
  const [w1, setW1, w1Loaded] = useDatabaseSync('w1', W1_ENTITIES, {tasks:[],ideas:[],notes:[],events:[],goals:[],guests:[]});
  const [w2, setW2, w2Loaded] = useDatabaseSync('w2', W2_ENTITIES, {projects:[],tasks:[],goals:[],content:[],tools:[],clients:[],notes:[],personal:[]});
  const [w3, setW3, w3Loaded] = useDatabaseSync('w3', W3_ENTITIES, {categories:[],income_sources:[],fixed_costs:[],fixed_payments:[],transactions:[],emergency_reserve:[],monthly_budgets:[],credit_cards:[],card_bills:[],installments:[],debts:[],goals:[],alerts:[]});
  const [w4, setW4, w4Loaded] = useDatabaseSync('w4', W4_ENTITIES, {projects:[],outputs:[],settings:[]});

  const setW2Page=useCallback(p=>{if(p.startsWith("projects_")){setW2PageRaw("projects");setOpenProject(p.replace("projects_",""));}else{setW2PageRaw(p);setOpenProject(null);}},[]);

  // Keyboard shortcuts
  useEffect(()=>{
    const h=e=>{
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();setCmdOpen(s=>!s);}
      if(e.key==="Escape"){setCmdOpen(false);setWsOpen(false);}
    };
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[]);

  const openQuick=(type)=>{setQuickType(type);setQuickOpen(true);};
  const page=ws==="content"?w1Page:ws==="opb"?w2Page:ws==="finance"?w3Page:w4Page;
  const nav=ws==="content"?W1_NAV:ws==="opb"?W2_NAV:ws==="finance"?W3_NAV:W4_NAV;
  const pending=ws==="content"?w1.tasks.filter(t=>!t.done).length:ws==="opb"?w2.tasks.filter(t=>!t.done).length:0;
  const overdue=ws==="content"?w1.tasks.filter(t=>!t.done&&t.dueDate&&t.dueDate<today()).length:ws==="opb"?w2.tasks.filter(t=>!t.done&&t.dueDate&&t.dueDate<today()).length:0;
  const curWs=WS.find(w=>w.id===ws);

  return(
    <>
      <div style={{position:"relative",height:"100vh",overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"210px 1fr",height:"100%"}}>
        {/* SIDEBAR */}
        <div style={{background:"#f7f6f3",borderRight:"1px solid #eceae5",padding:"16px 10px",display:"flex",flexDirection:"column",height:"100vh",overflowY:"auto"}}>
          {/* Workspace switcher */}
          <div style={{position:"relative",marginBottom:16}}>
            <button onClick={()=>setWsOpen(s=>!s)} style={{width:"100%",padding:"8px 10px",borderRadius:8,cursor:"pointer",background:wsOpen?"#ebe9e4":"transparent",border:"none",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit",textAlign:"left"}}>
              <div style={{width:24,height:24,borderRadius:6,background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:11,color:"#fff",fontWeight:700}}>{curWs?.icon}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{curWs?.label}</p>
                <p style={{margin:0,fontSize:10,color:"#aaa"}}>{curWs?.sub}</p>
              </div>
              <span style={{fontSize:9,color:"#aaa"}}>▾</span>
            </button>
            {wsOpen&&(
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",border:"1px solid #eceae5",borderRadius:8,zIndex:200,overflow:"hidden"}}>
                {WS.map(w=>(
                  <button key={w.id} onClick={()=>{setWs(w.id);setWsOpen(false);}} style={{width:"100%",padding:"10px 12px",border:"none",cursor:"pointer",background:ws===w.id?"#f7f6f3":"#fff",display:"flex",alignItems:"center",gap:10,fontFamily:"inherit",textAlign:"left",borderBottom:"1px solid #f5f4f1"}}>
                    <div style={{width:22,height:22,borderRadius:5,background:ws===w.id?"#1a1a1a":"#e5e4e0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:10,color:ws===w.id?"#fff":"#888",fontWeight:700}}>{w.icon}</span>
                    </div>
                    <div style={{flex:1}}><p style={{margin:0,fontSize:12,fontWeight:700}}>{w.label}</p><p style={{margin:0,fontSize:10,color:"#aaa"}}>{w.sub}</p></div>
                    {ws===w.id&&<span style={{fontSize:10,color:"#1a1a1a"}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ⌘K button */}
          <button onClick={()=>{setWsOpen(false);setCmdOpen(true);}} style={{width:"100%",padding:"7px 10px",borderRadius:6,cursor:"pointer",background:"transparent",border:"1px solid #e5e4e0",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit",color:"#aaa",fontSize:12,marginBottom:14,textAlign:"left"}}>
            <span>⌘</span><span style={{flex:1}}>Buscar ou criar…</span><span style={{fontSize:10,background:"#ebe9e4",padding:"1px 5px",borderRadius:3,color:"#888"}}>K</span>
          </button>

          {/* Nav */}
          <nav style={{flex:1}}>
            {nav.map(item=>(
              <button key={item.id} className="nav-btn" onClick={()=>{setWsOpen(false);ws==="content"?setW1Page(item.id):ws==="opb"?(item.id==="projects"?setOpenProject(null):null,setW2Page(item.id)):ws==="finance"?setW3Page(item.id):setW4Page(item.id);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 8px",borderRadius:6,cursor:"pointer",border:"none",textAlign:"left",background:page===item.id?"#ebe9e4":"transparent",color:page===item.id?"#1a1a1a":"#555",fontSize:13,fontWeight:page===item.id?700:400,fontFamily:"inherit",marginBottom:1,transition:"background .08s"}}>
                <span style={{fontSize:11,opacity:0.55}}>{item.icon}</span>
                {item.label}
                {item.id==="tasks"&&overdue>0&&<span style={{marginLeft:"auto",fontSize:10,background:"#fdf2f2",color:"#c0392b",padding:"1px 5px",borderRadius:10,fontWeight:700}}>{overdue}</span>}
                {item.id==="tasks"&&!overdue&&pending>0&&<span style={{marginLeft:"auto",fontSize:10,background:"#f0efec",color:"#888",padding:"1px 5px",borderRadius:10}}>{pending}</span>}
              </button>
            ))}
          </nav>

          {/* Quick add */}
          <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid #eceae5"}}>
            <p style={{margin:"0 0 8px",fontSize:10,fontWeight:700,letterSpacing:"0.09em",color:"#ccc",textTransform:"uppercase",paddingLeft:8}}>Quick add</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {(ws==="content"?[["task","Task"],["idea","Ideia"],["note","Nota"],["goal","Meta"]]:ws==="opb"?[["task","Task"],["project","Projeto"],["goal","Meta"],["content","Conteúdo"]]:ws==="finance"?[["gasto","Gasto"],["fixo","Custo Fixo"]]:[["rebirth","Site"],["brand","Brand"],["ads","Ad"],["components","UI"]]).map(([t,l])=>(
                <button key={t} onClick={()=>{setWsOpen(false);ws==="visual"?setW4Page(t):openQuick(t);}} style={{fontSize:11,padding:"5px 8px",borderRadius:5,cursor:"pointer",background:"transparent",border:"1px solid #e5e4e0",color:"#888",fontFamily:"inherit",fontWeight:500,textAlign:"center",transition:"background .08s"}}>+ {l}</button>
              ))}
            </div>
          </div>

          {/* Areas / Channels */}
          <div style={{paddingTop:14,marginTop:8,borderTop:"1px solid #eceae5"}}>
            <p style={{margin:"0 0 6px",fontSize:10,fontWeight:700,letterSpacing:"0.09em",color:"#ccc",textTransform:"uppercase",paddingLeft:8}}>{ws==="content"?"Canais":ws==="opb"?"Áreas":ws==="finance"?"Fontes":"Functions"}</p>
            {ws==="content"
              ?Object.entries(CH).slice(0,3).map(([k,v])=><div key={k} style={{display:"flex",alignItems:"center",gap:7,padding:"2px 8px"}}><span style={{width:6,height:6,borderRadius:2,background:v.color,flexShrink:0}}/><span style={{fontSize:11,color:"#888"}}>{v.label}</span></div>)
              :ws==="opb"
              ?AREAS.map(a=><div key={a} style={{display:"flex",alignItems:"center",gap:7,padding:"2px 8px"}}><span style={{width:6,height:6,borderRadius:2,background:AREA_C[a].color,flexShrink:0}}/><span style={{fontSize:11,color:"#888"}}>{a}</span></div>)
              :ws==="finance"
              ?Object.entries(FIN_FUNDED).map(([k,v])=><div key={k} style={{display:"flex",alignItems:"center",gap:7,padding:"2px 8px"}}><span style={{width:6,height:6,borderRadius:2,background:k==="renda_principal"?"#0F9B58":k==="entrada_mazul"?"#2196F3":"#00BCD4",flexShrink:0}}/><span style={{fontSize:11,color:"#888"}}>{v}</span></div>)
              :Object.entries(W4_FUNC).map(([k,v])=><div key={k} style={{display:"flex",alignItems:"center",gap:7,padding:"2px 8px"}}><span style={{width:6,height:6,borderRadius:2,background:"#555",flexShrink:0}}/><span style={{fontSize:11,color:"#888"}}>{v.label}</span></div>)
            }
          </div>

          {/* User */}
          <div style={{paddingTop:12,marginTop:8,borderTop:"1px solid #eceae5",paddingLeft:8}}>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>

        {/* MAIN */}
        <div style={{padding:"28px 32px",overflowY:"auto",background:"#fff",height:"100vh"}} onClick={()=>{if(wsOpen)setWsOpen(false);}}>
          {/* W1 */}
          {ws==="content"&&w1Loaded&&(
            <>
              {w1Page==="home"&&<W1Focus w1={w1} setW1={setW1} setPage={setW1Page} w2content={w2.content}/>}
              {w1Page==="goals"&&<W1Goals w1={w1} setW1={setW1}/>}
              {w1Page==="tasks"&&<W1Tasks w1={w1} setW1={setW1}/>}
              {w1Page==="calendar"&&<W1Calendar w1={w1} setW1={setW1} w2content={w2.content} setW2={setW2}/>}
              {w1Page==="ideas"&&<W1Ideas w1={w1} setW1={setW1} setPage={setW1Page}/>}
              {w1Page==="notes"&&<W1Notes w1={w1} setW1={setW1}/>}
              {w1Page==="guests"&&<W1Guests w1={w1} setW1={setW1}/>}
            </>
          )}
          {ws==="content"&&!w1Loaded&&<p style={{color:"#bbb",fontSize:13}}>Carregando…</p>}

          {/* W2 */}
          {ws==="opb"&&w2Loaded&&(
            <>
              {w2Page==="home"&&<W2Focus w2={w2} setW2={setW2} setPage={setW2Page}/>}
              {w2Page==="projects"&&<W2Projects w2={w2} setW2={setW2} openProject={openProject} setOpenProject={setOpenProject}/>}
              {w2Page==="tasks"&&<W2Tasks w2={w2} setW2={setW2}/>}
              {w2Page==="goals"&&<W2Goals w2={w2} setW2={setW2}/>}
              {w2Page==="clients"&&<W2Clients w2={w2} setW2={setW2}/>}
              {w2Page==="personal"&&<W2Personal w2={w2} setW2={setW2}/>}
              {w2Page==="content"&&<W2Content w2={w2} setW2={setW2}/>}
              {w2Page==="notes"&&<W2Notes w2={w2} setW2={setW2}/>}
              {w2Page==="tools"&&<W2Tools w2={w2} setW2={setW2}/>}
            </>
          )}
          {ws==="opb"&&!w2Loaded&&<p style={{color:"#bbb",fontSize:13}}>Carregando…</p>}

          {/* W3 Finance */}
          {ws==="finance"&&w3Loaded&&(
            <>
              {w3Page==="home"&&<W3Dashboard w3={w3} setW3={setW3}/>}
              {w3Page==="mensal"&&<W3Mensal w3={w3} setW3={setW3}/>}
              {w3Page==="gastos"&&<W3Gastos w3={w3} setW3={setW3}/>}
              {w3Page==="cartoes"&&<W3Cartoes w3={w3} setW3={setW3}/>}
              {w3Page==="parcelas"&&<W3Parcelas w3={w3} setW3={setW3}/>}
              {w3Page==="dividas"&&<W3Dividas w3={w3} setW3={setW3}/>}
              {w3Page==="fixos"&&<W3Fixos w3={w3} setW3={setW3}/>}
              {w3Page==="calendario"&&<W3Calendario w3={w3} setW3={setW3}/>}
              {w3Page==="projecao"&&<W3Projecao w3={w3} setW3={setW3}/>}
              {w3Page==="reserva"&&<W3Reserva w3={w3} setW3={setW3}/>}
              {w3Page==="importar"&&<W3Importar/>}
              {w3Page==="config"&&<W3Config w3={w3} setW3={setW3}/>}
            </>
          )}
          {ws==="finance"&&!w3Loaded&&<p style={{color:"#bbb",fontSize:13}}>Carregando…</p>}

          {/* W4 Visual OS */}
          {ws==="visual"&&w4Loaded&&(
            <>
              {w4Page==="home"&&<W4Home w4={w4} setW4={setW4} setPage={setW4Page}/>}
              {w4Page==="rebirth"&&<W4Rebirth w4={w4} setW4={setW4}/>}
              {w4Page==="brand"&&<W4Brand w4={w4} setW4={setW4}/>}
              {w4Page==="ads"&&<W4Ads w4={w4} setW4={setW4}/>}
              {w4Page==="components"&&<W4Components w4={w4} setW4={setW4}/>}
              {w4Page==="projects"&&<W4Projects w4={w4} setW4={setW4} setPage={setW4Page}/>}
              {w4Page==="config"&&<W4Config w4={w4} setW4={setW4}/>}
            </>
          )}
          {ws==="visual"&&!w4Loaded&&<p style={{color:"#bbb",fontSize:13}}>Carregando…</p>}
        </div>
      </div>

      {/* Global overlays — inside positioned wrapper, outside grid */}
      <CommandPalette open={cmdOpen} onClose={()=>setCmdOpen(false)} ws={ws} setWs={setWs} setW1Page={setW1Page} setW2Page={setW2Page} w1={w1} w2={w2} openQuick={openQuick}/>
      <QuickCapture open={quickOpen} type={quickType} onClose={()=>setQuickOpen(false)} ws={ws} w1={w1} setW1={setW1} w2={w2} setW2={setW2}/>
      <Toast/>
      </div>
    </>
  );
}
