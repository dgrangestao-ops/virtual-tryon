import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const manifestPath=process.argv[2] || "catalog/fremi.json";
const manifest=JSON.parse(await readFile(manifestPath,"utf8"));

async function fetchText(url){
  const r=await fetch(url,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 VirtualTryOnCatalogBot/1.0"}});
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.text();
}
function ogImage(html){
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  for(const tag of tags){
    if(!/(?:property|name)\s*=\s*["']og:image["']/i.test(tag)) continue;
    const m=tag.match(/content\s*=\s*["']([^"']+)["']/i);
    if(m) return m[1].replaceAll("&amp;","&");
  }
  return null;
}
for(const product of manifest.products||[]){
  if(!product.sku || !product.localSourceUrl) continue;
  let url=product.sourceImageUrl;
  if(!url || url.startsWith("AUTO:")){
    if(!product.productUrl) throw new Error(`Sem productUrl para ${product.sku}`);
    url=ogImage(await fetchText(product.productUrl));
  }
  if(!url) throw new Error(`Imagem principal não encontrada para ${product.sku}`);
  const r=await fetch(url,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 VirtualTryOnCatalogBot/1.0"}});
  if(!r.ok) throw new Error(`Falha ao baixar ${product.sku}: HTTP ${r.status}`);
  const target="public"+product.localSourceUrl;
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,Buffer.from(await r.arrayBuffer()));
  console.log(`✓ ${product.sku} -> ${target}`);
}
