'use strict';

// Median-cut palette and GIF LZW adapted from the Petal Danse exporter.
function pouchPalette(data){
 const histogram=new Uint32Array(32768);
 for(let i=0;i<data.length;i+=4){
  const key=(data[i]>>3)*1024+(data[i+1]>>3)*32+(data[i+2]>>3);
  histogram[key]++;
 }
 const colors=[];
 histogram.forEach((count,key)=>{
  if(count)colors.push({rgb:[(key>>10)*8+4,((key>>5)&31)*8+4,(key&31)*8+4],count});
 });
 function measure(colors){
  const low=[255,255,255],high=[0,0,0];
  let count=0;
  for(const color of colors){
   count+=color.count;
   for(let i=0;i<3;i++){
    low[i]=Math.min(low[i],color.rgb[i]);
    high[i]=Math.max(high[i],color.rgb[i]);
   }
  }
  const ranges=high.map((value,i)=>value-low[i]);
  const axis=ranges.indexOf(Math.max(...ranges));
  return {colors,count,axis,score:ranges[axis]*Math.sqrt(count)};
 }
 const boxes=[measure(colors)];
 while(boxes.length<256){
  let best=0;
  for(let i=1;i<boxes.length;i++)if(boxes[i].score>boxes[best].score)best=i;
  const {colors,count,axis,score}=boxes[best];
  if(!score)break;
  colors.sort((a,b)=>a.rgb[axis]-b.rgb[axis]);
  let cut=1,seen=colors[0].count;
  while(cut<colors.length-1&&seen<count/2)seen+=colors[cut++].count;
  boxes.splice(best,1,measure(colors.slice(0,cut)),measure(colors.slice(cut)));
 }
 return boxes.map(({colors,count})=>[0,1,2].map(i=>
  Math.round(colors.reduce((sum,color)=>sum+color.rgb[i]*color.count,0)/count)
 ));
}

function pouchLZW(indices){
 let size=9,next=258,bits=0,accumulator=0;
 const dictionary=new Map(),out=[];
 function emit(code){
  accumulator|=code<<bits;
  bits+=size;
  while(bits>=8){out.push(accumulator&255);accumulator>>>=8;bits-=8;}
 }
 emit(256);
 let prefix=indices[0];
 for(let i=1;i<indices.length;i++){
  const value=indices[i],key=prefix*256+value,match=dictionary.get(key);
  if(match!==undefined){prefix=match;continue;}
  emit(prefix);
  if(next<4096){
   dictionary.set(key,next++);
   if(next>(1<<size)&&size<12)size++;
  }else{
   emit(256);dictionary.clear();size=9;next=258;
  }
  prefix=value;
 }
 emit(prefix);emit(257);
 if(bits)out.push(accumulator&255);
 return Uint8Array.from(out);
}

async function encodePouchGIF(context,draw,progress){
 const {width,height}=context.canvas;
 draw(1);
 const palette=pouchPalette(context.getImageData(0,0,width,height).data);
 const table=palette.flat();
 while(table.length<768)table.push(0);
 const word=n=>[n&255,(n>>8)&255];
 const parts=[Uint8Array.from([
  71,73,70,56,57,97,...word(width),...word(height),0xf7,0,0,...table,
  33,255,11,...Array.from('NETSCAPE2.0',c=>c.charCodeAt(0)),3,1,0,0,0
 ])];
 const lookup=new Int16Array(32768).fill(-1);
 function colorIndex(key){
  if(lookup[key]>=0)return lookup[key];
  const r=(key>>10)*8+4,g=((key>>5)&31)*8+4,b=(key&31)*8+4;
  let best=Infinity,index=0;
  for(let i=0;i<palette.length;i++){
   const [pr,pg,pb]=palette[i],score=(r-pr)**2+(g-pg)**2+(b-pb)**2;
   if(score<best){best=score;index=i;}
  }
  lookup[key]=index;
  return index;
 }
 function writeFrame(pixels,x,y,w,h,delay){
  const region=new Uint8Array(w*h);
  for(let row=0;row<h;row++){
   const offset=(y+row)*width+x;
   region.set(pixels.subarray(offset,offset+w),row*w);
  }
  const compressed=pouchLZW(region);
  parts.push(Uint8Array.from([33,249,4,4,...word(delay),0,0,44,...word(x),...word(y),...word(w),...word(h),0,8]));
  for(let i=0;i<compressed.length;i+=255){
   parts.push(Uint8Array.of(Math.min(255,compressed.length-i)),compressed.subarray(i,i+255));
  }
  parts.push(Uint8Array.of(0));
 }
 const range=(start,end)=>Array.from({length:Math.floor((end-start)/8)+1},(_,i)=>start+i*8);
 const stamps=[0,...range(30,150),...range(158,238),245,...range(301,365),370,400];
 let previous=null,pending=null;
 for(let i=0;i<stamps.length-1;i++){
  draw(stamps[i]/100);
  const data=context.getImageData(0,0,width,height).data;
  const pixels=new Uint8Array(width*height);
  let left=width,top=height,right=-1,bottom=-1;
  for(let j=0,k=0;j<pixels.length;j++,k+=4){
   const key=(data[k]>>3)*1024+(data[k+1]>>3)*32+(data[k+2]>>3);
   pixels[j]=colorIndex(key);
   if(previous&&pixels[j]!==previous[j]){
    const x=j%width,y=(j/width)|0;
    left=Math.min(left,x);right=Math.max(right,x);
    top=Math.min(top,y);bottom=Math.max(bottom,y);
   }
  }
  const delay=stamps[i+1]-stamps[i];
  if(!previous)pending={pixels,x:0,y:0,w:width,h:height,delay};
  else if(right<0)pending.delay+=delay;
  else{
   writeFrame(pending.pixels,pending.x,pending.y,pending.w,pending.h,pending.delay);
   pending={pixels,x:left,y:top,w:right-left+1,h:bottom-top+1,delay};
  }
  previous=pixels;
  progress(i+1,stamps.length-1);
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 writeFrame(pending.pixels,pending.x,pending.y,pending.w,pending.h,pending.delay);
 parts.push(Uint8Array.of(59));
 return new Blob(parts,{type:'image/gif'});
}
