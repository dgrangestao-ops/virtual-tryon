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

    this.buildFallback();
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2.2));
    const key=new THREE.DirectionalLight(0xffffff,1.15);
    key.position.set(1.5,2,4);
    this.scene.add(key);

    // Oclusor facial invisível: escreve apenas no depth buffer.
    // A primeira versão usa uma superfície elíptica ajustada pelos landmarks;
    // depois pode ser substituída pela triangulação completa do Face Mesh.
    const occMat=new THREE.MeshBasicMaterial({
      colorWrite:false,
      depthWrite:true,
      depthTest:true,
      side:THREE.DoubleSide
    });
    this.occluder=new THREE.Mesh(
      new THREE.SphereGeometry(1,32,20,0,Math.PI*2,0,Math.PI*0.62),
      occMat
    );
    this.occluder.scale.set(0.72,0.92,0.48);
    this.occluder.position.z=-0.16;
    this.occluder.renderOrder=-1;
    this.root.add(this.occluder);

    this.root.visible=false;
    this.pose=null;
  }

  buildFallback(){
    const frameMat=new THREE.MeshStandardMaterial({
      color:0x171311,roughness:0.28,metalness:0.12
    });
    const lensMat=new THREE.MeshPhysicalMaterial({
      color:0xdde8ee,transparent:true,opacity:0.16,
      roughness:0.05,metalness:0,depthWrite:false
    });

    const group=new THREE.Group();
    group.name="procedural-fallback";

    const rimGeo=new THREE.TorusGeometry(0.36,0.027,12,56);
    const leftRim=new THREE.Mesh(rimGeo,frameMat);
    leftRim.scale.set(1.18,0.72,1);
    leftRim.position.x=-0.43;
    group.add(leftRim);
    const rightRim=leftRim.clone();
    rightRim.position.x=0.43;
    group.add(rightRim);

    const lensGeo=new THREE.CircleGeometry(0.335,48);
    const leftLens=new THREE.Mesh(lensGeo,lensMat);
    leftLens.scale.set(1.18,0.72,1);
    leftLens.position.set(-0.43,0,-0.018);
    group.add(leftLens);
    const rightLens=leftLens.clone();
    rightLens.position.x=0.43;
    group.add(rightLens);

    const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.20,0.045,0.055),frameMat);
    bridge.position.set(0,0.025,0);
    group.add(bridge);

    const hingeGeo=new THREE.BoxGeometry(0.10,0.055,0.09);
    const leftHinge=new THREE.Mesh(hingeGeo,frameMat);
    leftHinge.position.set(-0.83,0.02,-0.015);
    group.add(leftHinge);
    const rightHinge=leftHinge.clone();
    rightHinge.position.x=0.83;
    group.add(rightHinge);

    const templeGeo=new THREE.BoxGeometry(0.055,0.055,1.42);
    this.leftTemple=new THREE.Mesh(templeGeo,frameMat);
    this.leftTemple.position.set(-0.83,0.02,-0.74);
    this.leftTemple.rotation.x=-0.025;
    group.add(this.leftTemple);
    this.rightTemple=this.leftTemple.clone();
    this.rightTemple.position.x=0.83;
    group.add(this.rightTemple);

    this.fallback=group;
    this.modelRoot.add(group);
  }

  async loadModel(url){
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
      y:-(target.y*2-1),
      scale:(target.scale*2*aspect)/1.66,
      roll:target.roll||0,
      yaw:target.yaw||0,
      pitch:target.pitch||0
    };

    if(!this.pose) this.pose={...next};
    const a=0.38;
    for(const key of Object.keys(next)){
      this.pose[key]+=(next[key]-this.pose[key])*a;
    }

    this.root.position.set(this.pose.x,this.pose.y,0);
    this.root.scale.setScalar(this.pose.scale);

    const visualYaw=this.pose.yaw*0.60;
    const visualPitch=this.pose.pitch*0.68;
    this.root.rotation.set(visualPitch,visualYaw,this.pose.roll);

    // Mantém o oclusor alinhado à cabeça. Ele não aparece na imagem,
    // mas impede que partes traseiras das hastes atravessem visualmente
    // a superfície frontal/lateral da cabeça.
    this.occluder.visible=true;

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
