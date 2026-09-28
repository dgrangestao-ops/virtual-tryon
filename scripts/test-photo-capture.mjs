import assert from "node:assert/strict";
import {solveCaptureFrame} from "../src/engine/PhotoCaptureSolver.js";

const base=solveCaptureFrame({
  pose:{centerX:.5,centerY:.42,scale:.42,roll:.04},
  stageWidth:800,stageHeight:600,meshWidth:1.78,imageAspect:2.85
});
assert(base,"pose deve ser resolvida");
assert.equal(base.centerX,400,"rosto central permanece central");
assert(base.width>300 && base.width<500,"largura permanece proporcional ao rosto");
assert(base.centerY>252,"offset óptico fica abaixo da linha dos olhos");
assert.equal(base.rotation,.04,"roll é preservado");

const mirrored=solveCaptureFrame({
  pose:{centerX:.35,centerY:.42,scale:.42,roll:.04},
  stageWidth:800,stageHeight:600,meshWidth:1.78,imageAspect:2.85,mirror:true
});
assert.equal(mirrored.centerX,520,"espelhamento inverte X");
assert.equal(mirrored.rotation,-.04,"espelhamento inverte roll");

const larger=solveCaptureFrame({
  pose:{centerX:.5,centerY:.42,scale:.50,roll:0},
  stageWidth:800,stageHeight:600,meshWidth:1.78,imageAspect:2.85
});
assert(larger.width>base.width,"rosto maior produz armação maior");
console.log("✓ geometria da captura frontal validada");
