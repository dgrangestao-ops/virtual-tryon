/**
 * Virtual Try-On embed v2.
 * Add once to the storefront and mark product buttons/elements with data-vto-sku.
 * Also supports legacy script data-sku usage.
 */
(()=>{
  const script=document.currentScript;
  const base=(script?.dataset.base||"https://virtual-tryon.dgran-gestao.workers.dev/").replace(/\/$/,"")+"/";
  const label=script?.dataset.label||"Experimentar no meu rosto";
  const selector=script?.dataset.selector||"[data-vto-sku]";
  const open=(sku)=>{
    if(!sku) return;
    const url=new URL(base);
    url.searchParams.set("sku",sku);
    url.searchParams.set("return",location.href);
    location.href=url.href;
  };
  const enhance=(el)=>{
    if(el.dataset.vtoReady) return;
    const sku=el.dataset.vtoSku;
    if(!sku) return;
    el.dataset.vtoReady="1";
    if(el.matches("button,a")) el.addEventListener("click",e=>{e.preventDefault();open(sku);});
    else{
      const button=document.createElement("button");
      button.type="button"; button.textContent=label; button.dataset.vtoReady="1";
      button.style.cssText="display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:14px 20px;background:#171717;color:#fff;font:700 14px/1.2 system-ui;cursor:pointer";
      button.addEventListener("click",()=>open(sku));
      el.appendChild(button);
    }
  };
  const scan=()=>document.querySelectorAll(selector).forEach(enhance);
  scan();
  new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});
  const legacySku=script?.dataset.sku;
  if(legacySku && !document.querySelector(selector)){
    const host=document.createElement("span"); host.dataset.vtoSku=legacySku;
    script.insertAdjacentElement("afterend",host); enhance(host);
  }
})();
