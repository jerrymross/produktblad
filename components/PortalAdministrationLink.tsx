"use client";
import type {ReactNode} from "react";
export function PortalAdministrationLink({children}:{children:ReactNode}){return <a href="https://astar-studio-portal.vercel.app/?admin=1" onClick={event=>{if(window.parent!==window){event.preventDefault();window.parent.postMessage({type:'portal-administration'},'https://astar-studio-portal.vercel.app');}}}>{children}</a>;}
