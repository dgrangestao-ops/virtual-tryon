import { readFile } from "node:fs/promises";
const source=await readFile("public/embed.js","utf8");
const failures=[];
if(source.includes("location.href=url.href")) failures.push("embed não pode redirecionar a página da loja");
if(!source.includes('virtual-tryon:blocked')) failures.push("bloqueio de popup deve ser observável sem redirecionar");
if(!source.includes('version:"4"')) failures.push("versão fail-safe do embed não identificada");
if(!source.includes('if(url.protocol!=="https:"')) failures.push("URL externa do provador deve exigir HTTPS");
if(!source.includes("try{")) failures.push("embed deve conter barreira de erro");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ embed isolado: falhas não redirecionam nem interrompem a loja");
