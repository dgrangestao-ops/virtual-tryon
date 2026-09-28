import { readFile } from "node:fs/promises";
const source=await readFile("src/store.registry.js","utf8");
const failures=[];
if(!source.includes('DEFAULT_STORE_ID = "fremi"')) failures.push("Fremi deve continuar como loja padrão");
if(!source.includes("STORE_REGISTRY[key]?.enabled")) failures.push("seleção deve aceitar apenas lojas registradas e habilitadas");
if(source.includes("import(")) failures.push("registro não deve importar módulo arbitrário a partir da URL");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ seleção de loja limitada a registro explícito");
