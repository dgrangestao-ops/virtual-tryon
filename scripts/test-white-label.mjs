import { readFile } from "node:fs/promises";
const [main,index,config,generator]=await Promise.all([
  readFile("src/main.js","utf8"),
  readFile("index.html","utf8"),
  readFile("src/store.config.js","utf8"),
  readFile("scripts/generate-products.mjs","utf8")
]);
const failures=[];
if(!main.includes('applyStoreConfig(STORE_CONFIG)')) failures.push("configuração gerada da loja não aplicada");
if(!index.includes("data-store-brand")) failures.push("marca ainda não está configurável");
if(!index.includes("data-store-privacy")) failures.push("mensagem de privacidade ainda não está configurável");
if(!generator.includes("export const STORE_CONFIG")) failures.push("identidade deve ser gerada pelo catálogo ativo");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ identidade da loja desacoplada do motor");
