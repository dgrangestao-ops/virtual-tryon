import { readFile } from "node:fs/promises";
const source=await readFile("scripts/onboard-store.mjs","utf8");
const failures=[];
if(!source.includes('process.argv.includes("--force")')) failures.push("sobrescrita precisa exigir --force");
if(!source.includes("Nada foi sobrescrito")) failures.push("colisão deve abortar sem alterar catálogo");
if(!source.includes('["template","store","default"]')) failures.push("identificadores reservados devem ser bloqueados");
if(!source.includes("await access(out)")) failures.push("onboarding deve verificar catálogo existente");
if(failures.length){console.error(failures.map(x=>"✗ "+x).join("\n"));process.exit(1);}
console.log("✓ onboarding protege catálogos existentes contra sobrescrita acidental");
