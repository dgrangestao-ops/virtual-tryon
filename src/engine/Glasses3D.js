import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { solveFrontPose, smoothPose } from "./FramePoseSolver.js";
import { normalizeAssetGeometry } from "./AssetGeometry.js";

export class Glasses3D {
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000,0);

    this.scene=new THREE.Scene();
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0.01,100);
    this.camera.position.z=5;

    this.root=new THREE.Group();
    this.scene.add(this.root);
    this.modelRoot=new THREE.Group();
    this.root.add(this.modelRoot);

    this.loader=new GLTFLoader();
    this.model=null;
    this.usingExternalModel=false;
    this.modelCalibration={scale:1,position:[0,0,0],rotation:[0,0,0]};

    this.buildFallback();
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2.2));
    const key=new THREE.DirectionalLight(0xffffff,1.15);
    key.position.set(1.5,2,4);
    this.scene.add(key);

    this.root.visible=false;
    this.pose=null;
    this.imageFrame=null;
    this.imageFrameBaseX=0;
    this.imageTemples=null;
    this.imageFrameWidth=0;
    this.imageFrameHeight=0;
    this.imageAssetGeometry=null;
    this.templeOccluders=null;
    this.templeMaterial=null;
    this.templePose=null;
    this.earPose=null;
    this.templeSide=0;
    this.templeSideCandidate=0;
    this.templeSideFrames=0;
    this.assetToken=0;
  }

  clearPhotoAsset(){
    if(this.templeOccluders){
      this.modelRoot.remove(this.templeOccluders.left,this.templeOccluders.right);
      for(const m of [this.templeOccluders.left,this.templeOccluders.right]){m.geometry?.dispose?.();m.material?.dispose?.();}
      this.templeOccluders=null;
    }
    if(this.imageTemples){
      this.modelRoot.remove(this.imageTemples.left,this.imageTemples.right);
      for(const g of [this.imageTemples.left,this.imageTemples.right]) g.traverse(n=>{n.geometry?.dispose?.();n.material?.dispose?.();});
      this.imageTemples=null;
    }
    this.templeMaterial?.dispose?.();
    this.templeMaterial=null;
    if(this.imageFrame){
      this.modelRoot.remove(this.imageFrame);
      this.imageFrame.material?.map?.dispose?.();
      this.imageFrame.material?.dispose?.();
      this.imageFrame.geometry?.dispose?.();
      this.imageFrame=null;
    }
    this.imageAssetGeometry=null;
    this.imageFrameWidth=0;
    this.imageFrameHeight=0;
    this.templeSide=0;
    this.templeSideCandidate=0;
    this.templeSideFrames=0;
  }

  setImageFrame(asset, calibration={}){
    const token=++this.assetToken;
    if(!asset?.url) return Promise.resolve(false);
    if(this.model){
      this.modelRoot.remove(this.model);
      this.model.traverse?.(node=>{
        node.geometry?.dispose?.();
        if(Array.isArray(node.material)) node.material.forEach(mat=>mat?.dispose?.());
        else node.material?.dispose?.();
      });
      this.model=null;
    }
    this.clearPhotoAsset();
    const textureReady=new Promise(resolve=>{
      new THREE.TextureLoader().load(
        asset.url,
        texture=>{
          if(token!==this.assetToken){texture.dispose();return resolve(false);}
          texture.colorSpace=THREE.SRGBColorSpace;
          if(this.imageFrame?.material) this.imageFrame.material.map=texture;
          this.imageFrame?.material && (this.imageFrame.material.needsUpdate=true);
          this.render();
          resolve(true);
        },
        undefined,
        error=>{
          if(token===this.assetToken){
            console.warn("Falha ao carregar textura da armação",error);
            this.clearPhotoAsset();
            this.usingExternalModel=false;
            this.fallback.visible=true;
            this.root.visible=false;
            this.render();
          }
          resolve(false);
        }
      );
    });
    const width=1.78*(calibration.scale||1);
    const height=width/Math.max(asset.aspect||2.2,1.2);
    const curvature=Math.max(0.035,Math.min(0.085,0.13/Math.max(asset.aspect||2.2,1.2)));
    const material=new THREE.MeshBasicMaterial({
      map:null,transparent:true,depthWrite:false,side:THREE.DoubleSide
    });
    // Geometria 2.5D: uma curvatura leve evita o efeito de "cartão plano"
    // quando a cabeça gira, sem exigir um modelo 3D manual por SKU.
    const geometry=new THREE.PlaneGeometry(width,height,24,2);
    const posAttr=geometry.attributes.position;
    const half=width/2;
    for(let i=0;i<posAttr.count;i++){
      const x=posAttr.getX(i);
      const nx=Math.min(1,Math.abs(x)/Math.max(half,0.001));
      posAttr.setZ(i,-curvature*nx*nx);
    }
    posAttr.needsUpdate=true;
    geometry.computeVertexNormals();
    this.imageFrame=new THREE.Mesh(geometry,material);
    const pos=calibration.position||[0,0,0];
    this.imageFrame.position.set(pos[0]||0,0.015+(pos[1]||0),0.055+(pos[2]||0));
    this.imageFrame.userData.aspect=asset.aspect||2.2;
    this.imageAssetGeometry=normalizeAssetGeometry(asset.geometry);
    this.imageFrameBaseX=pos[0]||0;
    this.modelRoot.add(this.imageFrame);

    // MVP frontal: ativos fotográficos usam somente a frente da armação.
    // Hastes sintéticas foram removidas para evitar artefatos laterais.
    this.imageTemples=null;
    this.templeOccluders=null;
    this.templeMaterial=null;
    this.imageFrameWidth=width; this.imageFrameHeight=height;
    this.fallback.visible=false;
    this.leftTemple.visible=false;
    this.rightTemple.visible=false;
    this.usingExternalModel=true;
    this.model=null;
    return textureReady;
  }

  buildFallback(){
    // Materiais provisórios aproximando o acabamento do modelo Fremi:
    // acetato preto/café brilhante e lente fumê com leve transparência.
    const frameMat=new THREE.MeshPhysicalMaterial({
      color:0x160f0d,
      roughness:0.20,
      metalness:0.02,
      clearcoat:0.55,
      clearcoatRoughness:0.18
    });
    const amberMat=new THREE.MeshPhysicalMaterial({
      color:0x5a250b,
      roughness:0.24,
      metalness:0.01,
      clearcoat:0.45,
      transparent:true,
      opacity:0.78
    });
    const lensMat=new THREE.MeshPhysicalMaterial({
      color:0x56606b,
      transparent:true,
      opacity:0.30,
      roughness:0.08,
      metalness:0,
      depthWrite:false
    });

    const group=new THREE.Group();
    group.name="procedural-fallback";

    // Fallback visual inspirado no primeiro modelo Fremi piloto:
    // frente retangular ampla, topo mais espesso e cantos inferiores suaves.
    const lensShape=new THREE.Shape();
    lensShape.moveTo(-0.39,0.24);
    lensShape.bezierCurveTo(-0.18,0.29,0.25,0.28,0.40,0.20);
    lensShape.bezierCurveTo(0.43,0.02,0.39,-0.24,0.27,-0.32);
    lensShape.bezierCurveTo(0.05,-0.38,-0.28,-0.36,-0.38,-0.23);
    lensShape.bezierCurveTo(-0.45,-0.08,-0.45,0.10,-0.39,0.24);

    const lensGeo=new THREE.ShapeGeometry(lensShape);
    const leftLens=new THREE.Mesh(lensGeo,lensMat);
    leftLens.position.set(-0.46,-0.035,-0.025);
    group.add(leftLens);
    const rightLens=leftLens.clone();
    rightLens.position.x=0.46;
    group.add(rightLens);

    // Aros acompanham o contorno das lentes.
    const rimPts=lensShape.getPoints(64).map(p=>new THREE.Vector3(p.x,p.y,0));
    rimPts.push(rimPts[0].clone());
    const rimCurve=new THREE.CatmullRomCurve3(rimPts,true);
    const rimGeo=new THREE.TubeGeometry(rimCurve,96,0.032,8,true);
    const leftRim=new THREE.Mesh(rimGeo,frameMat);
    leftRim.position.set(-0.46,-0.035,0);
    group.add(leftRim);
    const rightRim=leftRim.clone();
    rightRim.position.x=0.46;
    group.add(rightRim);

    // Detalhe âmbar inferior observado nas fotos do modelo piloto.
    const lowerTrimGeo=new THREE.TorusGeometry(0.29,0.020,8,48,Math.PI*0.92);
    const leftTrim=new THREE.Mesh(lowerTrimGeo,amberMat);
    leftTrim.scale.set(1.35,0.72,1);
    leftTrim.rotation.z=Math.PI*0.04;
    leftTrim.position.set(-0.46,-0.115,0.012);
    group.add(leftTrim);
    const rightTrim=leftTrim.clone();
    rightTrim.position.x=0.46;
    rightTrim.scale.x=-1.35;
    group.add(rightTrim);

    // Barra superior característica do modelo.
    const brow=new THREE.Mesh(new THREE.BoxGeometry(1.78,0.070,0.065),frameMat);
    brow.position.set(0,0.245,0.015);
    group.add(brow);

    const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.055,0.065),frameMat);
    bridge.position.set(0,0.07,0);
    group.add(bridge);

    const metalMat=new THREE.MeshStandardMaterial({color:0xd7d2c8,roughness:0.22,metalness:0.85});
    const hingeGeo=new THREE.BoxGeometry(0.10,0.055,0.09);
    const leftHinge=new THREE.Mesh(hingeGeo,frameMat);
    leftHinge.position.set(-0.88,0.10,-0.015);
    group.add(leftHinge);
    const rightHinge=leftHinge.clone();
    rightHinge.position.x=0.88;
    group.add(rightHinge);

    // Rebites metálicos frontais característicos.
    const rivetGeo=new THREE.BoxGeometry(0.075,0.028,0.018);
    const leftRivet=new THREE.Mesh(rivetGeo,metalMat);
    leftRivet.position.set(-0.80,0.18,0.055);
    group.add(leftRivet);
    const rightRivet=leftRivet.clone();
    rightRivet.position.x=0.80;
    group.add(rightRivet);

    const templeGeo=new THREE.BoxGeometry(0.055,0.055,1.42);
    this.leftTemple=new THREE.Mesh(templeGeo,frameMat);
    this.leftTemple.position.set(-0.88,0.10,-0.74);
    this.leftTemple.rotation.x=-0.025;
    group.add(this.leftTemple);
    this.rightTemple=this.leftTemple.clone();
    this.rightTemple.position.x=0.88;
    group.add(this.rightTemple);

    this.fallback=group;
    this.modelRoot.add(group);
  }

  setModelCalibration(calibration={}){
    this.modelCalibration={
      scale:calibration.scale ?? 1,
      position:calibration.position ?? [0,0,0],
      rotation:calibration.rotation ?? [0,0,0],
    };
    this.applyModelCalibration();
  }

  applyModelCalibration(){
    if(!this.model) return;
    const c=this.modelCalibration;
    this.modelRoot.position.set(...c.position);
    this.modelRoot.rotation.set(...c.rotation);
    this.modelRoot.scale.setScalar(c.scale);
  }

  async loadModel(url,calibration={}){
    const token=++this.assetToken;
    try{
      this.clearPhotoAsset();
      const gltf=await this.loader.loadAsync(url);
      if(token!==this.assetToken){
        gltf.scene?.traverse?.(node=>{
          node.geometry?.dispose?.();
          if(Array.isArray(node.material)) node.material.forEach(mat=>{mat?.map?.dispose?.();mat?.dispose?.();});
          else {node.material?.map?.dispose?.();node.material?.dispose?.();}
        });
        return false;
      }
      const model=gltf.scene;
      model.updateMatrixWorld(true);

      // Centraliza e normaliza qualquer GLB/GLTF para a mesma unidade lógica
      // usada pelo tracking. Assim modelos de fornecedores diferentes podem
      // compartilhar a mesma calibração facial.
      const box=new THREE.Box3().setFromObject(model);
      const size=new THREE.Vector3();
      const center=new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      model.position.sub(center);
      const width=Math.max(size.x,0.0001);
      model.scale.setScalar(1.66/width);

      this.modelRoot.add(model);
      this.model=model;
      this.setModelCalibration(calibration);
      this.fallback.visible=false;
      this.usingExternalModel=true;
      return true;
    }catch(error){
      console.warn("GLB/GLTF não carregado; usando armação procedural.",error);
      this.fallback.visible=true;
      this.usingExternalModel=false;
      return false;
    }
  }

  resize(width,height){
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width,height,false);
    const aspect=width/height;
    this.camera.left=-aspect;
    this.camera.right=aspect;
    this.camera.top=1;
    this.camera.bottom=-1;
    this.camera.updateProjectionMatrix();
  }

  setPose(target){
    const width=this.canvas.width||1;
    const height=this.canvas.height||1;
    const aspect=width/height;
    const next=solveFrontPose({...target,aspect});
    this.templePose=target.templeAnchors||this.templePose;
    this.earPose=target.earAnchors||this.earPose;

    this.pose=smoothPose(this.pose,next,.42);

    this.root.position.set(this.pose.x,this.pose.y,0);
    this.root.scale.setScalar(this.pose.scale);
    // Um único offset óptico global, proporcional à largura facial. Não varia
    // com yaw/pitch e portanto não cria regressão vertical durante o giro.
    this.modelRoot.position.y=0.015;

    // A foto 2D não contém informação real da lateral. Limitamos a rotação
    // para evitar deformação excessiva em ângulos grandes e usamos a curvatura
    // apenas como pista de profundidade.
    const rawImageYaw=Math.abs(this.pose.yaw)<0.10 ? 0 : this.pose.yaw;
    const imageYaw=Math.max(-0.48,Math.min(0.48,rawImageYaw));
    // Ativos derivados de uma única foto frontal não possuem a geometria das
    // hastes. Mantemos apenas uma rotação visual discreta para preservar o
    // encaixe na ponte e evitar que a frente "descole" do rosto.
    // No modo fotográfico a frente permanece ancorada aos olhos. A sensação
    // lateral vem das hastes e da curvatura do asset, não de girar o plano todo.
    const visualYaw=this.usingExternalModel && this.imageFrame ? 0 : this.pose.yaw*0.50;
    const visualPitch=this.usingExternalModel && this.imageFrame ? 0 : this.pose.pitch*0.62;
    this.root.rotation.set(visualPitch,visualYaw,this.pose.roll);

    if(this.usingExternalModel && this.imageFrame){
      // Modo frontal: não desenha hastes nem tenta reconstruir lateral 3D.
      // A frente permanece ancorada aos olhos até a captura ser congelada.
      this.imageFrame.position.x=this.imageFrameBaseX;
    }

    if(!this.usingExternalModel){
      const templeToe=0.075;
      this.leftTemple.rotation.y=-templeToe;
      this.rightTemple.rotation.y=templeToe;
    }
    this.root.visible=true;
  }

  hide(){
    this.root.visible=false;
    this.pose=null;
    this.templePose=null;
    this.earPose=null;
    if(this.imageTemples){
      this.imageTemples.left.visible=false;
      this.imageTemples.right.visible=false;
    }
    this.templeSide=0;
    this.templeSideCandidate=0;
    this.templeSideFrames=0;
  }

  render(){this.renderer.render(this.scene,this.camera)}
}
