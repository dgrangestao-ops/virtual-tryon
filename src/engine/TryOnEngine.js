import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class TryOnEngine {
  constructor(video,canvas,onStatus=()=>{}) {
    this.video=video; this.canvas=canvas; this.ctx=canvas.getContext("2d");
    this.onStatus=onStatus; this.landmarker=null; this.lastVideoTime=-1; this.running=false;
  }
  async init(){
    this.onStatus("Carregando rastreamento facial…");
    const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm");
    this.landmarker=await FaceLandmarker.createFromOptions(vision,{
      baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",delegate:"GPU"},
      runningMode:"VIDEO",numFaces:1,outputFacialTransformationMatrixes:true
    });
    this.onStatus("Rastreamento pronto");
  }
  async startCamera(){
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:1280},height:{ideal:960}},audio:false});
    this.video.srcObject=stream; await this.video.play(); this.resize(); this.running=true; requestAnimationFrame(()=>this.loop());
  }
  resize(){this.canvas.width=this.video.videoWidth||1280;this.canvas.height=this.video.videoHeight||960}
  loop(){
    if(!this.running)return;
    if(this.video.currentTime!==this.lastVideoTime){
      this.lastVideoTime=this.video.currentTime;
      const result=this.landmarker.detectForVideo(this.video,performance.now());
      this.draw(result);
    }
    requestAnimationFrame(()=>this.loop());
  }
  draw(result){
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const face=result.faceLandmarks?.[0];
    if(!face){this.onStatus("Posicione seu rosto na câmera");return}
    this.onStatus("Rosto detectado ✓");
    const ids=[33,263,168,234,454];
    this.ctx.fillStyle="rgba(255,255,255,.85)";
    for(const id of ids){const p=face[id];this.ctx.beginPath();this.ctx.arc(p.x*this.canvas.width,p.y*this.canvas.height,5,0,Math.PI*2);this.ctx.fill()}
  }
}
