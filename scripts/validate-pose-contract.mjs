// Regression checks for the photo-based 2.5D pose contract.
// These checks deliberately protect invariants that must not change per SKU.
import {readFile} from "node:fs/promises";
const g=await readFile("src/engine/Glasses3D.js","utf8");
const t=await readFile("src/engine/TryOnEngine.js","utf8");
const checks=[
 ["tracking anchor has no visual Y offset",/const centerY=\(leftEye\.y\+rightEye\.y\)\/2;/.test(t)],
 ["photo front yaw is fixed",/const visualYaw=this\.usingExternalModel && this\.imageFrame \? 0 :/.test(g)],
 ["photo front pitch is fixed",/const visualPitch=this\.usingExternalModel && this\.imageFrame \? 0 :/.test(g)],
 ["photo front has no yaw parallax",g.includes("this.imageFrame.position.x=this.imageFrameBaseX;")],
 ["frontal yaw dead-zone exists",g.includes("Math.abs(this.pose.yaw)<0.10 ? 0")],
 ["front pose uses isolated solver",g.includes('solveFrontPose, smoothPose') && g.includes("const next=solveFrontPose({...target,aspect});")],
 ["front smoothing uses isolated solver",g.includes("this.pose=smoothPose(this.pose,next,.42);")],
 ["tracking tolerates isolated missed frames",t.includes("this.missedFaceFrames<=4") && t.includes("this.missedFaceFrames=0;")],
 ["camera loop has generation guard",t.includes("const token=++this.loopToken;") && t.includes("token!==this.loopToken") && t.includes("this.loopToken++;")],
 ["camera switch acquires replacement before stopping current",t.indexOf("await navigator.mediaDevices.getUserMedia")<t.indexOf("this.stopCamera({invalidateRequest:false});",t.indexOf("async startCamera"))],
 ["camera requests have generation guard",t.includes("const requestToken=++this.cameraRequestToken;") && t.includes("requestToken!==this.cameraRequestToken") && t.includes("stopCamera({invalidateRequest=true}={})")],
 ["failed camera startup releases acquired stream",t.includes("if(this.stream===stream) this.stream=null;") && t.includes("if(this.video.srcObject===stream) this.video.srcObject=null;")],
 ["camera stop clears stale visual state",t.includes("this.faceSeenAt=0;") && t.includes("this.video.srcObject=null;") && t.includes("this.glasses3d.hide();")],
 ["optical fit uses neutral low offset",g.includes("this.modelRoot.position.y=0.015;")],
 ["photo MVP has no synthetic temples",!g.includes("solveTemple2D") && g.includes("this.imageTemples=null;")],
 ["photo front remains face anchored",g.includes("this.imageFrame.position.x=this.imageFrameBaseX;")],
 ["stable face scale solver is used",t.includes("solveStableFaceScale(this.faceScaleState") && t.includes("createStableFaceScale()")],
 ["face scale resets with camera",t.includes("this.faceScaleState=createStableFaceScale();")]
]
let fail=false;
for(const [name,ok] of checks){console.log(`${ok?"✓":"✗"} ${name}`);if(!ok)fail=true;}
if(fail)process.exit(1);
