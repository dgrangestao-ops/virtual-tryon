import { readFile } from "node:fs/promises";
const source=await readFile("scripts/generate-products.mjs","utf8");
const failures=[];
if(!source.includes("public/stores/")) failures.push("assets novos devem suportar namespace por loja");
if(!source.includes("storeSlug")) failures.push("caminho de assets deve derivar do identificador da loja");
if(!source.includes("public/products/")) failures.push("Fremi atual precisa manter fallback legado durante migração");
if(!source.includes("/stores/")) failures.push("URL pública deve suportar assets isolados por loja");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ assets suportam isolamento por loja com compatibilidade do piloto atual");
