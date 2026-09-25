export class FrameAssetProcessor {
  async fromImage(file){
    const bitmap=await createImageBitmap(file);
    const work=document.createElement("canvas");
    work.width=bitmap.width; work.height=bitmap.height;
    const ctx=work.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(bitmap,0,0);
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
    let minX=work.width,minY=work.height,maxX=0,maxY=0,count=0;
    const threshold=58;
    for(let y=0;y<work.height;y++) for(let x=0;x<work.width;x++){
      const i=(y*work.width+x)*4;
      const dist=Math.hypot(d[i]-bg[0],d[i+1]-bg[1],d[i+2]-bg[2]);
      if(dist<threshold){ d[i+3]=0; }
      else { minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++; }
    }
    ctx.putImageData(img,0,0);
    if(!count) throw new Error("Não foi possível separar a armação do fundo.");
    const pad=Math.round(Math.max(maxX-minX,maxY-minY)*.04);
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
    maxX=Math.min(work.width-1,maxX+pad);maxY=Math.min(work.height-1,maxY+pad);
    const out=document.createElement("canvas");
    out.width=maxX-minX+1;out.height=maxY-minY+1;
    out.getContext("2d").drawImage(work,minX,minY,out.width,out.height,0,0,out.width,out.height);
    return {
      url:out.toDataURL("image/png"),
      aspect:out.width/out.height,
      sourceWidth:bitmap.width,
      sourceHeight:bitmap.height
    };
  }
}
