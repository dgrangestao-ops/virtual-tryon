# Template de nova ótica

Este diretório é o ponto de partida para cadastrar uma nova loja sem duplicar o motor do Provador Virtual.

## Fluxo
1. Copie `catalog/store.template.json` para `catalog/<loja>.json`.
2. Troque `store`, `brand` e os campos de `storeConfig`.
3. Cadastre os produtos com SKU único, URL HTTPS e imagem fonte.
4. Salve a imagem local em `public/products/<SKU>/source.webp`.
5. Valide com `node scripts/validate-catalog.mjs catalog/<loja>.json`.
6. Gere o catálogo com `node scripts/generate-products.mjs catalog/<loja>.json src/products.generated.js`.
7. Rode `npm run validate:all` antes de publicar.

O motor de câmera, tracking, captura e segurança não deve ser copiado nem alterado para cadastrar uma loja.
