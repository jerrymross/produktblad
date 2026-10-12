"use client";
export function PortalReauthentication({returnTo="/produktblad",reload=false}:{returnTo?:string;reload?:boolean}){
  return <button className="text-button" type="button" onClick={()=>{
    if(window.parent!==window)window.parent.postMessage({type:'produktblad-reauth',reload},'https://astar-studio-portal.vercel.app');
    else window.open(`/api/portal/login?returnTo=${encodeURIComponent(returnTo)}`,'_blank','noopener,noreferrer');
  }}>Förnya appinloggningen. Dina ändringar bevaras.</button>;
}
