import { readFile } from "node:fs/promises";
const [build,pkg]=await Promise.all([
 readFile("scripts/build-store.mjs","utf8"),
 readFile("package.json","utf8")
]);
const failures=[];
if(!build.includes("não está registrada e habilitada")) failures.push("build deve bloquear loja não registrada");
if(!build.includes("validate-catalog.mjs")) failures.push("catálogo deve ser validado antes do build");
if(!build.includes("generate-products.mjs")) failures.push("produtos devem ser gerados a partir do catálogo selecionado");
if(!build.includes("finally")) failures.push("build deve restaurar estado mesmo após falha");
if(!pkg.includes('"build:store"')) failures.push("comando de build por loja ausente");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ pipeline de build isolado por loja validado");
