import { readFile, writeFile, copyFile } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const manifestPath=process.argv[2]||"catalog/fremi.json";
const manifest=JSON.parse(await readFile(manifestPath,"utf8"));

async function silhouetteScore(path){
  const {data,info}=await sharp(path).resize({width:420,height:420,fit:"inside"}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h,channels:c}=info;
  const border=[];
  const add=(x,y)=>{const i=(y*w+x)*c;border.push([data[i],data[i+1],data[i+2]]);};
  const step=Math.max(1,Math.floor(Math.min(w,h)/50));
  for(let x=0;x<w;x+=step){add(x,0);add(x,h-1);}
  for(let y=0;y<h;y+=step){add(0,y);add(w-1,y);}
  const bg=[0,1,2].map(k=>border.reduce((a,p)=>a+p[k],0)/border.length);
  const mask=new Uint8Array(w*h);
  let minX=w,maxX=0,minY=h,maxY=0,n=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*c,d=Math.hypot(data[i]-bg[0],data[i+1]-bg[1],data[i+2]-bg[2]);
    if(d>52){mask[y*w+x]=1;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);n++;}
  }
  if(n<w*h*.002) return {score:-999};
  const bw=maxX-minX+1,bh=maxY-minY+1,aspect=bw/bh;
  let diff=0,pairs=0;
  for(let y=minY;y<=maxY;y++)for(let dx=0;dx<Math.floor(bw/2);dx++){
    const a=mask[y*w+minX+dx],b=mask[y*w+maxX-dx];diff+=a!==b;pairs++;
  }
  const symmetry=1-diff/Math.max(1,pairs);
  // Óculos frontais são largos, aproximadamente simétricos e ocupam o centro.
  const centerX=(minX+maxX)/2/w;
  const centered=1-Math.min(1,Math.abs(centerX-.5)*2);
  const occupancy=n/(bw*bh);
  // Penaliza silhuetas excessivamente largas: em óculos isso costuma indicar
  // hastes abertas/projetadas, não a frente limpa desejada pelo provador.
  const frontalAspect=Math.max(0,1-Math.abs(aspect-2.05)/1.25);
  const score=symmetry*52+frontalAspect*28+centered*12+Math.min(1,occupancy/.35)*8;
  return {score,symmetry,aspect,centered,occupancy};
}
for(const p of manifest.products||[]){
  const galleryPath=`public/products/${p.sku}/gallery.json`;
  let gallery; try{gallery=JSON.parse(await readFile(galleryPath,"utf8"));}catch{continue;}
  const ranked=[];
  for(const item of gallery){
    try{ranked.push({...item,metrics:await silhouetteScore(item.target)});}catch(e){console.warn(p.sku,item.target,e.message);}
  }
  ranked.sort((a,b)=>b.metrics.score-a.metrics.score);
  if(!ranked.length) continue;
  const best=ranked[0];
  await copyFile(best.target,"public"+p.localSourceUrl);
  await writeFile(`public/products/${p.sku}/selection.json`,JSON.stringify({selected:best,ranked},null,2));
  console.log(`✓ ${p.sku}: frontal=${best.target} score=${best.metrics.score.toFixed(1)}`);
}
