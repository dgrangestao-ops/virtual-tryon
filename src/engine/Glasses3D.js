import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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
  }

  setImageFrame(asset, calibration={}){
    if(this.imageFrame){
      this.modelRoot.remove(this.imageFrame);
      this.imageFrame.material?.map?.dispose();
      this.imageFrame.material?.dispose();
      this.imageFrame.geometry?.dispose();
    }
    const texture=new THREE.TextureLoader().load(asset.url,()=>this.render());
    texture.colorSpace=THREE.SRGBColorSpace;
    const width=1.78*(calibration.scale||1);
    const height=width/Math.max(asset.aspect||2.2,1.2);
    const material=new THREE.MeshBasicMaterial({
      map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide
    });
    this.imageFrame=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    const pos=calibration.position||[0,0,0];
    this.imageFrame.position.set(pos[0]||0,0.015+(pos[1]||0),0.055+(pos[2]||0));
    this.imageFrame.userData.aspect=asset.aspect||2.2;
    this.modelRoot.add(this.imageFrame);
    this.fallback.visible=false;
    this.leftTemple.visible=false;
    this.rightTemple.visible=false;
    this.usingExternalModel=true;
    this.model=null;
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
    try{
      const gltf=await this.loader.loadAsync(url);
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
    const next={
      x:(target.x*2-1)*aspect,
      // Sobe levemente a armação: o centro geométrico dos olhos não coincide
      // com o centro óptico deste modelo Fremi mais alto na sobrancelha.
      y:-(target.y*2-1)+0.018,
      scale:((target.scale*2*aspect)/1.66)*0.89,
      roll:target.roll||0,
      yaw:target.yaw||0,
      pitch:target.pitch||0
    };

    if(!this.pose) this.pose={...next};
    const a=0.42;
    for(const key of Object.keys(next)){
      this.pose[key]+=(next[key]-this.pose[key])*a;
    }

    this.root.position.set(this.pose.x,this.pose.y,0);
    this.root.scale.setScalar(this.pose.scale);

    const visualYaw=this.usingExternalModel && this.imageFrame ? this.pose.yaw*0.34 : this.pose.yaw*0.50;
    const visualPitch=this.usingExternalModel && this.imageFrame ? this.pose.pitch*0.42 : this.pose.pitch*0.62;
    this.root.rotation.set(visualPitch,visualYaw,this.pose.roll);

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
  }

  render(){this.renderer.render(this.scene,this.camera)}
}
