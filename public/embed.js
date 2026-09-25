/**
 * Fremi / Virtual Try-On embed helper.
 * Usage:
 * <script src="https://virtual-tryon.dgran-gestao.workers.dev/embed.js"
 *   data-sku="SKU_DO_PRODUTO" data-label="Experimentar no meu rosto"></script>
 */
(()=>{
  const script=document.currentScript;
  if(!script) return;
  const base="https://virtual-tryon.dgran-gestao.workers.dev/";
  const sku=script.dataset.sku||document.querySelector("[data-sku]")?.dataset.sku;
  if(!sku) return;
  const button=document.createElement("button");
  button.type="button";
  button.textContent=script.dataset.label||"Experimentar no meu rosto";
  button.style.cssText="display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:14px 20px;background:#171717;color:#fff;font:700 14px/1.2 system-ui;cursor:pointer";
  button.addEventListener("click",()=>{
    const url=new URL(base);
    url.searchParams.set("sku",sku);
    url.searchParams.set("return",location.href);
    location.href=url.href;
  });
  script.insertAdjacentElement("afterend",button);
})();
