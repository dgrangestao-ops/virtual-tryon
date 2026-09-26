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
 ["camera switch acquires replacement before stopping current",t.indexOf("await navigator.mediaDevices.getUserMedia")<t.indexOf("this.stopCamera();",t.indexOf("async startCamera"))],
 ["camera stop clears stale visual state",t.includes("this.faceSeenAt=0;") && t.includes("this.video.srcObject=null;") && t.includes("this.glasses3d.hide();")],
 ["optical fit uses neutral low offset",g.includes("this.modelRoot.position.y=0.015;")],
 ["temple landmarks are forwarded",t.includes("templeAnchors") && t.includes("left:{x:leftTemple.x") && t.includes("right:{x:rightTemple.x")],
 ["ear landmarks are forwarded",t.includes("face[127]") && t.includes("face[356]") && t.includes("earAnchors")],
 ["temples are a separate face-anchored layer",g.includes("const anchor=this.templePose?.") && g.includes("const localX=(anchorWorldX-this.pose.x)")],
 ["temples use per-SKU hinge metadata",g.includes("geom?.hingeLeftX") && g.includes("geom?.hingeRightX") && g.includes("const hingeX=(hingeNorm-.5)*this.imageFrameWidth;")],
 ["asset geometry is normalized before render",g.includes('normalizeAssetGeometry') && g.includes("this.imageAssetGeometry=normalizeAssetGeometry(asset.geometry);")],
 ["photo asset cleanup is centralized",g.includes("clearPhotoAsset(){") && (g.match(/this\.clearPhotoAsset\(\);/g)||[]).length>=2],
 ["async asset loads have generation guard",g.includes("this.assetToken=0;") && (g.match(/\+\+this\.assetToken/g)||[]).length>=2 && g.includes("token!==this.assetToken")],
 ["stale GLB load disposes GPU resources",g.includes("if(token!==this.assetToken){") && g.includes("node.material?.map?.dispose?.()")],
 ["photo cleanup resets SKU state",g.includes("this.imageAssetGeometry=null;") && g.includes("this.imageFrameWidth=0;") && g.includes("this.imageFrameHeight=0;")],
 ["SKU geometry does not move face anchor",g.includes("hinge remains tied to") && g.includes("const hingeY=this.imageFrameHeight*.12;")],
 ["temples use detected ear direction",g.includes("const earAnchor=this.earPose?.") && g.includes("const detectedEarX=")],
 ["temples use isolated solver",g.includes('solveTemple2D, templeVisibility, exposedTempleSide') && g.includes("const solvedTemple=solveTemple2D({")],
 ["temple visibility and side use solver",g.includes("const amount=templeVisibility(imageYaw);") && g.includes("const requestedSide=exposedTempleSide(imageYaw);")],
 ["temple side has temporal hysteresis",g.includes("this.templeSideFrames>=3") && g.includes("const side=this.templeSide;")],
 ["temple side resets when hidden",g.includes("this.templeSideCandidate=0;") && g.includes("this.templeSideFrames=0;")],
 ["face loss clears lateral anchors",g.includes("this.templePose=null;") && g.includes("this.earPose=null;") && g.includes("this.imageTemples.left.visible=false;")],
 ["temples reach solver target",g.includes("const earX=solvedTemple.endX;") && g.includes("solvedTemple.points.map(([x,y,z])")],
 ["temple has no artificial tip segment",!g.includes("const tipX=") && !g.includes("const tipY=") && !g.includes("const tipZ=")],
 ["temple geometry comes only from solver",g.includes("solvedTemple.points.map(([x,y,z])=>new THREE.Vector3(x,y,z))")],
 ["temple endpoint has no legacy Y override",!g.includes("const earY=") && !g.includes("const rearZ=")],
 ["photo temple occluders stay disabled",g.includes("this.templeOccluders.left.visible=false;") && g.includes("this.templeOccluders.right.visible=false;")],
 ["temple material is instance state",g.includes("this.templeMaterial=new THREE.MeshPhysicalMaterial") && g.includes("this.templeMaterial.clone()")],
 ["stable face scale solver is used",t.includes("solveStableFaceScale(this.faceScaleState") && t.includes("createStableFaceScale()")],
 ["face scale resets with camera",t.includes("this.faceScaleState=createStableFaceScale();")]
]
let fail=false;
for(const [name,ok] of checks){console.log(`${ok?"✓":"✗"} ${name}`);if(!ok)fail=true;}
if(fail)process.exit(1);
