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
const retake = document.querySelector("#retake");
const capture = {hidden:true,disabled:false};
const countdown = document.querySelector("#countdown");
let frozenFrame=null;
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
const requestedReturn=params.get("return");
let returnUrl=activeProduct.productUrl || null;
if(requestedReturn){
  try{
    const candidate=new URL(requestedReturn,location.origin);
    if(candidate.protocol==="https:" || candidate.origin===location.origin) returnUrl=candidate.href;
  }catch{}
}
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
      start.textContent="Tentar novamente";
      start.disabled=false;
      return;
    }
    await engine.startCamera();
    document.querySelector(".mirror-layer").classList.remove("unmirrored");
    stage.classList.add("camera-active");
    start.textContent = "Câmera ativa";
    switchCamera.hidden = false;
    capture.hidden = true;
    fullscreen.hidden = false;
    setStatus("Fique parado olhando para a frente…");
    setTimeout(()=>{ if(engine.running) captureResult(); },900);
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

const drawFrozenFrame=()=>{
  const displayRect=stage.getBoundingClientRect();
  const w=Math.max(1,Math.round(displayRect.width));
  const h=Math.max(1,Math.round(displayRect.height));
  if(!video.videoWidth) return false;
  if(!frozenFrame){
    frozenFrame=document.createElement("canvas");
    frozenFrame.id="frozen-frame";
    frozenFrame.setAttribute("aria-label","Resultado capturado");
    stage.insertBefore(frozenFrame,stage.firstChild);
  }
  frozenFrame.width=w; frozenFrame.height=h;
  const ctx=frozenFrame.getContext("2d");

  // Copia o vídeo com o mesmo object-fit:cover da tela.
  const scale=Math.max(w/video.videoWidth,h/video.videoHeight);
  const dw=video.videoWidth*scale, dh=video.videoHeight*scale;
  const dx=(w-dw)/2, dy=(h-dh)/2;
  ctx.save();
  if(engine.facingMode==="user"){ctx.translate(w,0);ctx.scale(-1,1);}
  ctx.drawImage(video,dx,dy,dw,dh);
  ctx.restore();

  // Em vez de tentar reamostrar o WebGL (que pode estar com drawing buffer
  // já limpo no navegador), desenha a frente do SKU diretamente no quadro
  // congelado usando a última pose facial conhecida.
  const pose=engine.lastFacePose;
  const asset=engine.product?.imageAssetUrl;
  if(!pose||!asset) return false;
  const img=new Image();
  img.src=asset;
  frozenFrame.hidden=false;
  return {img,ctx,w,h,pose};
};

const captureResult=async()=>{
  if(!engine.running || !video.videoWidth){
    setStatus("Ative a câmera antes de capturar");
    return;
  }
  capture.disabled=true;
  switchCamera.disabled=true;
  for(const n of [3,2,1]){
    countdown.hidden=false;
    countdown.textContent=n;
    await new Promise(resolve=>setTimeout(resolve,850));
  }
  countdown.textContent="✓";
  await new Promise(resolve=>setTimeout(resolve,180));
  const frozen=drawFrozenFrame();
  if(!frozen){
    countdown.hidden=true;
    capture.disabled=false;
    switchCamera.disabled=false;
    setStatus("Não foi possível capturar. Tente novamente.");
    return;
  }
  await new Promise((resolve,reject)=>{
    if(frozen.img.complete) return resolve();
    frozen.img.onload=resolve; frozen.img.onerror=reject;
  });
  const aspect=engine.product?.imageAspect||2.2;
  // Espelha a geometria REAL do preview WebGL. A malha fotográfica já inclui
  // a calibração do SKU (1.78 * calibration.scale), portanto não aplicamos
  // calibration.scale novamente aqui.
  const stageAspect=frozen.w/frozen.h;
  const previewRootScale=((frozen.pose.scale*2*stageAspect)/1.66)*.84;
  const meshWidth=engine.glasses3d?.imageFrameWidth||1.78;
  const frameW=(previewRootScale*meshWidth)*(frozen.w/(2*stageAspect));
  const frameH=frameW/aspect;
  let cx=frozen.pose.centerX*frozen.w;
  // Na foto congelada, ancora o centro óptico um pouco abaixo da linha dos
  // olhos para reproduzir o encaixe que já estava correto durante o preview.
  const cy=frozen.pose.centerY*frozen.h+frameH*.06;
  const roll=frozen.pose.roll||0;
  if(engine.facingMode==="user") cx=frozen.w-cx;
  frozen.ctx.save();
  frozen.ctx.translate(cx,cy);
  frozen.ctx.rotate(engine.facingMode==="user"?-roll:roll);
  frozen.ctx.drawImage(frozen.img,-frameW/2,-frameH/2,frameW,frameH);
  frozen.ctx.restore();
  countdown.hidden=true;
  stage.classList.add("frozen");
  engine.stopCamera();
  capture.hidden=true;
  switchCamera.hidden=true;
  retake.hidden=false;
  snapshot.hidden=false;
  start.hidden=true;
  setStatus("Resultado capturado ✓");
};



retake.addEventListener("click",async()=>{
  frozenFrame?.remove();
  frozenFrame=null;
  stage.classList.remove("frozen");
  await engine.startCamera(engine.facingMode);
  retake.hidden=true;
  snapshot.hidden=true;
  capture.hidden=true;
  switchCamera.hidden=false;
  start.hidden=false;
  start.textContent="Câmera ativa";
  setStatus("Fique parado olhando para a frente…");
  setTimeout(()=>{ if(engine.running) captureResult(); },900);
});

snapshot.addEventListener("click", () => {
  if(!frozenFrame){
    setStatus("Capture uma imagem antes de salvar");
    return;
  }
  const link=document.createElement("a");
  link.download="fremi-provador.png";
  link.href=frozenFrame.toDataURL("image/png");
  link.click();
  setStatus("Foto salva ✓");
});

document.addEventListener("visibilitychange",()=>{
  if(document.hidden) return;
  if(engine.running) engine.resize();
});

window.addEventListener("pagehide",()=>engine.stopCamera());
window.addEventListener("error",()=>setStatus("Ocorreu um erro. Recarregue a página."));
window.addEventListener("unhandledrejection",()=>setStatus("Não foi possível concluir esta ação."));

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
