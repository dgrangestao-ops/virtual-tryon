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

    this.onStatus("Rastreamento 3D pronto");
  }

  async startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });

    this.video.srcObject = stream;
    await this.video.play();
    this.resize();
    this.running = true;
    requestAnimationFrame(() => this.loop());
  }

  resize() {
    const width = this.video.videoWidth || 1280;
    const height = this.video.videoHeight || 960;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas3d.width = width;
    this.canvas3d.height = height;
    this.glasses3d.resize(width, height);
  }

  loop() {
    if (!this.running) return;

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const result = this.landmarker.detectForVideo(
        this.video,
        performance.now()
      );
      this.draw(result);
    }

    requestAnimationFrame(() => this.loop());
  }

  draw(result) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const face = result.faceLandmarks?.[0];
    const faceMatrix = result.facialTransformationMatrixes?.[0];

    if (!face) {
      this.glasses3d.hide();
      this.glasses3d.render();
      this.onStatus("Posicione seu rosto na câmera");
      return;
    }

    const leftEye = face[33];
    const rightEye = face[263];
    const leftTemple = face[234];
    const rightTemple = face[454];
    const nose = face[1];

    const x1 = leftEye.x * this.canvas.width;
    const y1 = leftEye.y * this.canvas.height;
    const x2 = rightEye.x * this.canvas.width;
    const y2 = rightEye.y * this.canvas.height;

    const templeX1 = leftTemple.x * this.canvas.width;
    const templeY1 = leftTemple.y * this.canvas.height;
    const templeX2 = rightTemple.x * this.canvas.width;
    const templeY2 = rightTemple.y * this.canvas.height;

    const faceWidth = Math.hypot(
      templeX2 - templeX1,
      templeY2 - templeY1
    );

    const eyeDistance = Math.hypot(x2 - x1, y2 - y1);
    // O FaceLandmarker devolve x/y normalizados (0..1).
    // x1..y2 já estão em pixels; o centro precisa usar a média
    // dos landmarks normalizados antes da conversão para pixels.
    const centerX =
      ((leftEye.x + rightEye.x) / 2) * this.canvas.width;
    const centerY =
      ((leftEye.y + rightEye.y) / 2) * this.canvas.height +
      eyeDistance * 0.04;
    const roll = Math.atan2(y2 - y1, x2 - x1);

    const noseX = nose.x * this.canvas.width;
    const landmarkYaw = (noseX - centerX) / eyeDistance;
    const matrixData = faceMatrix?.data;

    const yaw =
      matrixData?.length >= 16
        ? Math.atan2(matrixData[8], matrixData[10])
        : landmarkYaw;

    // Pitch aproximado da matriz 3D do MediaPipe.
    const pitch =
      matrixData?.length >= 16
        ? Math.atan2(
            -matrixData[9],
            Math.hypot(matrixData[8], matrixData[10])
          )
        : 0;

    this.glasses3d.setPose({
      x: centerX,
      y: centerY,
      scale: faceWidth * 0.62,
      roll,
      yaw,
      pitch,
    });

    this.glasses3d.render();
    this.onStatus("Rosto detectado ✓ · modo 3D");
  }
}
