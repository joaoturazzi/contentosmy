'use client';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import App from '@/components/App';

function Landing() {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#fafaf9',padding:'0 24px'}}>
      <div style={{textAlign:'center',maxWidth:480}}>
        <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:48,height:48,borderRadius:12,background:'#1a1a1a',marginBottom:24}}>
          <span style={{fontSize:20,color:'#fff',fontWeight:700}}>C</span>
        </div>
        <h1 style={{margin:'0 0 8px',fontSize:32,fontWeight:700,letterSpacing:'-0.5px',color:'#1a1a1a'}}>Content OS</h1>
        <p style={{margin:'0 0 32px',fontSize:15,color:'#888',lineHeight:1.6}}>
          Sistema operacional pessoal para criadores de conteudo e one-person businesses.
        </p>
        <SignInButton mode="modal">
          <button style={{fontSize:14,fontWeight:600,padding:'10px 28px',borderRadius:8,cursor:'pointer',background:'#1a1a1a',color:'#fff',border:'none',fontFamily:'inherit'}}>
            Entrar
          </button>
        </SignInButton>
      </div>
      <p style={{position:'absolute',bottom:24,fontSize:11,color:'#ccc'}}>by Joao Rufino</p>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SignedOut>
        <Landing />
      </SignedOut>
      <SignedIn>
        <App />
      </SignedIn>
    </>
  );
}
