import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { basename } from "node:path";

const input=process.argv[2];
const force=process.argv.includes("--force");
if(!input){
  console.error("Uso: node scripts/onboard-store.mjs <arquivo-da-loja.json> [--force]");
  process.exit(1);
}
const data=JSON.parse(await readFile(input,"utf8"));
const slug=String(data.store||"").toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-|-$/g,"");
if(!slug){console.error("store inválido");process.exit(1);}
if(["template","store","default"].includes(slug)){console.error("identificador de loja reservado");process.exit(1);}
const out=`catalog/${slug}.json`;
if(basename(input)===basename(out)){
  console.log(`✓ catálogo ${slug} já está no local padrão`);
  process.exit(0);
}
let exists=false;
try{await access(out);exists=true;}catch{}
if(exists && !force){
  console.error(`Catálogo ${out} já existe. Nada foi sobrescrito. Use --force somente após revisão explícita.`);
  process.exit(2);
}
await mkdir("catalog",{recursive:true});
await writeFile(out,JSON.stringify(data,null,2)+"\n");
console.log(`✓ loja ${slug} preparada em ${out}${exists?" (substituição autorizada)":""}`);
console.log(`Próximo passo: node scripts/validate-catalog.mjs ${out}`);
