import "./style.css";
import { TryOnEngine } from "./engine/TryOnEngine.js";
const video=document.querySelector("#camera"),canvas=document.querySelector("#overlay"),status=document.querySelector("#status"),start=document.querySelector("#start");
const engine=new TryOnEngine(video,canvas,m=>status.textContent=m);
start.addEventListener("click",async()=>{start.disabled=true;try{await engine.init();await engine.startCamera();start.textContent="Câmera ativa"}catch(e){console.error(e);status.textContent="Não foi possível iniciar a câmera";start.disabled=false}});
