import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Glasses3D } from "./Glasses3D.js";

export class TryOnEngine {
  constructor(video, canvas2d, canvas3d, onStatus = () => {}) {
    this.video = video;
    this.canvas = canvas2d;
    this.canvas3d = canvas3d;
    this.ctx = canvas2d.getContext("2d");
    this.glasses3d = new Glasses3D(canvas3d);
    this.onStatus = onStatus;
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.lastStatus = "";
    this.running = false;
    this.stream = null;
    this.facingMode = "user";
    this.initialized = false;
  }

  setStatus(message){
    if(message===this.lastStatus) return;
    this.lastStatus=message;
    this.onStatus(message);
  }

  async init() {
    if(this.initialized) return;
    this.setStatus("Carregando rastreamento facial…");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    const options=(delegate)=>({
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate,
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
    });
    try{
      this.landmarker = await FaceLandmarker.createFromOptions(vision, options("GPU"));
    }catch(error){
      console.warn("GPU indisponível; usando CPU para rastreamento.", error);
      this.landmarker = await FaceLandmarker.createFromOptions(vision, options("CPU"));
    }
    // O modelo procedural Fremi é o ativo no MVP. Quando houver um GLB final,
    // basta chamar glasses3d.loadModel(url, calibracao) a partir do catálogo.
    this.initialized = true;
    this.setStatus("Rastreamento 3D pronto");
  }

  async startCamera(facingMode=this.facingMode) {
    this.stopCamera();
    const previousMode=this.facingMode;
    let stream;
    try{
      stream = await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:facingMode},width:{ideal:1280},height:{ideal:960}},
      audio:false,
      });
    }catch(error){
      this.facingMode=previousMode;
      throw error;
    }
    this.facingMode=facingMode;
    this.stream=stream;
    this.video.srcObject = stream;
    await new Promise((resolve,reject)=>{
      if(this.video.readyState>=1 && this.video.videoWidth) return resolve();
      const ok=()=>{cleanup();resolve();};
      const fail=()=>{cleanup();reject(new Error("Falha ao carregar vídeo da câmera"));};
      const cleanup=()=>{
        this.video.removeEventListener("loadedmetadata",ok);
        this.video.removeEventListener("error",fail);
      };
      this.video.addEventListener("loadedmetadata",ok,{once:true});
      this.video.addEventListener("error",fail,{once:true});
    });
    await this.video.play();
    this.resize();
    this.running = true;
    requestAnimationFrame(() => this.loop());
  }

  stopCamera(){
    if(this.stream){
      this.stream.getTracks().forEach(track=>track.stop());
      this.stream=null;
    }
    this.running=false;
    this.lastVideoTime=-1;
  }

  async switchCamera(){
    const next=this.facingMode==="user"?"environment":"user";
    await this.startCamera(next);
    return next;
  }

  resize() {
    if(!this.video.videoWidth || !this.video.videoHeight) return;
    const width=this.video.videoWidth;
    const height=this.video.videoHeight;
    this.canvas.width=width; this.canvas.height=height;
    this.glasses3d.resize(width,height);
  }

  loop() {
    if(!this.running) return;
    if(this.video.currentTime!==this.lastVideoTime){
      this.lastVideoTime=this.video.currentTime;
      this.draw(this.landmarker.detectForVideo(this.video,performance.now()));
    }
    requestAnimationFrame(()=>this.loop());
  }

  draw(result) {
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    const face=result.faceLandmarks?.[0];
    const matrix=result.facialTransformationMatrixes?.[0]?.data;

    if(!face){
      this.glasses3d.hide();
      this.glasses3d.render();
      this.setStatus("Posicione seu rosto na câmera");
      return;
    }

    const leftEye=face[33], rightEye=face[263];
    const leftTemple=face[234], rightTemple=face[454];

    // Trabalhamos em coordenadas NORMALIZADAS do MediaPipe até o WebGL.
    // Isso elimina mistura entre pixels, CSS, DPR e object-fit.
    const centerX=(leftEye.x+rightEye.x)/2;
    const centerY=(leftEye.y+rightEye.y)/2 + Math.hypot(
      rightEye.x-leftEye.x,
      rightEye.y-leftEye.y
    )*0.04;

    const faceWidth=Math.hypot(
      rightTemple.x-leftTemple.x,
      rightTemple.y-leftTemple.y
    );

    const roll=Math.atan2(
      rightEye.y-leftEye.y,
      rightEye.x-leftEye.x
    );

    const yaw=matrix?.length>=16
      ? Math.atan2(matrix[8],matrix[10])
      : 0;

    const pitch=matrix?.length>=16
      ? Math.atan2(-matrix[9],Math.hypot(matrix[8],matrix[10]))
      : 0;

    this.glasses3d.setPose({
      x:centerX,
      y:centerY,
      scale:faceWidth,
      roll,
      yaw,
      pitch,
      face,
    });

    this.glasses3d.render();
    this.setStatus("Rosto detectado ✓ · modo 3D");
  }
}
