'use client';
import { useEffect, useState } from 'react';
import { CH, AREA_C, PRIOS } from '@/lib/constants';

export const IS={boxSizing:"border-box",width:"100%",fontSize:13,padding:"6px 10px",border:"1px solid #e5e4e0",borderRadius:6,background:"#fff",color:"#1a1a1a",outline:"none",fontFamily:"inherit"};

export function Inp({style,...p}){return <input style={{...IS,...style}} {...p}/>;}
export function Sel({children,style,...p}){return <select style={{...IS,cursor:"pointer",...style}} {...p}>{children}</select>;}
export function Txa({style,rows=3,...p}){return <textarea rows={rows} style={{...IS,resize:"vertical",lineHeight:1.65,...style}} {...p}/>;}
export function Btn({children,variant="solid",onClick,style,sm}){
  const base={fontSize:sm?11:13,padding:sm?"3px 9px":"6px 14px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",fontWeight:600,border:"none"};
  const v={solid:{background:"#1a1a1a",color:"#fff"},ghost:{background:"transparent",color:"#555",border:"1px solid #e0e0de"},danger:{background:"#fdf2f2",color:"#c0392b",border:"1px solid #f5c6c6"}};
  return <button onClick={onClick} style={{...base,...v[variant],...style}}>{children}</button>;
}
export function Card({children,style,onClick,className}){return <div className={className} onClick={onClick} style={{background:"#fff",border:"1px solid #eceae5",borderRadius:8,padding:"14px 16px",...style}}>{children}</div>;}
export function Empty({text}){return <p style={{margin:"2rem 0",fontSize:13,color:"#bbb",textAlign:"center"}}>{text}</p>;}
export function SLabel({children,style}){return <p style={{margin:"0 0 10px",fontSize:11,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:"#aaa",...style}}>{children}</p>;}
export function FormRow({label,children}){return <div style={{display:"flex",flexDirection:"column",gap:4}}><label style={{fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}</label>{children}</div>;}
export function PBar({pct,color="#1a1a1a",thin}){const h=thin?3:5;return <div style={{background:"#ebebea",borderRadius:h,overflow:"hidden",height:h}}><div style={{width:`${Math.min(100,Math.max(0,pct))}%`,height:"100%",background:color,borderRadius:h,transition:"width .3s"}}/></div>;}
export function PrioDot({p}){return <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:PRIOS[p]||"#ccc",flexShrink:0}}/>;}
export function ChipBadge({ch}){if(!CH[ch])return null;return <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em",background:CH[ch].bg,color:CH[ch].color,padding:"2px 6px",borderRadius:4}}>{CH[ch].short}</span>;}
export function AreaBadge({area}){const c=AREA_C[area]||{color:"#555",bg:"#f4f4f3"};return <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em",background:c.bg,color:c.color,padding:"2px 6px",borderRadius:4}}>{area}</span>;}
export function FPill({label,active,color,onClick}){return <button className="pill-btn" onClick={onClick} style={{fontSize:12,padding:"4px 12px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontWeight:500,background:active?(color||"#1a1a1a"):"transparent",color:active?"#fff":(color||"#888"),border:`1px solid ${active?(color||"#1a1a1a"):"#e0e0de"}`}}>{label}</button>;}

export const toast=(msg)=>window.dispatchEvent(new CustomEvent("app-toast",{detail:msg}));
export function Toast(){
  const [msg,setMsg]=useState(null);
  useEffect(()=>{
    const h=(e)=>{setMsg(e.detail);};
    window.addEventListener("app-toast",h);
    return()=>window.removeEventListener("app-toast",h);
  },[]);
  useEffect(()=>{if(msg){const t=setTimeout(()=>setMsg(null),2500);return()=>clearTimeout(t);}},[msg]);
  if(!msg)return null;
  return <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",color:"#fff",padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 12px rgba(0,0,0,.15)",pointerEvents:"none",animation:"fadeIn .15s ease-out"}}>{msg}</div>;
}

export function Modal({open,onClose,children,title,width=520}){
  useEffect(()=>{if(!open)return;const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[open,onClose]);
  if(!open)return null;
  return <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.22)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900,padding:20}}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:10,padding:24,width:"100%",maxWidth:width,border:"1px solid #eceae5",maxHeight:"88vh",overflowY:"auto"}}>
      {title&&<p style={{margin:"0 0 16px",fontSize:15,fontWeight:700}}>{title}</p>}
      {children}
    </div>
  </div>;
}
