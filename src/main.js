import "./style.css";
import { TryOnEngine } from "./engine/TryOnEngine.js";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const canvas3d = document.querySelector("#overlay3d");
const status = document.querySelector("#status");
const start = document.querySelector("#start");
const switchCamera = document.querySelector("#switch-camera");

const engine = new TryOnEngine(
  video,
  canvas,
  canvas3d,
  (message) => (status.textContent = message)
);

start.addEventListener("click", async () => {
  start.disabled = true;
  try {
    await engine.init();
    await engine.startCamera();
    start.textContent = "Câmera ativa";
    switchCamera.hidden = false;
  } catch (error) {
    console.error(error);
    status.textContent = "Não foi possível iniciar a câmera";
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
    status.textContent="Não foi possível trocar a câmera";
  }finally{
    switchCamera.disabled=false;
  }
});

window.addEventListener("resize",()=>engine.resize());
