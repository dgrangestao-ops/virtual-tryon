import "./style.css";
import { TryOnEngine } from "./engine/TryOnEngine.js";
import { PRODUCTS, findProduct } from "./products.generated.js";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#overlay");
const canvas3d = document.querySelector("#overlay3d");
const status = document.querySelector("#status");
const start = document.querySelector("#start");
const switchCamera = document.querySelector("#switch-camera");
const snapshot = document.querySelector("#snapshot");
const fullscreen = document.querySelector("#fullscreen");
const stage = document.querySelector(".stage");
const productName = document.querySelector("#product-name");
const testProduct=document.querySelector("#test-product");
const pilotBadge=document.querySelector("#pilot-badge");
const params=new URLSearchParams(location.search);
const testMode=params.get("test")==="1";
if(!testMode && pilotBadge) pilotBadge.hidden=true;
const requestedSku=params.get("sku");
const requestedProduct=params.get("product");
const requestedKey=requestedSku||requestedProduct;
const matchedProduct=findProduct({sku:requestedSku,id:requestedProduct});
let activeProduct = matchedProduct || findProduct();
const unknownProduct=Boolean(requestedKey && !matchedProduct);
const backStore=document.querySelector("#back-store");
const buyProduct=document.querySelector("#buy-product");
const returnUrl=params.get("return") || activeProduct.productUrl || null;
productName.textContent=activeProduct.name;
if(activeProduct.productUrl){
  buyProduct.href=activeProduct.productUrl;
  buyProduct.hidden=false;
}


let statusTimer=null;
const setStatus=(message)=>{
  status.textContent=message;
  status.classList.add("visible");
  clearTimeout(statusTimer);
  if(message.includes("✓")) statusTimer=setTimeout(()=>status.classList.remove("visible"),1800);
};

if(unknownProduct){
  productName.textContent="Produto não disponível no provador";
  start.disabled=true;
  start.textContent="Produto indisponível";
  setStatus("Este SKU ainda não está disponível para prova virtual");
}

const engine = new TryOnEngine(
  video,
  canvas,
  canvas3d,
  setStatus
);

if(testMode && PRODUCTS.filter(p=>p.available).length>1){
  testProduct.hidden=false;
  for(const p of PRODUCTS.filter(p=>p.available)){
    const option=document.createElement("option");
    option.value=p.sku; option.textContent=p.name; option.selected=p.id===activeProduct.id;
    testProduct.appendChild(option);
  }
  testProduct.addEventListener("change",async()=>{
    const next=findProduct({sku:testProduct.value});
    if(!next) return;
    testProduct.disabled=true;
    setStatus("Trocando armação…");
    try{
      const ready=await engine.setProduct(next);
      if(ready===false) throw new Error("Produto indisponível");
      activeProduct=next;
      productName.textContent=next.name;
      if(next.productUrl){buyProduct.href=next.productUrl;buyProduct.hidden=false;}
      const url=new URL(location.href);
      url.searchParams.set("sku",next.sku);
      history.replaceState(null,"",url);
      setStatus("Armação carregada ✓");
    }catch(error){
      console.warn(error);
      setStatus("Não foi possível carregar esta armação");
    }finally{testProduct.disabled=false;}
  });
}

start.addEventListener("click", async () => {
  if(unknownProduct) return;
  start.disabled = true;
  setStatus("Preparando câmera…");
  try {
    await engine.init();
    const productReady=await engine.setProduct(activeProduct);
    if(productReady===false){
      setStatus("Produto indisponível para prova virtual");
      return;
    }
    await engine.startCamera();
    document.querySelector(".mirror-layer").classList.remove("unmirrored");
    start.textContent = "Câmera ativa";
    switchCamera.hidden = false;
    snapshot.hidden = false;
    fullscreen.hidden = false;
    if(returnUrl) backStore.hidden=false;
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

window.addEventListener("pagehide",()=>engine.stopCamera());

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


backStore.addEventListener("click",()=>{
  if(!returnUrl) return;
  try{
    const target=new URL(returnUrl,location.origin);
    if(target.protocol==="https:" || target.origin===location.origin) location.href=target.href;
  }catch(error){
    console.warn("URL de retorno inválida",error);
  }
});
