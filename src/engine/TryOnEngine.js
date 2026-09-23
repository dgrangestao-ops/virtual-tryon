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

    if (!face) {
      this.onStatus("Posicione seu rosto na câmera");
      return;
    }

    this.onStatus("Rosto detectado ✓");

    const leftEye = face[33];
    const rightEye = face[263];

    const x1 = leftEye.x * this.canvas.width;
    const y1 = leftEye.y * this.canvas.height;

    const x2 = rightEye.x * this.canvas.width;
    const y2 = rightEye.y * this.canvas.height;

    const eyeDistance = Math.hypot(
  x2 - x1,
  y2 - y1
);

const centerX = (x1 + x2) / 2;
const centerY = (y1 + y2) / 2 + eyeDistance * 0.04;

    const angle = Math.atan2(
      y2 - y1,
      x2 - x1
    );

    // Escala inicial da armação
    const glassesWidth = eyeDistance * 1.9;

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
      centerX,
      centerY
    );

    this.ctx.rotate(angle);

    this.ctx.drawImage(
      this.glassesImage,
      -glassesWidth / 2,
      -glassesHeight / 2,
      glassesWidth,
      glassesHeight
    );

    this.ctx.restore();
  }
}
