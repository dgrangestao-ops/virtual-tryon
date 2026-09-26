// Regression checks for the photo-based 2.5D pose contract.
// These checks deliberately protect invariants that must not change per SKU.
import {readFile} from "node:fs/promises";
const g=await readFile("src/engine/Glasses3D.js","utf8");
const t=await readFile("src/engine/TryOnEngine.js","utf8");
const checks=[
 ["tracking anchor has no visual Y offset",/const centerY=\(leftEye\.y\+rightEye\.y\)\/2;/.test(t)],
 ["photo front yaw is fixed",/const visualYaw=this\.usingExternalModel && this\.imageFrame \? 0 :/.test(g)],
 ["photo front pitch is fixed",/const visualPitch=this\.usingExternalModel && this\.imageFrame \? 0 :/.test(g)],
 ["photo front has no yaw parallax",/this\.imageFrame\.position\.x=this\.imageFrameBaseX;/.test(g)],
 ["frontal yaw dead-zone exists",/Math\.abs\(this\.pose\.yaw\)<0\.10 \? 0/.test(g)],
 ["frontal roll dead-zone exists",/Math\.abs\(target\.roll\|\|0\)<0\.035 \? 0/.test(g)],
 ["optical fit uses neutral low offset",/this\.modelRoot\.position\.y=0\.015;/.test(g)],
 ["temples are hidden near frontal",/Math\.abs\(imageYaw\)-\.07/.test(g)],
 ["temples start at hinge and extend rearward",g.includes("const hingeX=sx*this.imageFrameWidth*.485;") && g.includes("const z3=-this.imageFrameWidth*(.28+.12*amount);")],
 ["photo temples are not swallowed by occluders",g.includes("this.templeOccluders.left.visible=false;") && g.includes("this.templeOccluders.right.visible=false;")],
 ["temple material is instance state",/this\.templeMaterial=new THREE\.MeshPhysicalMaterial/.test(g) && /this\.templeMaterial\.clone\(\)/.test(g)],
 ["hybrid stable face scale exists",/const faceWidth=rawFaceWidth\*\.35\+eyeBasedWidth\*\.65;/.test(t)]
];
let fail=false;
for(const [name,ok] of checks){console.log(`${ok?"✓":"✗"} ${name}`);if(!ok)fail=true;}
if(fail)process.exit(1);
