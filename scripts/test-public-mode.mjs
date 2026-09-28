import { readFile } from "node:fs/promises";
const source=await readFile("src/main.js","utf8");
const failures=[];
if(!source.includes('params.get("test")==="1"')) failures.push("modo de teste deve exigir ?test=1");
if(source.includes("const testMode=true")) failures.push("modo de teste não pode ficar sempre ativo");
if(source.includes('link.download="fremi-provador.png"')) failures.push("exportação não pode ter nome Fremi fixo");
if(failures.length){ console.error(failures.map(x=>"✗ "+x).join("\n")); process.exit(1); }
console.log("✓ modo público protegido e exportação neutra");
