# Fremi Virtual Try-On

MVP de provador virtual de óculos no navegador, preparado como base para um produto multi-loja.

## Estado atual
- câmera frontal e traseira
- MediaPipe Face Landmarker em tempo real
- pose 3D (posição, escala, roll, yaw e pitch)
- renderização Three.js
- armação procedural inspirada no modelo piloto Fremi
- suavização de movimento
- captura local de foto
- modo tela cheia
- layout responsivo
- processamento local da câmera
- fallback de rastreamento GPU → CPU
- catálogo desacoplado de produtos/SKUs
- API de troca de produto preparada para GLB/GLTF por armação

## Executar
```bash
npm install
npm run dev
```

Build de produção:
```bash
npm run build
```

## Validação do MVP
Tracking e encaixe frontal/3/4 validados em câmera real. O modelo procedural permanece como ativo provisório até a chegada dos ativos 3D finais dos SKUs Fremi.

## Próximas etapas de produto
Adicionar modelos GLB/GLTF reais das armações, catálogo/SKUs, calibração por produto, oclusão avançada rosto/haste, analytics e integração com a loja.

> O MVP atual não envia vídeo da câmera para servidor.

## Arquitetura para expansão
O arquivo `src/products.js` concentra os SKUs e calibrações. O motor recebe o produto pela API `setProduct`, permitindo que a mesma experiência seja reutilizada para novas armações e, posteriormente, para múltiplas lojas sem duplicar o motor de tracking.

## Pipeline automático por fotografia
O MVP agora aceita uma foto frontal de armação em fundo uniforme. O navegador estima o fundo, recorta a armação, cria um asset transparente e o injeta diretamente no motor facial. Esse fluxo é a base do cadastro em escala: foto → processamento → asset → try-on, sem exigir medição manual por SKU.

A segmentação atual é determinística e local, adequada para validar o fluxo. A etapa seguinte é substituir/acompanhar esse segmentador por visão computacional robusta para fundos e fotografias variadas e adicionar inferência automática de pontos estruturais (lentes, ponte e dobradiças).

## Integração com e-commerce
A experiência pública não pede upload ao consumidor. A loja abre o provador informando o SKU pela URL, por exemplo `?sku=FREMI-PILOTO`. O catálogo resolve o SKU para um asset previamente processado e o motor o aplica automaticamente.

Opcionalmente, a loja pode enviar `return=<URL HTTPS codificada>`; nesse caso o provador oferece retorno à página de compra. O processamento de fotografias pertence ao fluxo administrativo/catalogação, não ao fluxo do comprador.

## Validação do primeiro SKU real
- Produto: Óculos esportivo preto lente preta (98un1)
- Fluxo validado: catálogo → cópia local → processamento automático → seleção por SKU → rastreamento facial.
- Calibração visual piloto: scale 0.84; offset Y -0.072.
- Limitação conhecida: asset frontal é 2D/2.5D; vistas laterais de alta fidelidade exigirão múltiplas fotos ou modelo 3D.

## Integração na loja
O arquivo `/embed.js` cria o botão “Experimentar no meu rosto” na página do produto. A loja informa apenas o SKU no atributo `data-sku`; o provador recebe o SKU e a URL de retorno automaticamente. Isso mantém o motor desacoplado da plataforma de e-commerce.
