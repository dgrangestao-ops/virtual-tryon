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
