import assert from "node:assert/strict";
import {solveTemple2D,templeVisibility,exposedTempleSide} from "../src/engine/TempleSolver.js";

assert.equal(exposedTempleSide(0),0);
assert.equal(exposedTempleSide(.09),0);
assert.equal(exposedTempleSide(.30),-1);
assert.equal(exposedTempleSide(-.30),1);
assert.equal(templeVisibility(0),0);
assert.ok(templeVisibility(.35)>.9);

for(const side of [-1,1]){
 const hingeX=side*.86;
 for(const amount of [0,.25,.5,.8,1]){
  const r=solveTemple2D({side,hingeX,hingeY:.12,frameWidth:1.78,amount,templeX:side*.92,earX:side*1.08});
  assert.equal(r.points.length,4);
  assert.ok(Math.abs(r.endX-hingeX)>=1.78*(.235+.09*amount)-1e-9);
  assert.ok(Math.abs(r.endX-hingeX)<=1.78*.52+1e-9);
  assert.ok(r.points.every(p=>p[1]===.12),"visible temple must be horizontal");
  assert.equal(r.points[0][0],hingeX);
  assert.equal(r.points.at(-1)[0],r.endX);
  assert.ok(r.points.at(-1)[2]<r.points[0][2],"terminal must recede in depth");
  assert.equal(Math.sign(r.endX-hingeX),-side,"temple must extend outward");
 }
}
// Landmark ruim/ocluído não pode inverter a haste.
for(const side of [-1,1]){
 const hingeX=side*.86;
 const r=solveTemple2D({side,hingeX,hingeY:.12,frameWidth:1.78,amount:1,templeX:-side*.2,earX:-side*.4});
 assert.equal(Math.sign(r.endX-hingeX),-side);
}
const left=solveTemple2D({side:-1,hingeX:-.86,hingeY:.12,frameWidth:1.78,amount:.8,templeX:-.92,earX:-1.08});
const right=solveTemple2D({side:1,hingeX:.86,hingeY:.12,frameWidth:1.78,amount:.8,templeX:.92,earX:1.08});
assert.ok(Math.abs(left.endX+right.endX)<1e-9,"left/right must be symmetric");
console.log("✓ temple solver geometry, visibility and robustness invariants");
