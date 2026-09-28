import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const store=String(process.argv[2]||"fremi").trim().toLowerCase();
const registrySource=await readFile("src/store.registry.js","utf8");
const match=registrySource.match(new RegExp(`\\b${store}\\s*:\\s*Object\\.freeze\\(\\{[\\s\\S]*?catalog:\\s*"([^"]+)"[\\s\\S]*?enabled:\\s*(true|false)`));
if(!match || match[2]!=="true"){
  console.error(`Loja "${store}" não está registrada e habilitada para publicação.`);
  process.exit(2);
}
const catalog=match[1];
await mkdir(".build-backup",{recursive:true});
const generated="src/products.generated.js";
const original=await readFile(generated,"utf8");
await writeFile(".build-backup/products.generated.js",original);
const run=(cmd,args)=>new Promise((resolve,reject)=>{
  const child=spawn(cmd,args,{stdio:"inherit",shell:process.platform==="win32"});
  child.on("exit",code=>code===0?resolve():reject(new Error(`${cmd} falhou com código ${code}`)));
});
try{
  await run(process.execPath,["scripts/validate-catalog.mjs",catalog]);
  await run(process.execPath,["scripts/generate-products.mjs",catalog,generated]);
  await run(process.platform==="win32"?"npm.cmd":"npm",["run","build:raw"]);
  console.log(`✓ build da loja ${store} concluído`);
}finally{
  await writeFile(generated,original);
  await rm(".build-backup",{recursive:true,force:true});
}
