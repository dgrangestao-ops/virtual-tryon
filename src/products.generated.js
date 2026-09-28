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
    "imageAspect": 2.8542713567839195,
    "assetGeometry": {
      "hingeLeftX": 0,
      "hingeRightX": 0.9982394366197183,
      "opticalCenterY": 0.12060301507537688,
      "bbox": {
        "left": 0,
        "right": 0.9982394366197183,
        "top": 0,
        "bottom": 0.9949748743718593
      }
    },
    "assetStatus": "generated",
    "calibration": {
      "scale": 0.9,
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
    "imageAspect": 3.0454545454545454,
    "assetGeometry": {
      "hingeLeftX": 0,
      "hingeRightX": 0.9975124378109452,
      "opticalCenterY": 0,
      "bbox": {
        "left": 0,
        "right": 0.9975124378109452,
        "top": 0,
        "bottom": 0.9924242424242424
      }
    },
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
  },
  {
    "id": "oculos-elo-retangular-preto-v82qv",
    "brand": "Fremi",
    "name": "Óculos Elo retangular preto lente champanhe",
    "sku": "v82qv",
    "productUrl": "https://www.fremieyewear.com.br/produtos/oculos-v82qv/",
    "sourceImageUrl": "/products/v82qv/source.webp",
    "modelUrl": null,
    "imageAssetUrl": "/products/v82qv/asset.png",
    "imageAspect": 3.0454545454545454,
    "assetGeometry": {
      "hingeLeftX": 0,
      "hingeRightX": 0.9975124378109452,
      "opticalCenterY": 0,
      "bbox": {
        "left": 0,
        "right": 0.9975124378109452,
        "top": 0,
        "bottom": 0.9924242424242424
      }
    },
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
  },
  {
    "id": "oculos-identita-retangular-preto-179s2",
    "brand": "Fremi",
    "name": "Óculos Identità retangular preto lente champanhe",
    "sku": "179s2",
    "productUrl": "https://www.fremieyewear.com.br/produtos/oculos-179s2/",
    "sourceImageUrl": "/products/179s2/source.webp",
    "modelUrl": null,
    "imageAssetUrl": "/products/179s2/asset.png",
    "imageAspect": 2.9324324324324325,
    "assetGeometry": {
      "hingeLeftX": 0,
      "hingeRightX": 0.9976958525345622,
      "opticalCenterY": 0.08783783783783784,
      "bbox": {
        "left": 0,
        "right": 0.9976958525345622,
        "top": 0,
        "bottom": 0.9932432432432432
      }
    },
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
  },
  {
    "id": "oculos-solaris-preto-lente-amarela-1316q",
    "brand": "Fremi",
    "name": "Óculos Solaris preto lente amarela",
    "sku": "1316q",
    "productUrl": "https://www.fremieyewear.com.br/produtos/oculos-1316q/",
    "sourceImageUrl": "/products/1316q/source.webp",
    "modelUrl": null,
    "imageAssetUrl": "/products/1316q/asset.png",
    "imageAspect": 2.9324324324324325,
    "assetGeometry": {
      "hingeLeftX": 0,
      "hingeRightX": 0.9976958525345622,
      "opticalCenterY": 0.08783783783783784,
      "bbox": {
        "left": 0,
        "right": 0.9976958525345622,
        "top": 0,
        "bottom": 0.9932432432432432
      }
    },
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
