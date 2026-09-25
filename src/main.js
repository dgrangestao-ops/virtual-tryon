import "./style.css";
import { TryOnEngine } from "./engine/TryOnEngine.js";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const canvas3d = document.querySelector("#overlay3d");
const status = document.querySelector("#status");
const start = document.querySelector("#start");
const switchCamera = document.querySelector("#switch-camera");
const snapshot = document.querySelector("#snapshot");
const fullscreen = document.querySelector("#fullscreen");
const stage = document.querySelector(".stage");

let statusTimer=null;
const setStatus=(message)=>{
  status.textContent=message;
  status.classList.add("visible");
  clearTimeout(statusTimer);
  if(message.includes("✓")) statusTimer=setTimeout(()=>status.classList.remove("visible"),1800);
};

const engine = new TryOnEngine(
  video,
  canvas,
  canvas3d,
  setStatus
);

start.addEventListener("click", async () => {
  start.disabled = true;
  setStatus("Preparando câmera…");
  try {
    await engine.init();
    await engine.startCamera();
    start.textContent = "Câmera ativa";
    switchCamera.hidden = false;
    snapshot.hidden = false;
    fullscreen.hidden = false;
  } catch (error) {
    console.error(error);
    const denied=error?.name==="NotAllowedError" || error?.name==="PermissionDeniedError";
    const missing=error?.name==="NotFoundError" || error?.name==="DevicesNotFoundError";
    setStatus(denied ? "Permita o acesso à câmera no navegador" : missing ? "Nenhuma câmera foi encontrada" : "Não foi possível iniciar a câmera");
    start.textContent="Tentar novamente";
    start.disabled = false;
  }
});

switchCamera.addEventListener("click", async () => {
  switchCamera.disabled=true;
  try{
    const mode=await engine.switchCamera();
    document.querySelector(".mirror-layer").classList.toggle("unmirrored",mode==="environment");
    switchCamera.textContent=mode==="user"?"Trocar câmera":"Usar câmera frontal";
  }catch(error){
    console.error(error);
    setStatus("Não foi possível trocar a câmera");
  }finally{
    switchCamera.disabled=false;
  }
});

let resizeTimer=null;
window.addEventListener("resize",()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{ if(engine.running) engine.resize(); },120);
});

snapshot.addEventListener("click", () => {
  if(!engine.running || !video.videoWidth){
    setStatus("Ative a câmera antes de salvar a foto");
    return;
  }
  const out=document.createElement("canvas");
  out.width=video.videoWidth||canvas3d.width;
  out.height=video.videoHeight||canvas3d.height;
  const ctx=out.getContext("2d");

  // Reproduz exatamente a visualização espelhada do provador.
  ctx.save();
  if(engine.facingMode==="user"){
    ctx.translate(out.width,0);
    ctx.scale(-1,1);
  }
  ctx.drawImage(video,0,0,out.width,out.height);
  ctx.drawImage(canvas3d,0,0,out.width,out.height);
  ctx.restore();

  const link=document.createElement("a");
  link.download="fremi-provador.png";
  link.href=out.toDataURL("image/png");
  link.click();
  setStatus("Foto salva ✓");
});

document.addEventListener("visibilitychange",()=>{
  if(document.hidden) return;
  if(engine.running) engine.resize();
});

window.addEventListener("beforeunload",()=>engine.stopCamera());

fullscreen.addEventListener("click", async ()=>{
  try{
    if(!document.fullscreenElement){
      await stage.requestFullscreen?.();
      fullscreen.textContent="Sair da tela cheia";
    }else{
      await document.exitFullscreen?.();
    }
  }catch(error){
    console.warn(error);
    setStatus("Tela cheia não disponível neste navegador");
  }
});
document.addEventListener("fullscreenchange",()=>{
  if(!document.fullscreenElement) fullscreen.textContent="Tela cheia";
  if(engine.running) setTimeout(()=>engine.resize(),80);
});
