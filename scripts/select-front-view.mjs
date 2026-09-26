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
  // Mede protrusões acima da frente óptica. Em fotos com hastes abertas,
  // os braços formam dois arcos finos muito acima das lentes.
  const rows=[];
  for(let y=minY;y<=maxY;y++){
    let lo=w,hi=-1,count=0;
    for(let x=minX;x<=maxX;x++) if(mask[y*w+x]){lo=Math.min(lo,x);hi=Math.max(hi,x);count++;}
    rows.push({y,span:hi>=lo?hi-lo+1:0,count});
  }
  const peak=Math.max(...rows.map(r=>r.span));
  const sustained=Math.max(2,Math.round(bh*.025));
  let opticalTop=minY;
  outer: for(let i=0;i<rows.length-sustained;i++){
    for(let k=0;k<sustained;k++){
      const r=rows[i+k];
      if(r.span<peak*.60 || r.count/Math.max(1,r.span)<.30) continue outer;
    }
    opticalTop=rows[i].y; break;
  }
  let upper=0;
  for(let y=minY;y<opticalTop;y++) for(let x=minX;x<=maxX;x++) upper+=mask[y*w+x];
  const upperRatio=upper/Math.max(1,n);
  const protrusionPenalty=Math.min(32,upperRatio*180);
  const score=symmetry*48+frontalAspect*26+centered*10+Math.min(1,occupancy/.35)*8-protrusionPenalty;
  return {score,symmetry,aspect,centered,occupancy,upperRatio,opticalTop,protrusionPenalty};
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
  const peakCount=Math.max(...spans.map(r=>r.count));
  // A frente real concentra muito mais pixels escuros por linha que as hastes
  // abertas. Usamos contagem absoluta, não apenas distância entre pontas.
  let frontTop=0;
  const sustained=Math.max(4,Math.round(h*.015));
  outer: for(let y=0;y<h-sustained;y++){
    for(let k=0;k<sustained;k++){
      const r=spans[y+k];
      if(r.count<peakCount*.48 || r.span<peak*.50) continue outer;
    }
    frontTop=y; break;
  }
  // Margem mínima: evita reintroduzir a curva superior das hastes.
  frontTop=Math.max(0,frontTop-Math.round(h*.002));
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
  const {data:assetData,info:assetInfo}=await sharp(out).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Metadados geométricos normalizados usados pelo motor. São derivados do
  // próprio asset, portanto novos SKUs não exigem ajuste manual.
  let left=assetInfo.width,right=0,top=assetInfo.height,bottom=0;
  const rowMass=new Array(assetInfo.height).fill(0);
  for(let y=0;y<assetInfo.height;y++) for(let x=0;x<assetInfo.width;x++){
    const a=assetData[(y*assetInfo.width+x)*4+3];
    if(a>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);rowMass[y]++;}
  }
  const peakRow=Math.max(...rowMass);
  let opticalRow=Math.round((top+bottom)/2);
  for(let y=top;y<=bottom;y++) if(rowMass[y]>=peakRow*.72){opticalRow=y;break;}
  const geometry={
    hingeLeftX:left/assetInfo.width,
    hingeRightX:right/assetInfo.width,
    opticalCenterY:opticalRow/assetInfo.height,
    bbox:{left:left/assetInfo.width,right:right/assetInfo.width,top:top/assetInfo.height,bottom:bottom/assetInfo.height}
  };
  return {frontTop,aspect:assetInfo.width/assetInfo.height,width:assetInfo.width,height:assetInfo.height,geometry};
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
