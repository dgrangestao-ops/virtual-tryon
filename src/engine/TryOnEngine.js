import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class TryOnEngine {
  constructor(video,canvas,onStatus=()=>{}) {
    this.video=video; this.canvas=canvas; this.ctx=canvas.getContext("2d");
    this.onStatus=onStatus; this.landmarker=null; this.lastVideoTime=-1; this.running=false;
  }
  async init(){
    this.onStatus("Carregando rastreamento facial…");
    const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
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

  if(!face){
    this.onStatus("Posicione seu rosto na câmera");
    return;
  }

  this.onStatus("Rosto detectado ✓");

  // Pontos externos dos olhos
  const leftEye=face[33];
  const rightEye=face[263];

  const x1=leftEye.x*this.canvas.width;
  const y1=leftEye.y*this.canvas.height;
  const x2=rightEye.x*this.canvas.width;
  const y2=rightEye.y*this.canvas.height;

  // Centro dos óculos
  const centerX=(x1+x2)/2;
  const centerY=(y1+y2)/2;

  // Distância e inclinação entre os olhos
  const eyeDistance=Math.hypot(x2-x1,y2-y1);
  const angle=Math.atan2(y2-y1,x2-x1);

  // Dimensões provisórias da armação
  const glassesWidth=eyeDistance*1.75;
  const glassesHeight=glassesWidth*0.34;

  this.ctx.save();

  this.ctx.translate(centerX,centerY);
  this.ctx.rotate(angle);

  this.ctx.strokeStyle="rgba(255,255,255,.95)";
  this.ctx.lineWidth=Math.max(3,glassesWidth*0.018);

  const lensWidth=glassesWidth*0.40;
  const lensHeight=glassesHeight;
  const bridge=glassesWidth*0.08;

  // Lente esquerda
  this.ctx.strokeRect(
    -bridge/2-lensWidth,
    -lensHeight/2,
    lensWidth,
    lensHeight
  );

  // Lente direita
  this.ctx.strokeRect(
    bridge/2,
    -lensHeight/2,
    lensWidth,
    lensHeight
  );

  // Ponte
  this.ctx.beginPath();
  this.ctx.moveTo(-bridge/2,0);
  this.ctx.lineTo(bridge/2,0);
  this.ctx.stroke();

  this.ctx.restore();
}
}
