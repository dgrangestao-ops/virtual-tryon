import { readFile, writeFile } from "node:fs/promises";
const path=process.argv[2]||"catalog/fremi.json";
const out=process.argv[3]||"src/products.generated.js";
const m=JSON.parse(await readFile(path,"utf8"));
const products=[];
const storeSlug=String(m.store||"default").toLowerCase().replace(/[^a-z0-9-]+/g,"-");
for(const p of (m.products||[])){
 let generatedAsset=null,imageAspect=p.imageAspect,assetGeometry=null;
 try{
   let selectionPath=`public/stores/${storeSlug}/products/${p.sku}/selection.json`;
   try{await readFile(selectionPath,"utf8");}catch{selectionPath=`public/products/${p.sku}/selection.json`;}
   const sel=JSON.parse(await readFile(selectionPath,"utf8"));
   if(sel.asset){generatedAsset=selectionPath.startsWith("public/stores/")?`/stores/${storeSlug}/products/${p.sku}/asset.png`:`/products/${p.sku}/asset.png`; imageAspect=sel.asset.aspect; assetGeometry=sel.asset.geometry||null;}
 }catch{}
 products.push({
 id:p.id,brand:p.brand||m.brand||m.store,name:p.name,sku:p.sku,productUrl:p.productUrl,
 sourceImageUrl:p.localSourceUrl||p.sourceImageUrl,remoteSourceImageUrl:p.sourceImageUrl?.startsWith("http")?p.sourceImageUrl:undefined,
 modelUrl:p.modelUrl??null,imageAssetUrl:p.imageAssetUrl??generatedAsset,imageAspect,assetGeometry,assetStatus:generatedAsset?"generated":(p.assetStatus||"source-photo"),
 calibration:p.calibration||{scale:1,position:[0,0,0],rotation:[0,0,0]},available:p.available!==false
 });
}
const storeConfig={
 id:m.store,
 brand:m.storeConfig?.brand||m.brand||m.store,
 brandSuffix:m.storeConfig?.brandSuffix||"",
 pageTitle:m.storeConfig?.pageTitle||`${m.brand||m.store} · Provador Virtual`,
 description:m.storeConfig?.description||`Experimente produtos ${m.brand||m.store} virtualmente.`,
 heading:m.storeConfig?.heading||"Experimente no seu rosto",
 instruction:m.storeConfig?.instruction||"Olhe para a frente. O provador fará a captura automaticamente.",
 privacy:m.storeConfig?.privacy||"Sua câmera é processada neste dispositivo. O vídeo não é enviado.",
 compatibility:m.storeConfig?.compatibility||"Para um resultado melhor, mantenha o rosto de frente e bem iluminado.",
 allowedReturnOrigins:Array.isArray(m.storeConfig?.allowedReturnOrigins)?m.storeConfig.allowedReturnOrigins:[]
};
const js=`// AUTO-GENERATED from ${path}. Do not edit manually.
export const STORE_CONFIG = ${JSON.stringify(storeConfig,null,2)};
export const PRODUCTS = ${JSON.stringify(products,null,2)};
export const DEFAULT_PRODUCT_ID = ${JSON.stringify(m.defaultProductId||products[0]?.id||"")};
export function findProduct({sku,id}={}){
  const key=(sku||id||"").trim().toLowerCase();
  if(!key) return PRODUCTS.find(p=>p.id===DEFAULT_PRODUCT_ID)||PRODUCTS[0];
  return PRODUCTS.find(p=>p.available && [p.sku,p.id].some(v=>String(v||"").toLowerCase()===key))||null;
}
`;
await writeFile(out,js);
console.log(`✓ ${products.length} produtos da loja ${m.store} -> ${out}`);
