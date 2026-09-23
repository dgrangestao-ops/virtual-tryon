import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class TryOnEngine {
  constructor(video, canvas, onStatus = () => {}) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onStatus = onStatus;
    this.landmarker = null;
    this.lastVideoTime = -1;
    this.running = false;

    // Primeira armação real do provador
    this.glassesImage = new Image();
    this.glassesImage.src = "/armacao-fremi-teste.png";
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

    this.onStatus("Rastreamento pronto");
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
    this.canvas.width = this.video.videoWidth || 1280;
    this.canvas.height = this.video.videoHeight || 960;
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
    this.ctx.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    const face = result.faceLandmarks?.[0];
const faceMatrix = result.facialTransformationMatrixes?.[0];
    if (!face) {
      this.onStatus("Posicione seu rosto na câmera");
      return;
    }

    this.onStatus("Rosto detectado ✓");

    const leftEye = face[33];
    const rightEye = face[263];
const leftTemple = face[234];
const rightTemple = face[454];
    const nose = face[1];
const noseX = nose.x * this.canvas.width;
    const x1 = leftEye.x * this.canvas.width;
    const y1 = leftEye.y * this.canvas.height;
const templeX1 = leftTemple.x * this.canvas.width;
const templeY1 = leftTemple.y * this.canvas.height;

const templeX2 = rightTemple.x * this.canvas.width;
const templeY2 = rightTemple.y * this.canvas.height;

const faceWidth = Math.hypot(
  templeX2 - templeX1,
  templeY2 - templeY1
);
    const x2 = rightEye.x * this.canvas.width;
    const y2 = rightEye.y * this.canvas.height;

    const eyeDistance = Math.hypot(
  x2 - x1,
  y2 - y1
);

const centerX = (x1 + x2) / 2;

// Fallback baseado nos landmarks
const landmarkYaw = (noseX - centerX) / eyeDistance;

// Rotação 3D real fornecida pelo MediaPipe
const matrixData = faceMatrix?.data;
const matrixYaw =
  matrixData?.length >= 16
    ? Math.atan2(matrixData[8], matrixData[10])
    : null;

// Usa a matriz 3D quando disponível
const yaw = Number.isFinite(matrixYaw)
  ? matrixYaw
  : landmarkYaw;

const centerY =
  (y1 + y2) / 2 + eyeDistance * 0.04;

    const angle = Math.atan2(
      y2 - y1,
      x2 - x1
    );

    // Escala inicial da armação
    const glassesWidth = faceWidth * 0.92;
const perspectiveScaleX = Math.max(0.72, 1 - Math.abs(yaw) * 0.55);
    const perspectiveShiftX = yaw * glassesWidth * 0.12;
const perspectiveSkew = yaw * 0.18;
    if (
      !this.glassesImage.complete ||
      !this.glassesImage.naturalWidth
    ) {
      return;
    }

    const aspect =
      this.glassesImage.naturalHeight /
      this.glassesImage.naturalWidth;

    const glassesHeight =
      glassesWidth * aspect;

    this.ctx.save();

    this.ctx.translate(
    centerX + perspectiveShiftX,
      centerY
    );

    this.ctx.rotate(angle);
this.ctx.transform(
  1,
  0,
  perspectiveSkew,
  1,
  0,
  0
);
    this.ctx.drawImage(
      this.glassesImage,
     -(glassesWidth * perspectiveScaleX) / 2,
      -glassesHeight / 2,
      glassesWidth * perspectiveScaleX,
      glassesHeight
    );

    this.ctx.restore();
  }
}
