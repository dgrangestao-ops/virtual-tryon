const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function solveFrontPose({x,y,scale,roll=0,yaw=0,pitch=0,aspect=1}){
  return {
    x:(x*2-1)*aspect,
    y:-(y*2-1),
    scale:((scale*2*aspect)/1.66)*.84,
    roll:Math.abs(roll)<.035?0:roll*.30,
    yaw,
    pitch
  };
}

export function smoothPose(previous,next,alpha=.42){
  if(!previous) return {...next};
  const out={...previous};
  for(const key of Object.keys(next)) out[key]=previous[key]+(next[key]-previous[key])*alpha;
  return out;
}

export function createStableFaceScale(){
  return {value:null};
}

export function solveStableFaceScale(state,{rawFaceWidth,eyeDistance,yaw=0}){
  const eyeBasedWidth=eyeDistance*2.05;
  const measured=rawFaceWidth*.35+eyeBasedWidth*.65;
  if(!state || state.value==null){
    if(state) state.value=measured;
    return measured;
  }
  // Em 3/4 a largura aparente da face e até a distância ocular sofrem
  // perspectiva. Congelamos quase toda essa variação durante o giro e só
  // permitimos adaptação mais rápida quando o rosto volta à região frontal.
  const turn=clamp(Math.abs(yaw)/.48,0,1);
  const alpha=.16*(1-turn)+.025*turn;
  const bounded=clamp(measured,state.value*.94,state.value*1.06);
  state.value+= (bounded-state.value)*alpha;
  return state.value;
}
