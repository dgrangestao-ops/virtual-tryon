import { readFile } from "node:fs/promises";
const [generator,main,catalog]=await Promise.all([
 readFile("scripts/generate-products.mjs","utf8"),
 readFile("src/main.js","utf8"),
 readFile("catalog/fremi.json","utf8")
]);
const failures=[];
const parsed=JSON.parse(catalog);
if(!parsed.storeConfig) failures.push("cada loja deve carregar sua identidade no catálogo");
if(!generator.includes("export const STORE_CONFIG")) failures.push("gerador deve exportar identidade da loja");
if(!main.includes("STORE_CONFIG, findProduct")) failures.push("app deve consumir configuração gerada da loja");
if(!main.includes("applyStoreConfig(STORE_CONFIG)")) failures.push("interface deve aplicar configuração do catálogo ativo");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ catálogo e identidade preparados para múltiplas lojas sem duplicar o motor");
