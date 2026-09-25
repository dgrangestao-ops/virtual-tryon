import { readFile } from "node:fs/promises";
const file=process.argv[2]||"catalog/fremi.json";
const m=JSON.parse(await readFile(file,"utf8"));
const errors=[];
if(!m.store) errors.push("store ausente");
if(!Array.isArray(m.products)||!m.products.length) errors.push("products vazio");
const seenSku=new Set(),seenId=new Set();
for(const [i,p] of (m.products||[]).entries()){
 const at=`products[${i}]`;
 for(const k of ["id","sku","name","productUrl","localSourceUrl"]) if(!p[k]) errors.push(`${at}.${k} ausente`);
 const sku=String(p.sku||"").toLowerCase(), id=String(p.id||"").toLowerCase();
 if(seenSku.has(sku)) errors.push(`SKU duplicado: ${p.sku}`); seenSku.add(sku);
 if(seenId.has(id)) errors.push(`ID duplicado: ${p.id}`); seenId.add(id);
 try{ if(p.productUrl && new URL(p.productUrl).protocol!=="https:") errors.push(`${p.sku}: productUrl deve usar HTTPS`); }catch{ errors.push(`${p.sku}: productUrl inválida`); }
 if(!String(p.localSourceUrl||"").startsWith("/products/")) errors.push(`${p.sku}: localSourceUrl fora de /products/`);
 const c=p.calibration;
 if(c && (!(Number.isFinite(c.scale)&&c.scale>0) || !Array.isArray(c.position)||c.position.length!==3 || !Array.isArray(c.rotation)||c.rotation.length!==3)) errors.push(`${p.sku}: calibration inválida`);
}
if(m.defaultProductId && !(m.products||[]).some(p=>p.id===m.defaultProductId)) errors.push("defaultProductId não existe no catálogo");
if(errors.length){console.error("Catálogo inválido:\n- "+errors.join("\n- "));process.exit(1);}
console.log(`✓ catálogo válido: ${m.products.length} produtos, ${seenSku.size} SKUs únicos`);
