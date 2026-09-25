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

    const material=new THREE.MeshStandardMaterial({
      color:0x171311,roughness:0.35,metalness:0.08
    });

    const bridge=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.07,0.08),material);
    bridge.position.y=0.02;
    this.root.add(bridge);

    const rimGeometry=new THREE.TorusGeometry(0.36,0.035,10,40);
    const leftRim=new THREE.Mesh(rimGeometry,material);
    leftRim.scale.set(1.12,0.78,1);
    leftRim.position.x=-0.43;
    this.root.add(leftRim);

    const rightRim=leftRim.clone();
    rightRim.position.x=0.43;
    this.root.add(rightRim);

    const templeGeometry=new THREE.BoxGeometry(0.07,0.07,1.45);
    const leftTemple=new THREE.Mesh(templeGeometry,material);
    leftTemple.position.set(-0.79,0.03,-0.68);
    leftTemple.rotation.x=-0.035;
    this.root.add(leftTemple);

    const rightTemple=leftTemple.clone();
    rightTemple.position.x=0.79;
    this.root.add(rightTemple);

    this.scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2.2));
    this.root.visible=false;
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

  setPose({x,y,scale,roll=0,yaw=0,pitch=0}){
    const width=this.canvas.width||1;
    const height=this.canvas.height||1;
    const aspect=width/height;

    // x/y/scale chegam normalizados (0..1), no MESMO frame do vídeo.
    this.root.position.set(
      (x*2-1)*aspect,
      -(y*2-1),
      0
    );

    // largura local aproximada da frente = 1.66.
    const normalizedScale=(scale*2*aspect)/1.66;
    this.root.scale.setScalar(normalizedScale);
    this.root.rotation.set(pitch,yaw,roll);
    this.root.visible=true;
  }

  hide(){this.root.visible=false}
  render(){this.renderer.render(this.scene,this.camera)}
}
