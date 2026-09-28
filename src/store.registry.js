/**
 * Registro explícito de lojas publicáveis.
 * Nenhuma loja é carregada a partir de URL arbitrária.
 */
export const STORE_REGISTRY = Object.freeze({
  fremi: Object.freeze({
    id: "fremi",
    catalog: "catalog/fremi.json",
    enabled: true
  })
});

export const DEFAULT_STORE_ID = "fremi";

export function resolveStoreId(requested){
  const key=String(requested||"").trim().toLowerCase();
  if(key && STORE_REGISTRY[key]?.enabled) return key;
  return DEFAULT_STORE_ID;
}
