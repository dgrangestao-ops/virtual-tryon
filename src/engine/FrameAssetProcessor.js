export class FrameAssetProcessor {
  constructor(){
    this.cache=new Map();
  }

  async fromUrl(url){
    if(this.cache.has(url)) return this.cache.get(url);
    const response=await fetch(url,{mode:"cors"});
    if(!response.ok) throw new Error("Falha ao carregar imagem do catálogo");
    const blob=await response.blob();
    const promise=this.fromImage(blob);
    this.cache.set(url,promise);
    try{return await promise;}catch(error){this.cache.delete(url);throw error;}
  }

  async decodeImage(file){
    if("createImageBitmap" in window) return createImageBitmap(file);
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.decoding="async";
    img.src=url;
    await img.decode();
    // Safari pode ainda depender do object URL no drawImage. Mantemos a URL
    // viva até o processamento terminar e a liberamos em fromImage.
    img.__objectUrl=url;
    return img;
  }

  async fromImage(file){
    const bitmap=await this.decodeImage(file);
    const maxSide=1600;
    const ratio=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const work=document.createElement("canvas");
    work.width=Math.max(1,Math.round(bitmap.width*ratio));
    work.height=Math.max(1,Math.round(bitmap.height*ratio));
    const ctx=work.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(bitmap,0,0,work.width,work.height);
    const img=ctx.getImageData(0,0,work.width,work.height);
    const d=img.data;

    // Estima o fundo pelas quatro bordas. Funciona bem para fotos de catálogo
    // em fundo uniforme e deixa a arquitetura pronta para segmentação por IA.
    const samples=[];
    const step=Math.max(1,Math.floor(Math.min(work.width,work.height)/80));
    for(let x=0;x<work.width;x+=step){
      for(const y of [0,work.height-1]){
        const i=(y*work.width+x)*4;samples.push([d[i],d[i+1],d[i+2]]);
      }
    }
    for(let y=0;y<work.height;y+=step){
      for(const x of [0,work.width-1]){
        const i=(y*work.width+x)*4;samples.push([d[i],d[i+1],d[i+2]]);
      }
    }
    const bg=[0,1,2].map(c=>samples.reduce((a,p)=>a+p[c],0)/samples.length);
    // Adapta a tolerância à variação real do fundo. Fundo branco puro usa
    // corte mais conservador; fotos com compressão/sombra recebem tolerância maior.
    const spread=Math.sqrt(samples.reduce((sum,p)=>sum+
      ((p[0]-bg[0])**2+(p[1]-bg[1])**2+(p[2]-bg[2])**2)/3,0)/samples.length);
    let minX=work.width,minY=work.height,maxX=0,maxY=0,count=0;
    const threshold=Math.max(38,Math.min(82,38+spread*2.2));
    const w=work.width,h=work.height;
    const seen=new Uint8Array(w*h);
    const queue=[];
    const enqueue=(x,y)=>{const k=y*w+x;if(!seen[k]){seen[k]=1;queue.push(k);}};
    for(let x=0;x<w;x++){enqueue(x,0);enqueue(x,h-1);}
    for(let y=0;y<h;y++){enqueue(0,y);enqueue(w-1,y);}
    for(let qi=0;qi<queue.length;qi++){
      const k=queue[qi],x=k%w,y=(k/w)|0,i=k*4;
      const dist=Math.hypot(d[i]-bg[0],d[i+1]-bg[1],d[i+2]-bg[2]);
      if(dist>=threshold) continue;
      // Suaviza a borda em vez de produzir recorte serrilhado.
      d[i+3]=dist>threshold*.72 ? Math.round(255*(dist-threshold*.72)/(threshold*.28)) : 0;
      if(x>0) enqueue(x-1,y); if(x<w-1) enqueue(x+1,y);
      if(y>0) enqueue(x,y-1); if(y<h-1) enqueue(x,y+1);
    }
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      if(d[i+3]>8){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
    }
    if(!count) throw new Error("Não foi possível separar a armação do fundo.");

    // A vista frontal já é escolhida automaticamente no pipeline de catálogo.
    // Aqui fazemos apenas a segmentação do fundo, sem recortes geométricos
    // agressivos que poderiam mutilar formatos legítimos de armação.
    ctx.putImageData(img,0,0);
    const pad=Math.round(Math.max(maxX-minX,maxY-minY)*.04);
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
    maxX=Math.min(work.width-1,maxX+pad);maxY=Math.min(work.height-1,maxY+pad);
    const out=document.createElement("canvas");
    out.width=maxX-minX+1;out.height=maxY-minY+1;
    out.getContext("2d").drawImage(work,minX,minY,out.width,out.height,0,0,out.width,out.height);
    const result={
      url:out.toDataURL("image/png"),
      aspect:out.width/out.height,
      sourceWidth:bitmap.width,
      sourceHeight:bitmap.height
    };
    bitmap.close?.();
    if(bitmap.__objectUrl) URL.revokeObjectURL(bitmap.__objectUrl);
    return result;
  }
}
