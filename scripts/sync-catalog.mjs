import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname } from "node:path";

const manifestPath=process.argv[2] || "catalog/fremi.json";
const manifest=JSON.parse(await readFile(manifestPath,"utf8"));
const UA={"user-agent":"Mozilla/5.0 VirtualTryOnCatalogBot/2.0"};

async function fetchText(url){
  const r=await fetch(url,{redirect:"follow",headers:UA});
  if(!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.text();
}
function decode(v=""){return v.replaceAll("&amp;","&").replaceAll("\\/","/");}
function collectImages(html){
  const found=[];
  const push=(u,source)=>{
    u=decode(u||"").trim();
    if(!/^https?:\/\//i.test(u)) return;
    try{
      const host=new URL(u).hostname;
      if(!/mitiendanube\.com$/i.test(host) && !/fremieyewear\.com\.br$/i.test(host)) return;
    }catch{return;}
    if(/\/themes\/|\/logo[-_/]|favicon|banner|icon/i.test(u)) return;
    if(!/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(u)) return;
    const key=u.replace(/^http:/i,"https:").replace(/-(?:240|320|480|640|1024|1080|1200|1500|2048)-0(?=\.)/i,"-SIZE-0");
    if(!found.some(x=>x.key===key)) found.push({url:u,source,key});
  };
  for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){
    if(/(?:property|name)\s*=\s*["']og:image(?::secure_url)?["']/i.test(tag)){
      push(tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1],"og");
    }
  }
  for(const m of html.matchAll(/<img\b[^>]*(?:src|data-src)\s*=\s*["']([^"']+)["'][^>]*>/gi)) push(m[1],"img");
  // Nuvemshop/JSON-LD normalmente expõe a galeria inteira em Product.image.
  for(const m of html.matchAll(/https?:\\?\/\\?\/[^"'\s<>]+?\.(?:jpe?g|png|webp)(?:\?[^"'\s<>]*)?/gi)) push(m[0],"embedded");
  return found;
}
function scoreCandidate(c,index){
  const u=c.url.toLowerCase();
  let score=0;
  if(c.source==="og") score+=30;
  if(c.source==="embedded") score+=10;
  if(/1024|1080|1200|1500|2048/.test(u)) score+=8;
  if(/frente|front|frontal/.test(u)) score+=50;
  if(/lado|side|lateral|detail|detalhe|case|estojo|modelo|rosto/.test(u)) score-=35;
  score-=index*.05;
  return score;
}
async function download(url,target){
  const r=await fetch(url,{redirect:"follow",headers:UA});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,Buffer.from(await r.arrayBuffer()));
}
for(const product of manifest.products||[]){
  if(!product.sku || !product.localSourceUrl) continue;
  let candidates=[];
  if(product.productUrl){
    const html=await fetchText(product.productUrl);
    candidates=collectImages(html);
  }
  if(product.sourceImageUrl && !product.sourceImageUrl.startsWith("AUTO:")){
    candidates.unshift({url:product.sourceImageUrl,source:"manifest"});
  }
  candidates=candidates
    .filter((x,i,a)=>a.findIndex(y=>(y.key||y.url)===(x.key||x.url))===i)
    .sort((a,b)=>scoreCandidate(b,0)-scoreCandidate(a,0))
    .slice(0,8);
  if(!candidates.length) throw new Error(`Nenhuma imagem encontrada para ${product.sku}`);

  const galleryDir=`public/products/${product.sku}/gallery`;
  const saved=[];
  for(let i=0;i<candidates.length;i++){
    const c=candidates[i];
    const ext=(extname(new URL(c.url).pathname)||".webp").toLowerCase();
    const target=`${galleryDir}/${String(i+1).padStart(2,"0")}${ext}`;
    try{await download(c.url,target);saved.push({...c,target});}catch(e){console.warn("ignorado",c.url,e.message);}
  }
  if(!saved.length) throw new Error(`Falha ao baixar galeria de ${product.sku}`);
  // Compatibilidade: mantém source.* apontando para a melhor candidata enquanto
  // a etapa seguinte faz a seleção visual por silhueta/simetria.
  await download(saved[0].url,"public"+product.localSourceUrl);
  await writeFile(`public/products/${product.sku}/gallery.json`,JSON.stringify(saved,null,2));
  console.log(`✓ ${product.sku}: ${saved.length} imagens candidatas`);
}
