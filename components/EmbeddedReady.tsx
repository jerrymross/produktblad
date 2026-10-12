"use client";
import {useEffect} from "react";
export function EmbeddedReady(){useEffect(()=>{window.parent.postMessage({type:'produktblad-session-ready'},'https://astar-studio-portal.vercel.app');},[]);return <p>Appinloggningen är förnyad.</p>;}
