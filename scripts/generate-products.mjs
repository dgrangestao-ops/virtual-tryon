import { readFile, writeFile } from "node:fs/promises";
const path=process.argv[2]||"catalog/fremi.json";
const out=process.argv[3]||"src/products.generated.js";
const m=JSON.parse(await readFile(path,"utf8"));
const products=[];
for(const p of (m.products||[])){
 let generatedAsset=null,imageAspect=p.imageAspect;
 try{
   const sel=JSON.parse(await readFile(`public/products/${p.sku}/selection.json`,"utf8"));
   if(sel.asset){generatedAsset=`/products/${p.sku}/asset.png`; imageAspect=sel.asset.aspect;}
 }catch{}
 products.push({
 id:p.id,brand:p.brand||m.brand||m.store,name:p.name,sku:p.sku,productUrl:p.productUrl,
 sourceImageUrl:p.localSourceUrl||p.sourceImageUrl,remoteSourceImageUrl:p.sourceImageUrl?.startsWith("http")?p.sourceImageUrl:undefined,
 modelUrl:p.modelUrl??null,imageAssetUrl:p.imageAssetUrl??generatedAsset,imageAspect,assetStatus:generatedAsset?"generated":(p.assetStatus||"source-photo"),
 calibration:p.calibration||{scale:1,position:[0,0,0],rotation:[0,0,0]},available:p.available!==false
 });
}
const js=`// AUTO-GENERATED from ${path}. Do not edit manually.
export const PRODUCTS = ${JSON.stringify(products,null,2)};
export const DEFAULT_PRODUCT_ID = ${JSON.stringify(m.defaultProductId||products[0]?.id||"")};
export function findProduct({sku,id}={}){
  const key=(sku||id||"").trim().toLowerCase();
  if(!key) return PRODUCTS.find(p=>p.id===DEFAULT_PRODUCT_ID)||PRODUCTS[0];
  return PRODUCTS.find(p=>p.available && [p.sku,p.id].some(v=>String(v||"").toLowerCase()===key))||null;
}
`;
await writeFile(out,js);
console.log(`✓ ${products.length} produtos -> ${out}`);
