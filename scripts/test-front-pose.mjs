import assert from "node:assert/strict";
import {solveFrontPose,smoothPose,createStableFaceScale,solveStableFaceScale} from "../src/engine/FramePoseSolver.js";

const base={x:.5,y:.42,scale:.31,roll:0,yaw:0,pitch:0,aspect:1.25};
const front=solveFrontPose(base);
const expectedScale=((base.scale*2*base.aspect)/1.66)*.84;
assert.ok(Math.abs(front.x-0)<1e-12,"front x contract changed");
assert.ok(Math.abs(front.y-0.16)<1e-12,"front y contract changed");
assert.ok(Math.abs(front.scale-expectedScale)<1e-12,"front scale coefficient changed");
assert.equal(front.yaw,0,"front yaw contract changed");
assert.equal(front.pitch,0,"front pitch contract changed");
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
const micro=smoothPose(front,{...front,x:front.x+.0008,y:front.y-.0008,scale:front.scale+.0005,roll:front.roll+.001},.42);
assert.equal(micro.x,front.x,"micro x jitter must be ignored");
assert.equal(micro.y,front.y,"micro y jitter must be ignored");
assert.equal(micro.scale,front.scale,"micro scale jitter must be ignored");
assert.equal(micro.roll,front.roll,"micro roll jitter must be ignored");
console.log("✓ front pose invariants");

// Limite matemático por atualização: medição é limitada a ±6% do estado e
// alpha máximo é .16 frontal / .025 em giro máximo. Assim nenhuma amostra
// isolada pode causar salto visual maior que .96% frontal ou .15% em 3/4.
const frontalState={value:.40};
const frontalStep=solveStableFaceScale(frontalState,{rawFaceWidth:.10,eyeDistance:.05,yaw:0});
assert.ok(Math.abs(frontalStep/.40-1)<=.0096000001,"frontal scale step exceeded 0.96%");
const turnState={value:.40};
const turnStep=solveStableFaceScale(turnState,{rawFaceWidth:.10,eyeDistance:.05,yaw:.48});
assert.ok(Math.abs(turnStep/.40-1)<=.0015000001,"3/4 scale step exceeded 0.15%");

const scaleState=createStableFaceScale();
const neutral=solveStableFaceScale(scaleState,{rawFaceWidth:.40,eyeDistance:.16,yaw:0});
let turned=neutral;
for(let i=0;i<30;i++) turned=solveStableFaceScale(scaleState,{rawFaceWidth:.31,eyeDistance:.145,yaw:.42});
assert.ok(Number.isFinite(turned) && turned>0,"3/4 scale must remain valid");
const before=Math.abs(turned-neutral);
const oneNeutral=solveStableFaceScale(scaleState,{rawFaceWidth:.40,eyeDistance:.16,yaw:0});
assert.ok(Number.isFinite(oneNeutral) && Math.abs(oneNeutral-neutral)<=before+.001,"neutral update must remain bounded");
console.log("✓ face scale invariants");
