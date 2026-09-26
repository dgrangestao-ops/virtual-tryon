const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function templeVisibility(yaw){
  const abs=Math.abs(yaw||0);
  return clamp((abs-.10)/.22,0,1);
}

export function exposedTempleSide(yaw){
  if(Math.abs(yaw||0)<.10) return 0;
  return yaw>0 ? -1 : 1;
}

export function solveTemple2D({
  side, hingeX, hingeY, frameWidth, amount,
  templeX, earX
}){
  const sx=side;
  const safeAmount=clamp(amount||0,0,1);
  const templeToEarX=earX-templeX;
  const projectedEarX=earX+templeToEarX*.92;
  const minReach=frameWidth*(.235+.09*safeAmount);
  const maxReach=frameWidth*.52;
  let delta=projectedEarX-hingeX;

  // A haste sempre precisa caminhar para fora da dobradiça. Landmarks podem
  // cruzar por ruído/oclusão em ângulos extremos; nesses casos não aceitamos
  // inversão nem comprimentos absurdos.
  const expectedSign=-sx;
  if(Math.sign(delta)!==expectedSign) delta=expectedSign*minReach;
  delta=expectedSign*clamp(Math.abs(delta),minReach,maxReach);

  const endX=hingeX+delta;
  const rearZ=-frameWidth*(.12+.12*safeAmount);
  return {
    endX,
    endY:hingeY,
    rearZ,
    points:[
      [hingeX,hingeY,.012],
      [hingeX+delta*.34,hingeY,-frameWidth*.020],
      [hingeX+delta*.76,hingeY,rearZ*.45],
      [endX,hingeY,rearZ]
    ]
  };
}
