// AUTO-GENERATED from catalog/fremi.json. Do not edit manually.
export const PRODUCTS = [
  {
    "id": "oculos-esportivo-preto-lente-preta-98un1",
    "brand": "Fremi",
    "name": "Óculos esportivo preto lente preta",
    "sku": "98un1",
    "productUrl": "https://www.fremieyewear.com.br/produtos/oculos-esportivo-preto-lente-preta-98un1/",
    "sourceImageUrl": "/products/98un1/source.webp",
    "remoteSourceImageUrl": "https://dcdn-us.mitiendanube.com/stores/005/876/852/products/20251112_135701_-0f9bafd9c75984685117630012588680-1024-1024.webp",
    "modelUrl": null,
    "imageAssetUrl": "/products/98un1/asset.png",
    "imageAspect": 2.0579710144927534,
    "assetStatus": "generated",
    "calibration": {
      "scale": 0.84,
      "position": [
        0,
        -0.072,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    "available": true
  },
  {
    "id": "oculos-policarbonato-preto-lente-espelhada-q7by3",
    "brand": "Fremi",
    "name": "Óculos policarbonato preto lente espelhada",
    "sku": "q7by3",
    "productUrl": "https://www.fremieyewear.com.br/produtos/oculos-policarbonato-preto-lente-espelhada-q7by3/",
    "sourceImageUrl": "/products/q7by3/source.webp",
    "modelUrl": null,
    "imageAssetUrl": "/products/q7by3/asset.png",
    "imageAspect": 2.764705882352941,
    "assetStatus": "generated",
    "calibration": {
      "scale": 1,
      "position": [
        0,
        0,
        0
      ],
      "rotation": [
        0,
        0,
        0
      ]
    },
    "available": true
  }
];
export const DEFAULT_PRODUCT_ID = "oculos-esportivo-preto-lente-preta-98un1";
export function findProduct({sku,id}={}){
  const key=(sku||id||"").trim().toLowerCase();
  if(!key) return PRODUCTS.find(p=>p.id===DEFAULT_PRODUCT_ID)||PRODUCTS[0];
  return PRODUCTS.find(p=>p.available && [p.sku,p.id].some(v=>String(v||"").toLowerCase()===key))||null;
}
