/**
 * Virtual Try-On embed v4.
 * Fail-safe by design: never redirects or replaces the storefront page.
 * Add once to the storefront and mark product buttons/elements with data-vto-sku.
 */
(()=>{
  try{
    const script=document.currentScript;
    const base=(script?.dataset.base||"https://virtual-tryon.dgran-gestao.workers.dev/").replace(/\/$/,"")+"/";
    const label=script?.dataset.label||"Experimentar no meu rosto";
    const selector=script?.dataset.selector||"[data-vto-sku]";
    const emit=(name,detail={})=>{
      try{window.dispatchEvent(new CustomEvent(name,{detail}));}catch{}
    };
    const buildUrl=(sku)=>{
      if(!sku) return null;
      try{
        const url=new URL(base);
        if(url.protocol!=="https:" && url.origin!==location.origin) return null;
        url.searchParams.set("sku",sku);
        url.searchParams.set("return",location.href);
        return url;
      }catch{return null;}
    };
    const open=(sku)=>{
      const url=buildUrl(sku);
      if(!url){emit("virtual-tryon:error",{sku,reason:"invalid-url"});return false;}
      emit("virtual-tryon:open",{sku,url:url.href});
      let popup=null;
      try{popup=window.open(url.href,"_blank","noopener,noreferrer");}catch{}
      if(!popup){
        emit("virtual-tryon:blocked",{sku,url:url.href});
        return false;
      }
      return true;
    };
    const enhance=(el)=>{
      if(!el || el.dataset.vtoReady) return;
      const sku=el.dataset.vtoSku;
      if(!sku) return;
      el.dataset.vtoReady="1";
      if(el.matches("button,a")){
        el.addEventListener("click",e=>{
          e.preventDefault();
          e.stopPropagation();
          open(sku);
        });
      }else{
        const button=document.createElement("button");
        button.type="button";
        button.textContent=label;
        button.dataset.vtoReady="1";
        button.style.cssText="display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:14px 20px;background:#171717;color:#fff;font:700 14px/1.2 system-ui;cursor:pointer";
        button.addEventListener("click",()=>open(sku));
        el.appendChild(button);
      }
    };
    const scan=()=>{
      try{document.querySelectorAll(selector).forEach(enhance);}
      catch(error){emit("virtual-tryon:error",{reason:"invalid-selector"});}
    };
    scan();
    const observer=new MutationObserver(scan);
    observer.observe(document.documentElement,{subtree:true,childList:true});
    window.VirtualTryOn={
      open,
      rescan:scan,
      destroy(){observer.disconnect();},
      version:"4"
    };
    const legacySku=script?.dataset.sku;
    if(legacySku && !document.querySelector(selector)){
      const host=document.createElement("span");
      host.dataset.vtoSku=legacySku;
      script.insertAdjacentElement("afterend",host);
      enhance(host);
    }
  }catch(error){
    // Nunca propaga uma falha do provador para o JavaScript da loja.
    try{window.dispatchEvent(new CustomEvent("virtual-tryon:error",{detail:{reason:"embed-init"}}));}catch{}
  }
})();
