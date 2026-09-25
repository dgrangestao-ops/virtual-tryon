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
    this.running = false;
  }

  async init() {
    this.onStatus("Carregando rastreamento facial…");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFacialTransformationMatrixes: true,
    });
    // Se existir um modelo real em /public/models/frame.glb ele entra
    // automaticamente; enquanto não existir, mantemos o fallback procedural.
    await this.glasses3d.loadModel("/models/frame.glb");
    this.onStatus("Rastreamento 3D pronto");
  }

  async startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video:{facingMode:"user",width:{ideal:1280},height:{ideal:960}},
      audio:false,
    });
    this.video.srcObject = stream;
    await this.video.play();
    this.resize();
    this.running = true;
    requestAnimationFrame(() => this.loop());
  }

  resize() {
    const width=this.video.videoWidth||1280;
    const height=this.video.videoHeight||960;
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
      this.onStatus("Posicione seu rosto na câmera");
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
    });

    this.glasses3d.render();
    this.onStatus("Rosto detectado ✓ · modo 3D");
  }
}
