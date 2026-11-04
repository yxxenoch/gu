/* Lossless indexed GIF optimization: LZW, differential rectangles, exact duplicate merging. */
function StudioGIFCodec(){
 let width,height,previous,palette,lookup,writer,transparentIndex,lastDelayAt=-1,lastTicks=0;
 function byteWriter(){let a=new Uint8Array(65536),length=0;return{get length(){return length},byte(v){if(length===a.length){let n=new Uint8Array(a.length*2);n.set(a);a=n}a[length++]=v},word(v){this.byte(v&255);this.byte(v>>8)},patchWord(p,v){a[p]=v&255;a[p+1]=v>>8},text(t){for(let i=0;i<t.length;i++)this.byte(t.charCodeAt(i))},bytes(b){if(length+b.length>a.length){let size=a.length;while(size<length+b.length)size*=2;let n=new Uint8Array(size);n.set(a);a=n}a.set(b,length);length+=b.length},finish(){return a.slice(0,length)}}}
 function getPalette(rgba){
  let counts=new Uint32Array(32768),sums=new Float64Array(32768*3);
  for(let p=0;p<rgba.length;p+=16){let r=rgba[p],g=rgba[p+1],b=rgba[p+2],key=(r>>3)<<10|(g>>3)<<5|(b>>3);counts[key]++;sums[key*3]+=r;sums[key*3+1]+=g;sums[key*3+2]+=b}
  let values=[];for(let k=0;k<32768;k++)if(counts[k])values.push(k);
  function box(keys){let lo=[31,31,31],hi=[0,0,0],count=0;for(let k of keys){let rgb=[k>>10,(k>>5)&31,k&31];count+=counts[k];for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],rgb[j]);hi[j]=Math.max(hi[j],rgb[j])}}let ranges=hi.map((v,i)=>v-lo[i]),axis=ranges.indexOf(Math.max(...ranges));return{keys,count,axis,score:ranges[axis]*Math.sqrt(count)}}
  let boxes=[box(values)];while(boxes.length<255){let idx=-1,score=0;for(let i=0;i<boxes.length;i++)if(boxes[i].keys.length>1&&boxes[i].score>score){score=boxes[i].score;idx=i}if(idx<0)break;let b=boxes[idx],shift=10-b.axis*5;let keys=b.keys.sort((a,c)=>((a>>shift)&31)-((c>>shift)&31)),sum=0,split=1;for(let i=0;i<keys.length-1;i++){sum+=counts[keys[i]];split=i+1;if(sum>=b.count/2)break}boxes.splice(idx,1,box(keys.slice(0,split)),box(keys.slice(split)))}
  let colors=boxes.map(b=>{let sum=[0,0,0];for(let k of b.keys)for(let j=0;j<3;j++)sum[j]+=sums[k*3+j];return sum.map(v=>Math.round(v/b.count))});
  colors.sort((a,b)=>(a[0]*.21+a[1]*.72+a[2]*.07)-(b[0]*.21+b[1]*.72+b[2]*.07));while(colors.length<255)colors.push(colors[colors.length-1]||[0,0,0]);colors.unshift([0,0,0]);
  let table=new Uint8Array(32768);for(let key=0;key<32768;key++){let r=(key>>10)*8+4,g=((key>>5)&31)*8+4,b=(key&31)*8+4,best=1,distance=Infinity;for(let p=1;p<256;p++){let c=colors[p],dr=r-c[0],dg=g-c[1],db=b-c[2],d=dr*dr*.25+dg*dg*.60+db*db*.15;if(d<distance){distance=d;best=p}}table[key]=best}
  return{colors,table};
 }
 function lzw(pixels){
  let out=byteWriter(),dictionary=new Map(),next=258,size=9,max=511,acc=0,bits=0;
  function emit(code){acc|=code<<bits;bits+=size;while(bits>=8){out.byte(acc&255);acc>>>=8;bits-=8}if(next>max&&size<12){size++;max=(1<<size)-1}}
  emit(256);let prefix=pixels[0];for(let i=1;i<pixels.length;i++){let symbol=pixels[i],key=(prefix<<8)|symbol,known=dictionary.get(key);if(known!==undefined){prefix=known;continue}emit(prefix);if(next<4096)dictionary.set(key,next++);else{emit(256);dictionary.clear();next=258;size=9;max=511}prefix=symbol}emit(prefix);emit(257);if(bits)out.byte(acc&255);return out.finish();
 }
 function header(w,h,colors,loop,transparent){width=w;height=h;previous=null;palette=colors.map(c=>[...c]);while(palette.length<256)palette.push([0,0,0]);writer=byteWriter();lastDelayAt=-1;lastTicks=0;transparentIndex=transparent;writer.text('GIF89a');writer.word(w);writer.word(h);writer.bytes([247,0,0]);for(let c of palette)writer.bytes(c);if(loop){writer.bytes([33,255,11]);writer.text('NETSCAPE2.0');writer.bytes([3,1,0,0,0])}}
 function emitFrame(pixels,delay){let ticks=Math.max(1,Math.round(delay/10)),x0=width,y0=height,x1=-1,y1=-1;if(previous){for(let y=0,p=0;y<height;y++)for(let x=0;x<width;x++,p++)if(pixels[p]!==previous[p]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}else{x0=y0=0;x1=width-1;y1=height-1}
  if(x1<0&&lastDelayAt>=0){let add=Math.min(ticks,65535-lastTicks);writer.patchWord(lastDelayAt,lastTicks+add);lastTicks+=add;ticks-=add;if(!ticks)return;x0=y0=x1=y1=0}
  let w=x1-x0+1,h=y1-y0+1,opaque=new Uint8Array(w*h),sparse=previous&&transparentIndex!==null?new Uint8Array(w*h):null;for(let y=0;y<h;y++){let start=(y+y0)*width+x0;opaque.set(pixels.subarray(start,start+w),y*w);if(sparse)for(let x=0;x<w;x++)sparse[y*w+x]=pixels[start+x]===previous[start+x]?transparentIndex:pixels[start+x]}
  let packed=lzw(opaque),useTransparency=false;if(sparse){let alt=lzw(sparse);if(alt.length<packed.length){packed=alt;useTransparency=true}}
  let remaining=ticks;do{let chunk=Math.min(remaining,65535);writer.bytes([33,249,4,useTransparency?5:4]);lastDelayAt=writer.length;lastTicks=chunk;writer.word(chunk);writer.bytes([transparentIndex||0,0,44]);writer.word(x0);writer.word(y0);writer.word(w);writer.word(h);writer.bytes([0,8]);for(let p=0;p<packed.length;p+=255){let n=Math.min(255,packed.length-p);writer.byte(n);writer.bytes(packed.subarray(p,p+n))}writer.byte(0);remaining-=chunk}while(remaining>0);previous=pixels.slice();
 }
 return {init(w,h,rgba,loop=true){let result=getPalette(rgba);lookup=result.table;header(w,h,result.colors,loop,0)},initIndexed(w,h,colors,loop=false){lookup=null;header(w,h,colors,loop,null)},indexedFrame(pixels,delay){if(pixels.length!==width*height)throw Error('GIF frame dimensions mismatch');emitFrame(pixels,delay)},frame(rgba,delay){const pixels=new Uint8Array(width*height),dither=[-1.5,.5,1.5,-.5];for(let p=0;p<pixels.length;p++){let o=p*4,v=dither[((p%width)&1)+((Math.floor(p/width)&1)<<1)],r=Math.max(0,Math.min(255,rgba[o]+v)),g=Math.max(0,Math.min(255,rgba[o+1]+v)),b=Math.max(0,Math.min(255,rgba[o+2]+v));pixels[p]=lookup[(r>>3)<<10|(g>>3)<<5|(b>>3)]}emitFrame(pixels,delay)},finish(){writer.byte(59);return writer.finish()}};
}
window.StudioGIFCodec=StudioGIFCodec;
