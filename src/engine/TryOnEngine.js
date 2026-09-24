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

    const glassesWidth = faceWidth * 1.04;

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
// HASTE LATERAL ANCORADA AO ROSTO
// ============================

// A haste usa o landmark temporal como referência de direção/distância.
// A imagem é desenhada com pequena sobreposição sobre a frente para
// eliminar qualquer vão visual na dobradiça.
const yawAbs = Math.abs(yaw);
const yawAmount = Math.min(
  1,
  Math.max(0, (yawAbs - 0.09) / 0.34)
);

if (
  yawAmount > 0.04 &&
  this.templeImage.complete &&
  this.templeImage.naturalWidth
) {
  const side = yaw >= 0 ? -1 : 1;

  const targetXCanvas =
    side < 0 ? templeX1 : templeX2;
  const targetYCanvas =
    side < 0 ? templeY1 : templeY2;

  const dx = targetXCanvas - (centerX + perspectiveShiftX);
  const dy = targetYCanvas - centerY;

  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  const targetLocalX = dx * cosA - dy * sinA;
  const targetLocalY = dx * sinA + dy * cosA;

  const frontHalfWidth =
    (glassesWidth * perspectiveScaleX) / 2;

  // Sobrepõe alguns pixels na frente: a haste nasce dentro da região
  // da dobradiça, evitando o vão entre os dois PNGs.
  const hingeOverlap = glassesWidth * 0.025;
  const hingeX =
    side * (frontHalfWidth - hingeOverlap);
  const hingeY =
    -glassesHeight * 0.375;

  const vecX = targetLocalX - hingeX;
  const vecY = targetLocalY - hingeY;
  const targetDistance = Math.hypot(vecX, vecY);

  const rawTempleAngle = Math.atan2(vecY, vecX);
  const horizontalAngle = side < 0 ? Math.PI : 0;
  let angleDelta = rawTempleAngle - horizontalAngle;
  while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
  while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;

  // A parte rígida sai quase horizontal. A curvatura existente no PNG
  // é responsável pela descida final atrás da orelha.
  const templeAngle =
    horizontalAngle + angleDelta * 0.16;

  // Aumenta o alcance para ultrapassar o ponto temporal e posicionar
  // a curva final na região posterior da orelha.
  const visibleLength =
    Math.max(
      glassesWidth * 0.42,
      targetDistance * (1.20 + yawAmount * 0.18)
    );

  const templeAspect =
    this.templeImage.naturalHeight /
    this.templeImage.naturalWidth;
  const templeHeight =
    visibleLength * templeAspect;

  this.ctx.save();
  this.ctx.translate(hingeX, hingeY);
  this.ctx.globalAlpha = Math.min(1, yawAmount * 1.8);

  if (side < 0) {
    this.ctx.rotate(templeAngle + Math.PI);
  } else {
    this.ctx.rotate(templeAngle);
    this.ctx.scale(-1, 1);
  }

  this.ctx.drawImage(
    this.templeImage,
    -visibleLength,
    -templeHeight * 0.46,
    visibleLength,
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
