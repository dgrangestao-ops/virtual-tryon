import "./style.css";
import { TryOnEngine } from "./engine/TryOnEngine.js";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const canvas3d = document.querySelector("#overlay3d");
const status = document.querySelector("#status");
const start = document.querySelector("#start");

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
  } catch (error) {
    console.error(error);
    status.textContent = "Não foi possível iniciar a câmera";
    start.disabled = false;
  }
});
