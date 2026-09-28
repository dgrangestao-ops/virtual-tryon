const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

/**
 * Converte a última pose facial normalizada na geometria da armação
 * usada pela fotografia congelada. Mantém a captura independente do WebGL.
 */
export function solveCaptureFrame({pose,stageWidth,stageHeight,meshWidth=1.78,imageAspect=2.2,mirror=false}){
  if(!pose||!stageWidth||!stageHeight) return null;
  const stageAspect=stageWidth/stageHeight;
  const rootScale=((pose.scale*2*stageAspect)/1.66)*.90;
  const frameW=(rootScale*meshWidth)*(stageWidth/(2*stageAspect));
  const frameH=frameW/Math.max(imageAspect,1.2);
  let centerX=clamp(pose.centerX,0,1)*stageWidth;
  if(mirror) centerX=stageWidth-centerX;
  return {
    centerX,
    centerY:clamp(pose.centerY,0,1)*stageHeight+frameH*.06,
    width:frameW,
    height:frameH,
    rotation:mirror?-(pose.roll||0):(pose.roll||0)
  };
}
