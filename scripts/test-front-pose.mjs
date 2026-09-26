import assert from "node:assert/strict";
import {solveFrontPose,smoothPose,createStableFaceScale,solveStableFaceScale} from "../src/engine/FramePoseSolver.js";

const base={x:.5,y:.42,scale:.31,roll:0,yaw:0,pitch:0,aspect:1.25};
const front=solveFrontPose(base);
for(const yaw of [-.48,-.35,0,.35,.48]){
 const p=solveFrontPose({...base,yaw});
 assert.equal(p.y,front.y,"yaw must never move front vertically");
 assert.equal(p.x,front.x,"yaw must never move front horizontally");
 assert.equal(p.scale,front.scale,"yaw must never resize front");
}
for(const pitch of [-.35,0,.35]){
 const p=solveFrontPose({...base,pitch});
 assert.equal(p.y,front.y,"pitch must never move front anchor");
}
assert.equal(solveFrontPose({...base,roll:.02}).roll,0);
assert.ok(solveFrontPose({...base,roll:.10}).roll>0);
assert.ok(solveFrontPose({...base,roll:-.10}).roll<0);
const moved=solveFrontPose({...base,x:.6});
const sm=smoothPose(front,moved,.42);
assert.ok(sm.x>front.x && sm.x<moved.x);
assert.equal(sm.y,front.y);
console.log("✓ front pose invariants");

const scaleState=createStableFaceScale();
const neutral=solveStableFaceScale(scaleState,{rawFaceWidth:.40,eyeDistance:.16,yaw:0});
let turned=neutral;
for(let i=0;i<30;i++) turned=solveStableFaceScale(scaleState,{rawFaceWidth:.31,eyeDistance:.145,yaw:.42});
assert.ok(Math.abs(turned-neutral)/neutral<=.061,"3/4 must not shrink frame materially");
let recovered=turned;
for(let i=0;i<30;i++) recovered=solveStableFaceScale(scaleState,{rawFaceWidth:.40,eyeDistance:.16,yaw:0});
assert.ok(Math.abs(recovered-neutral)/neutral<.055,"neutral scale must recover smoothly");
console.log("✓ face scale invariants");
