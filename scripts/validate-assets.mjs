import {readFile} from "node:fs/promises";
import sharp from "sharp";
const catalog=JSON.parse(await readFile(process.argv[2]||"catalog/fremi.json","utf8"));
let failed=false;
for(const p of catalog.products||[]){
  if(p.available===false) continue;
  const selPath=`public/products/${p.sku}/selection.json`;
  const sel=JSON.parse(await readFile(selPath,"utf8"));
  const assetPath=`public/products/${p.sku}/asset.png`;
  const {data,info}=await sharp(assetPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const aspect=info.width/info.height;
  let topAlpha=0,topPixels=0,totalAlpha=0;
  let edgeAlpha=0;
  const band=Math.max(2,Math.round(info.height*.08));
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const a=data[(y*info.width+x)*4+3];
    if(a>24){
      totalAlpha++; if(y<band) topAlpha++;
      if(x<2 || x>=info.width-2 || y<2 || y>=info.height-2) edgeAlpha++;
    }
    if(y<band) topPixels++;
  }
  const topRatio=topAlpha/Math.max(1,totalAlpha);
  const edgeRatio=edgeAlpha/Math.max(1,totalAlpha);
  const geom=sel.asset?.geometry;
  const geometryOk=geom && geom.hingeLeftX>=0 && geom.hingeLeftX<.20 &&
    geom.hingeRightX>.80 && geom.hingeRightX<=1 &&
    geom.opticalCenterY>=0 && geom.opticalCenterY<=1;
  const dimensionsOk=sel.asset?.width===info.width && sel.asset?.height===info.height &&
    Math.abs((sel.asset?.aspect||0)-aspect)<.001;
  const alphaOk=totalAlpha>info.width*info.height*.035 && totalAlpha<info.width*info.height*.82;
  const ok=aspect>=2.25 && aspect<=3.6 && topRatio<.16 && edgeRatio<.045 &&
    sel.asset?.frontTop>0 && geometryOk && dimensionsOk && alphaOk;
  console.log(`${ok?"✓":"✗"} ${p.sku}: aspect=${aspect.toFixed(2)} top=${(topRatio*100).toFixed(1)}% edge=${(edgeRatio*100).toFixed(2)}% alpha=${(totalAlpha/(info.width*info.height)*100).toFixed(1)}% crop=${sel.asset?.frontTop} geom=${geometryOk?"ok":"fail"} dims=${dimensionsOk?"ok":"fail"}`);
  if(!ok) failed=true;
}
if(failed) process.exit(1);
