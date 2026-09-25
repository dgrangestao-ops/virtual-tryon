import "./style.css";
import { TryOnEngine } from "./engine/TryOnEngine.js";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const canvas3d = document.querySelector("#overlay3d");
const status = document.querySelector("#status");
const start = document.querySelector("#start");
const switchCamera = document.querySelector("#switch-camera");
const snapshot = document.querySelector("#snapshot");

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
  try {
    await engine.init();
    await engine.startCamera();
    start.textContent = "Câmera ativa";
    switchCamera.hidden = false;
    snapshot.hidden = false;
  } catch (error) {
    console.error(error);
    setStatus("Não foi possível iniciar a câmera");
    start.disabled = false;
  }
});

switchCamera.addEventListener("click", async () => {
  switchCamera.disabled=true;
  try{
    const mode=await engine.switchCamera();
    switchCamera.textContent=mode==="user"?"Trocar câmera":"Usar câmera frontal";
  }catch(error){
    console.error(error);
    setStatus("Não foi possível trocar a câmera");
  }finally{
    switchCamera.disabled=false;
  }
});

window.addEventListener("resize",()=>engine.resize());

snapshot.addEventListener("click", () => {
  const out=document.createElement("canvas");
  out.width=video.videoWidth||canvas3d.width;
  out.height=video.videoHeight||canvas3d.height;
  const ctx=out.getContext("2d");

  // Reproduz exatamente a visualização espelhada do provador.
  ctx.save();
  ctx.translate(out.width,0);
  ctx.scale(-1,1);
  ctx.drawImage(video,0,0,out.width,out.height);
  ctx.drawImage(canvas3d,0,0,out.width,out.height);
  ctx.restore();

  const link=document.createElement("a");
  link.download="fremi-provador.png";
  link.href=out.toDataURL("image/png");
  link.click();
  setStatus("Foto salva ✓");
});
