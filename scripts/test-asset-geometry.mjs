import assert from "node:assert/strict";
import {validateAssetGeometry,normalizeAssetGeometry} from "../src/engine/AssetGeometry.js";

const generated98={hingeLeftX:0,hingeRightX:.9982394366,opticalCenterY:.120603};
assert.equal(validateAssetGeometry(generated98),true);
const a=normalizeAssetGeometry(generated98);
assert.equal(a.hingeLeftX,.008);
assert.equal(a.hingeRightX,.992);
assert.ok(a.opticalCenterY>.12 && a.opticalCenterY<.121);

const generatedQ7={hingeLeftX:0,hingeRightX:.9976958525,opticalCenterY:.0878378};
const b=normalizeAssetGeometry(generatedQ7);
assert.equal(b.hingeLeftX,.008);
assert.equal(b.hingeRightX,.992);

const fallback=normalizeAssetGeometry(null);
assert.deepEqual(fallback,{hingeLeftX:.015,hingeRightX:.985,opticalCenterY:.12});
assert.equal(validateAssetGeometry({hingeLeftX:.4,hingeRightX:.6,opticalCenterY:.1}),false);
assert.equal(validateAssetGeometry({hingeLeftX:NaN,hingeRightX:.99,opticalCenterY:.1}),false);
console.log("✓ asset geometry normalization invariants");
