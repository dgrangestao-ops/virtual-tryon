# Fremi Virtual Try-On

MVP de provador virtual de óculos no navegador, preparado como base para um produto multi-loja.

## Estado atual
- câmera frontal e traseira
- MediaPipe Face Landmarker em tempo real
- pose 3D (posição, escala, roll, yaw e pitch)
- renderização Three.js
- assets reais de catálogo processados automaticamente por SKU
- suavização de movimento
- captura local de foto
- modo tela cheia
- layout responsivo
- processamento local da câmera
- fallback de rastreamento GPU → CPU
- catálogo desacoplado de produtos/SKUs
- troca de produto por SKU e suporte opcional a GLB/GLTF

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
Tracking, assets fotográficos e pipeline de catálogo validados em câmera real. A homologação visual final da versão 2D/2.5D permanece obrigatória antes da instalação na loja.

## Próximas etapas de produto
Após o piloto: analytics, painel multi-loja e, como opção premium, modelos 3D/GLB ou reconstrução por múltiplas fotos.

> O MVP atual não envia vídeo da câmera para servidor.

## Arquitetura para expansão
O arquivo `catalog/fremi.json` é a fonte dos SKUs e calibrações; `src/products.generated.js` é gerado automaticamente. O motor recebe o produto pela API `setProduct`, permitindo que a mesma experiência seja reutilizada para novas armações e, posteriormente, para múltiplas lojas sem duplicar o motor de tracking.

## Pipeline automático por fotografia
O MVP agora aceita uma foto frontal de armação em fundo uniforme. O navegador estima o fundo, recorta a armação, cria um asset transparente e o injeta diretamente no motor facial. Esse fluxo é a base do cadastro em escala: foto → processamento → asset → try-on, sem exigir medição manual por SKU.

A segmentação atual é determinística e local, adequada para validar o fluxo. A etapa seguinte é substituir/acompanhar esse segmentador por visão computacional robusta para fundos e fotografias variadas e adicionar inferência automática de pontos estruturais (lentes, ponte e dobradiças).

## Integração com e-commerce
A experiência pública não pede upload ao consumidor. A loja abre o provador informando o SKU pela URL, por exemplo `?sku=FREMI-PILOTO`. O catálogo resolve o SKU para um asset previamente processado e o motor o aplica automaticamente.

Opcionalmente, a loja pode enviar `return=<URL HTTPS codificada>`; nesse caso o provador oferece retorno à página de compra. O processamento de fotografias pertence ao fluxo administrativo/catalogação, não ao fluxo do comprador.

## Validação do primeiro SKU real
- Produto: Óculos esportivo preto lente preta (98un1)
- Fluxo validado: catálogo → cópia local → processamento automático → seleção por SKU → rastreamento facial.
- Calibração atual do SKU 98un1: scale 0.90; offset neutro no asset processado.
- Limitação conhecida: asset frontal é 2D/2.5D; vistas laterais de alta fidelidade exigirão múltiplas fotos ou modelo 3D.

## Integração na loja
O arquivo `/embed.js` cria o botão “Experimentar no meu rosto” na página do produto. A loja informa apenas o SKU no atributo `data-sku`; o provador recebe o SKU e a URL de retorno automaticamente. Isso mantém o motor desacoplado da plataforma de e-commerce.


## Pipeline automático de catálogo

O provador não depende de modelagem manual por SKU. O fluxo de catálogo é: URL do produto → coleta da galeria → remoção de duplicatas e imagens de tema → análise de silhueta/simetria → seleção automática da melhor vista frontal → ativo local versionado → provador. O arquivo `selection.json` de cada SKU registra a escolha e o ranking para auditoria. Fotos laterais permanecem disponíveis na galeria para uma futura reconstrução 3D/premium.

A validação do aplicativo e a sincronização dos ativos rodam automaticamente no GitHub Actions. O modo atual baseado em fotografia é deliberadamente 2D/2.5D; não promete recuperar geometria 3D física exata a partir de uma única foto.


## Checklist de fechamento do piloto

- [x] câmera e permissões
- [x] rastreamento facial e rotação
- [x] seleção automática de produto por SKU
- [x] coleta automática da galeria do produto
- [x] seleção automática da melhor vista frontal
- [x] geração automática de asset transparente sem hastes superiores
- [x] catálogo gerado e validado automaticamente
- [x] modo público sem seletor/etiqueta de teste
- [x] retorno seguro para a página do produto
- [x] script de integração preparado para a vitrine
- [ ] homologação visual final do provador isolado
- [ ] instalar o script/botão na loja Fremi (Nuvemshop)
- [ ] homologação final dentro da página real da Fremi

O seletor entre produtos permanece disponível apenas com `?test=1`, para homologação técnica sem expor controles internos ao consumidor.
