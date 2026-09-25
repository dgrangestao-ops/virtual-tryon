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
