import * as THREE from "three";

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

    const frameMat=new THREE.MeshStandardMaterial({
      color:0x171311,roughness:0.28,metalness:0.12
    });
    const lensMat=new THREE.MeshPhysicalMaterial({
      color:0xdde8ee,transparent:true,opacity:0.16,
      roughness:0.05,metalness:0,depthWrite:false
    });

    // Frente: proporção mais próxima de uma armação real.
    const rimGeo=new THREE.TorusGeometry(0.36,0.027,12,56);
    const leftRim=new THREE.Mesh(rimGeo,frameMat);
    leftRim.scale.set(1.18,0.72,1);
    leftRim.position.x=-0.43;
    this.root.add(leftRim);

    const rightRim=leftRim.clone();
    rightRim.position.x=0.43;
    this.root.add(rightRim);

    // Lentes transparentes provisórias para leitura de profundidade.
    const lensGeo=new THREE.CircleGeometry(0.335,48);
    const leftLens=new THREE.Mesh(lensGeo,lensMat);
    leftLens.scale.set(1.18,0.72,1);
    leftLens.position.set(-0.43,0,-0.018);
    this.root.add(leftLens);
    const rightLens=leftLens.clone();
    rightLens.position.x=0.43;
    this.root.add(rightLens);

    // Ponte e pequenos conectores nas dobradiças.
    const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.20,0.045,0.055),frameMat);
    bridge.position.set(0,0.025,0);
    this.root.add(bridge);

    const hingeGeo=new THREE.BoxGeometry(0.10,0.055,0.09);
    const leftHinge=new THREE.Mesh(hingeGeo,frameMat);
    leftHinge.position.set(-0.83,0.02,-0.015);
    this.root.add(leftHinge);
    const rightHinge=leftHinge.clone();
    rightHinge.position.x=0.83;
    this.root.add(rightHinge);

    // Hastes conectadas fisicamente às dobradiças e avançando para trás.
    const templeGeo=new THREE.BoxGeometry(0.055,0.055,1.42);
    const leftTemple=new THREE.Mesh(templeGeo,frameMat);
    leftTemple.position.set(-0.83,0.02,-0.74);
    leftTemple.rotation.x=-0.025;
    this.root.add(leftTemple);
    const rightTemple=leftTemple.clone();
    rightTemple.position.x=0.83;
    this.root.add(rightTemple);

    // Guardamos as hastes para ajustar abertura conforme a rotação da cabeça.
    this.leftTemple=leftTemple;
    this.rightTemple=rightTemple;

    this.scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2.2));
    this.root.visible=false;

    // Suavização evita vibração sem introduzir atraso perceptível.
    this.pose=null;
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
      this.pose[key]+= (next[key]-this.pose[key])*a;
    }

    this.root.position.set(this.pose.x,this.pose.y,0);
    this.root.scale.setScalar(this.pose.scale);
    // A matriz do MediaPipe fornece a pose, mas o modelo procedural precisa
    // de uma resposta visual menos agressiva para não "abrir" a frente.
    const visualYaw=this.pose.yaw*0.60;
    const visualPitch=this.pose.pitch*0.68;
    this.root.rotation.set(visualPitch,visualYaw,this.pose.roll);

    // As hastes permanecem ligadas às dobradiças e convergem levemente
    // para trás, aproximando o encaixe nas laterais da cabeça.
    const templeToe=0.075;
    this.leftTemple.rotation.y=-templeToe;
    this.rightTemple.rotation.y=templeToe;
    this.root.visible=true;
  }

  hide(){
    this.root.visible=false;
    this.pose=null;
  }

  render(){this.renderer.render(this.scene,this.camera)}
}
