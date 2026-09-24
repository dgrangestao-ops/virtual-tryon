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

    // Frente da armação
    this.glassesImage = new Image();
    this.glassesImage.src = "/armacao-fremi-teste.png";

    // Haste real Fremi
    this.templeImage = new Image();
    this.templeImage.src = "/haste-fremi-esquerda.png";
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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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

    const x1 = leftEye.x * this.canvas.width;
    const y1 = leftEye.y * this.canvas.height;
    const x2 = rightEye.x * this.canvas.width;
    const y2 = rightEye.y * this.canvas.height;

    const templeX1 = leftTemple.x * this.canvas.width;
    const templeY1 = leftTemple.y * this.canvas.height;
    const templeX2 = rightTemple.x * this.canvas.width;
    const templeY2 = rightTemple.y * this.canvas.height;

    const noseX = nose.x * this.canvas.width;

    const faceWidth = Math.hypot(
      templeX2 - templeX1,
      templeY2 - templeY1
    );

    const eyeDistance = Math.hypot(x2 - x1, y2 - y1);

    const centerX = (x1 + x2) / 2;
    const centerY =
      (y1 + y2) / 2 + eyeDistance * 0.04;

    // Yaw 3D real
    const landmarkYaw = (noseX - centerX) / eyeDistance;
    const matrixData = faceMatrix?.data;

    const matrixYaw =
      matrixData?.length >= 16
        ? Math.atan2(matrixData[8], matrixData[10])
        : null;

    const yaw = Number.isFinite(matrixYaw)
      ? matrixYaw
      : landmarkYaw;

    const angle = Math.atan2(y2 - y1, x2 - x1);

    const glassesWidth = faceWidth * 0.92;

    const perspectiveScaleX = Math.max(
      0.72,
      1 - Math.abs(yaw) * 0.55
    );

    const perspectiveShiftX =
      yaw * glassesWidth * 0.12;

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

    const glassesHeight = glassesWidth * aspect;

    this.ctx.save();

    this.ctx.translate(
      centerX + perspectiveShiftX,
      centerY
    );

    this.ctx.rotate(angle);

// ============================
// HASTE LATERAL DINÂMICA
// ============================

// A haste só aparece quando a rotação lateral é perceptível.
// O lado visível é invertido porque a câmera frontal é espelhada.
const yawAbs = Math.abs(yaw);
const yawAmount = Math.min(
  1,
  Math.max(0, (yawAbs - 0.10) / 0.32)
);

if (
  yawAmount > 0.04 &&
  this.templeImage.complete &&
  this.templeImage.naturalWidth
) {
  const side = yaw >= 0 ? -1 : 1;
  const frontHalfWidth =
    (glassesWidth * perspectiveScaleX) / 2;

  // Mantém a dobradiça presa à extremidade da frente.
  const hingeX =
    side * frontHalfWidth * 0.99;
  const hingeY =
    -glassesHeight * 0.16;

  const templeAspect =
    this.templeImage.naturalHeight /
    this.templeImage.naturalWidth;

  // Comprimento suficiente para alcançar visualmente a região da orelha.
  const templeWidth =
    glassesWidth * (0.34 + yawAmount * 0.38);

  const templeHeight =
    templeWidth * templeAspect;

  this.ctx.save();
  this.ctx.translate(hingeX, hingeY);

  this.ctx.globalAlpha = Math.min(
    1,
    yawAmount * 1.8
  );

  // Mantém a haste quase horizontal, como nas referências reais.
  this.ctx.rotate(
    side * (0.003 + yawAmount * 0.012)
  );

  // O PNG possui a dobradiça na direita.
  if (side > 0) {
    this.ctx.scale(-1, 1);
  }

  // Perspectiva moderada: conserva o comprimento aparente
  // sem voltar ao efeito de haste aberta para fora do rosto.
  const depthScale =
    0.62 + yawAmount * 0.30;

  this.ctx.scale(depthScale, 1);

  this.ctx.drawImage(
    this.templeImage,
    -templeWidth,
    -templeHeight * 0.46,
    templeWidth,
    templeHeight
  );

  this.ctx.restore();
}

    // ============================
    // FRENTE DA ARMAÇÃO
    // ============================

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
