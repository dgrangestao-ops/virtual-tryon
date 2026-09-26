const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function validateAssetGeometry(geometry){
  if(!geometry) return false;
  const values=[geometry.hingeLeftX,geometry.hingeRightX,geometry.opticalCenterY];
  return values.every(Number.isFinite) &&
    geometry.hingeLeftX>=0 && geometry.hingeLeftX<.20 &&
    geometry.hingeRightX>.80 && geometry.hingeRightX<=1 &&
    geometry.hingeRightX-geometry.hingeLeftX>.70 &&
    geometry.opticalCenterY>=0 && geometry.opticalCenterY<=1;
}

export function normalizeAssetGeometry(geometry){
  if(!validateAssetGeometry(geometry)){
    return {hingeLeftX:.015,hingeRightX:.985,opticalCenterY:.12};
  }
  // Evita que 1–2 pixels residuais de segmentação levem a dobradiça para
  // fora do corpo visual da armação. O limite continua sendo automático e
  // independente de calibração manual por SKU.
  return {
    hingeLeftX:clamp(geometry.hingeLeftX,.008,.08),
    hingeRightX:clamp(geometry.hingeRightX,.92,.992),
    opticalCenterY:clamp(geometry.opticalCenterY,.04,.32)
  };
}
