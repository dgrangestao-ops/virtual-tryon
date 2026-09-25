import { readFile, writeFile } from "node:fs/promises";
const catalogPath=process.argv[2]||"catalog/fremi.json";
const urls=process.argv.slice(3);
if(!urls.length) throw new Error("Informe uma ou mais URLs de produtos");
const catalog=JSON.parse(await readFile(catalogPath,"utf8"));
const slug=u=>new URL(u).pathname.split("/").filter(Boolean).pop();
const meta=(html,key)=>{
 const tags=html.match(/<meta\b[^>]*>/gi)||[];
 for(const t of tags){
  if(!new RegExp(`(?:property|name)=["']${key}["']`,"i").test(t)) continue;
  const m=t.match(/content=["']([^"']+)["']/i); if(m) return m[1].replaceAll("&amp;","&");
 }
};
for(const productUrl of urls){
 const r=await fetch(productUrl,{headers:{"user-agent":"Mozilla/5.0 VirtualTryOnCatalogBot/1.0"}});
 if(!r.ok) throw new Error(`HTTP ${r.status}: ${productUrl}`);
 const html=await r.text();
 const id=slug(productUrl);
 const sku=(id.match(/-([a-z0-9]+)$/i)||[])[1]||id;
 const name=(meta(html,"og:title")||id).replace(/\s*[|–-]\s*Fremi.*$/i,"").trim();
 const existing=catalog.products.find(p=>String(p.sku).toLowerCase()===sku.toLowerCase()||p.id===id);
 const data={id,sku,name,productUrl,sourceImageUrl:"AUTO:og:image",localSourceUrl:`/products/${sku}/source.webp`,brand:catalog.brand||"Fremi",modelUrl:null,imageAssetUrl:null,assetStatus:"source-photo",available:true,calibration:{scale:1,position:[0,0,0],rotation:[0,0,0]}};
 if(existing) Object.assign(existing,{...data,calibration:existing.calibration||data.calibration});
 else catalog.products.push(data);
 console.log(`✓ ${sku}: ${name}`);
}
await writeFile(catalogPath,JSON.stringify(catalog,null,2)+"\n");
