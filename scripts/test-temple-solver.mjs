import assert from "node:assert/strict";
import {solveTemple2D} from "../src/engine/TempleSolver.js";
for(const side of [-1,1]){
 const hingeX=side*.86;
 const r=solveTemple2D({side,hingeX,hingeY:.12,frameWidth:1.78,amount:.8,templeX:side*.92,earX:side*1.08});
 assert.equal(r.points.length,4);
 assert.ok(Math.abs(r.endX-hingeX)>=1.78*(.235+.09*.8)-1e-9);
 assert.ok(r.points.every(p=>p[1]===.12),"visible temple must be horizontal");
 assert.equal(r.points[0][0],hingeX);
 assert.equal(r.points.at(-1)[0],r.endX);
 assert.ok(r.points.at(-1)[2]<r.points[0][2],"terminal must recede in depth");
}
const left=solveTemple2D({side:-1,hingeX:-.86,hingeY:.12,frameWidth:1.78,amount:.8,templeX:-.92,earX:-1.08});
const right=solveTemple2D({side:1,hingeX:.86,hingeY:.12,frameWidth:1.78,amount:.8,templeX:.92,earX:1.08});
assert.ok(Math.abs(left.endX+right.endX)<1e-9,"left/right must be symmetric");
console.log("✓ temple solver geometry invariants");
