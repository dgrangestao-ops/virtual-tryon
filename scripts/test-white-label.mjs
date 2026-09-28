import { readFile } from "node:fs/promises";
const [main,index,config]=await Promise.all([
  readFile("src/main.js","utf8"),
  readFile("index.html","utf8"),
  readFile("src/store.config.js","utf8")
]);
const failures=[];
if(!main.includes('applyStoreConfig();')) failures.push("configuração da loja não aplicada");
if(!index.includes("data-store-brand")) failures.push("marca ainda não está configurável");
if(!index.includes("data-store-privacy")) failures.push("mensagem de privacidade ainda não está configurável");
if(!config.includes('id: "fremi"')) failures.push("piloto Fremi deve permanecer como configuração padrão");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ identidade da loja desacoplada do motor");
