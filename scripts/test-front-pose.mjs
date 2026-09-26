import assert from "node:assert/strict";
import {solveFrontPose,smoothPose} from "../src/engine/FramePoseSolver.js";

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
