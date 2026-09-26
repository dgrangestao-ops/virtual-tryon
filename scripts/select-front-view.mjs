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
async function makeTryOnAsset(source,out){
  const img=sharp(source).resize({width:1200,withoutEnlargement:true}).ensureAlpha();
  const {data,info}=await img.raw().toBuffer({resolveWithObject:true});
  const {width:w,height:h}=info;
  const samples=[];
  const step=Math.max(1,Math.floor(Math.min(w,h)/60));
  const px=(x,y)=>{const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2]];};
  for(let x=0;x<w;x+=step){samples.push(px(x,0),px(x,h-1));}
  for(let y=0;y<h;y+=step){samples.push(px(0,y),px(w-1,y));}
  const bg=[0,1,2].map(k=>samples.reduce((a,p)=>a+p[k],0)/samples.length);
  const mask=new Uint8Array(w*h); const spans=[];
  for(let y=0;y<h;y++){
    let lo=w,hi=-1,count=0;
    for(let x=0;x<w;x++){
      const i=(y*w+x)*4,d=Math.hypot(data[i]-bg[0],data[i+1]-bg[1],data[i+2]-bg[2]);
      if(d>48){mask[y*w+x]=1;lo=Math.min(lo,x);hi=Math.max(hi,x);count++;}
    }
    spans[y]={lo,hi,count,span:hi>=lo?hi-lo+1:0};
  }
  const peak=Math.max(...spans.map(r=>r.span));
  // Detecta a frente pela primeira faixa horizontal sustentada. Hastes abertas
  // podem ter grande largura entre as pontas, mas poucos pixels por linha; por
  // isso exigimos simultaneamente largura e densidade durante várias linhas.
  let frontTop=0;
  const minSpan=peak*.62, minDensity=.30;
  const sustained=Math.max(3,Math.round(h*.012));
  outer: for(let y=0;y<h-sustained;y++){
    for(let k=0;k<sustained;k++){
      const r=spans[y+k];
      if(r.span<minSpan || r.count/Math.max(1,r.span)<minDensity) continue outer;
    }
    frontTop=y; break;
  }
  // Pequena margem para não cortar a borda superior real da armação.
  frontTop=Math.max(0,frontTop-Math.round(h*.006));
  const feather=Math.max(2,Math.round(h*.006));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4;
    const d=Math.hypot(data[i]-bg[0],data[i+1]-bg[1],data[i+2]-bg[2]);
    let a=Math.max(0,Math.min(255,(d-30)*7));
    if(y<frontTop) a=0;
    else if(y<frontTop+feather) a=Math.round(a*(y-frontTop)/feather);
    data[i+3]=a;
  }
  await sharp(data,{raw:{width:w,height:h,channels:4}}).trim({background:{r:0,g:0,b:0,alpha:0}}).png().toFile(out);
  const meta=await sharp(out).metadata();
  return {frontTop,aspect:meta.width/meta.height,width:meta.width,height:meta.height};
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
  const assetPath=`public/products/${p.sku}/asset.png`;
  const asset=await makeTryOnAsset(best.target,assetPath);
  await writeFile(`public/products/${p.sku}/selection.json`,JSON.stringify({selected:best,asset,ranked},null,2));
  console.log(`✓ ${p.sku}: frontal=${best.target} score=${best.metrics.score.toFixed(1)}`);
}
