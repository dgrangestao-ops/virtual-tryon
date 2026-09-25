import * as THREE from "three";

/**
 * Camada 3D do provador.
 * A frente e as duas hastes pertencem ao mesmo Group, portanto
 * compartilham posição, escala e rotação sem "vãos" entre PNGs.
 *
 * Esta primeira versão usa geometria procedural para validar tracking 3D.
 * Depois substituiremos a geometria pelo modelo real da armação (GLB/GLTF).
 */
export class Glasses3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    this.camera.position.z = 5;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Marcador WebGL temporário: mostra a origem exata usada pelo objeto 3D.
    this.debugMarker = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 24),
      new THREE.MeshBasicMaterial({ color: 0xff1744, depthTest: false })
    );
    this.debugMarker.position.z = 2;
    this.scene.add(this.debugMarker);

    const material = new THREE.MeshStandardMaterial({
      color: 0x171311,
      roughness: 0.35,
      metalness: 0.08,
    });

    // Frente provisória: estrutura única, apenas para validar pose/profundidade.
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.07, 0.08),
      material
    );
    bridge.position.y = 0.02;
    this.root.add(bridge);

    const rimGeometry = new THREE.TorusGeometry(0.36, 0.035, 10, 40);
    const leftRim = new THREE.Mesh(rimGeometry, material);
    leftRim.scale.set(1.12, 0.78, 1);
    leftRim.position.x = -0.43;
    this.root.add(leftRim);

    const rightRim = leftRim.clone();
    rightRim.position.x = 0.43;
    this.root.add(rightRim);

    // Hastes fisicamente ligadas ao mesmo objeto 3D.
    const templeGeometry = new THREE.BoxGeometry(0.07, 0.07, 1.45);
    const leftTemple = new THREE.Mesh(templeGeometry, material);
    leftTemple.position.set(-0.79, 0.03, -0.68);
    leftTemple.rotation.x = -0.035;
    this.root.add(leftTemple);

    const rightTemple = leftTemple.clone();
    rightTemple.position.x = 0.79;
    this.root.add(rightTemple);

    const light = new THREE.HemisphereLight(0xffffff, 0x555555, 2.2);
    this.scene.add(light);

    this.root.visible = false;
  }

  resize(width, height) {
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
  }

  setPose({ x, y, scale, roll = 0, yaw = 0, pitch = 0 }) {
    const width = this.canvas.width || 1;
    const height = this.canvas.height || 1;
    const aspect = width / height;

    this.root.visible = true;
    this.debugMarker.visible = true;
    // O canvas WebGL não é espelhado. Os landmarks do MediaPipe
    // correspondem ao frame bruto da câmera, então usamos x/y diretamente.
    // O vídeo é espelhado apenas visualmente via CSS; como o rosto é
    // aproximadamente simétrico, a pose frontal deve coincidir no centro.
    const webglX = (x - width / 2) * (2 / height);
    const webglY = (height / 2 - y) * (2 / height);

    this.root.position.set(webglX, webglY, 0);
    this.debugMarker.position.set(webglX, webglY, 2);

    // A geometria procedural tem largura local ~1.6 unidades.
    // Normalizamos pela largura real do rosto para o primeiro encaixe.
    const normalizedScale = ((scale / height) * 2) / 1.6;
    this.root.scale.setScalar(normalizedScale);

    this.root.rotation.set(pitch, yaw, roll);
  }

  hide() {
    this.root.visible = false;
    this.debugMarker.visible = false;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
