export const STORE_CONFIG = Object.freeze({
  id: "fremi",
  brand: "FREMI",
  brandSuffix: "EYEWEAR",
  pageTitle: "Fremi · Provador Virtual",
  description: "Experimente armações Fremi virtualmente usando a câmera do seu dispositivo.",
  heading: "Experimente no seu rosto",
  instruction: "Olhe para a frente. O provador fará a captura automaticamente.",
  privacy: "Sua câmera é processada neste dispositivo. O vídeo não é enviado.",
  compatibility: "Para um resultado melhor, mantenha o rosto de frente e bem iluminado."
});

export function applyStoreConfig(config=STORE_CONFIG){
  document.title=config.pageTitle;
  const description=document.querySelector('meta[name="description"]');
  if(description) description.content=config.description;
  const brand=document.querySelector("[data-store-brand]");
  const suffix=document.querySelector("[data-store-suffix]");
  const heading=document.querySelector("[data-store-heading]");
  const instruction=document.querySelector("[data-store-instruction]");
  const privacy=document.querySelector("[data-store-privacy]");
  const compatibility=document.querySelector("[data-store-compatibility]");
  if(brand) brand.textContent=config.brand;
  if(suffix) suffix.textContent=config.brandSuffix||"";
  if(heading) heading.textContent=config.heading;
  if(instruction) instruction.textContent=config.instruction;
  if(privacy) privacy.textContent=config.privacy;
  if(compatibility) compatibility.textContent=config.compatibility;
}
