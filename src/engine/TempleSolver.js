export function solveTemple2D({
  side, hingeX, hingeY, frameWidth, amount,
  templeX, earX
}){
  const sx=side;
  const templeToEarX=earX-templeX;
  const projectedEarX=earX+templeToEarX*.92;
  const minReach=frameWidth*(.235+.09*amount);
  const directionalReach=Math.abs(projectedEarX-hingeX);
  const endX=directionalReach<minReach ? hingeX-sx*minReach : projectedEarX;
  const rearZ=-frameWidth*(.14+.14*amount);
  return {
    endX,
    endY:hingeY,
    rearZ,
    points:[
      [hingeX,hingeY,.012],
      [hingeX+(endX-hingeX)*.34,hingeY,-frameWidth*.025],
      [hingeX+(endX-hingeX)*.76,hingeY,rearZ*.48],
      [endX,hingeY,rearZ]
    ]
  };
}
