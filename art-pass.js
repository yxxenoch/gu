/* art-pass：同色层叠投影、漏光与暗角、和纸胶带、动画节奏 */
(()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=n=>{const v=Math.sin(n*91.345+12.9898)*43758.5453;return v-Math.floor(v);};
const easeInOutCubic=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
function hsl(hex){try{let h=String(hex).replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const n=parseInt(h.slice(0,6),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;let H=0,S=0;if(d){S=d/(1-Math.abs(2*l-1));H=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;H*=60;if(H<0)H+=360;}return[H,S,l];}catch{return[40,.2,.9];}}
const paper=()=>{try{return hsl(state.paper);}catch{return[40,.2,.9];}};
const hsla=(h,s,l,a)=>`hsla(${h.toFixed(0)},${(s*100).toFixed(0)}%,${(l*100).toFixed(0)}%,${a})`;
const scale=ctx=>{const t=ctx.getTransform();return Math.hypot(t.a,t.b)||1;};
function rr(ctx,x,y,w,h,r){r=clamp(r,0,Math.min(w,h)/2);ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h);}
// 层叠投影：5 层由近到远，颜色取纸面色相而非纯黑，光源统一在左上
function cardBase(ctx,r,rad,fill){const[h,s]=paper(),k=scale(ctx),sat=clamp(s*.7+.12,.12,.45);ctx.fillStyle=fill;rr(ctx,r.x,r.y,r.w,r.h,rad);
 const L=r.lift||1;for(const[d0,a0]of[[1,.14],[2.5,.10],[6,.085],[13,.07],[26,.06]]){const d=d0<2?d0:d0*L,a=d0<2?a0:a0/Math.sqrt(L);ctx.shadowColor=hsla(h,sat,.2,a);ctx.shadowBlur=d*1.6*k;ctx.shadowOffsetX=d*.45*k;ctx.shadowOffsetY=d*k;ctx.fill();}
 ctx.shadowColor='transparent';ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.shadowBlur=0;}
// 从图片采样主色调，返回 {r,g,b} 或 null
// 图片主色取均值而非最饱和的一个像素；缓存避免每次预览重复读取
const toneCache=new WeakMap();
function tone(img){
 if(!img||!img.complete||!img.naturalWidth)return null;
 if(toneCache.has(img))return toneCache.get(img);
 let out=null;
 try{
  const cv=document.createElement('canvas');cv.width=cv.height=20;
  const g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,20,20);
  const d=g.getImageData(0,0,20,20).data;let rs=0,gs=0,bs=0,total=0;
  for(let i=0;i<d.length;i+=4){
   if(d[i+3]<170)continue;
   const r=d[i],g=d[i+1],b=d[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
   if(hi<28||lo>238)continue;
   const saturation=(hi-lo)/Math.max(hi,1),weight=.4+Math.min(saturation,.8)*.9;
   rs+=r*weight;gs+=g*weight;bs+=b*weight;total+=weight;
  }
  if(total)out={r:Math.round(rs/total),g:Math.round(gs/total),b:Math.round(bs/total)};
 }catch{}toneCache.set(img,out);return out;
}
// 胶片漏光：暖色从左上溢入、冷色在右下回应，再加一层同色暗角收住画面
function leak(ctx,W,H,time,animate,night,color){const ph=animate?(Math.sin(time/4200)+1)/2:.4,M=Math.max(W,H),[h]=paper();
 const blob=(x,y,R,c,a)=>{const g=ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,R*M);g.addColorStop(0,`rgba(${c},${a})`);g.addColorStop(.45,`rgba(${c},${a*.45})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);};
 ctx.save();
 // 浅色纸面上 screen 几乎无效，先用 multiply 给纸面染上暖色，再用 screen 让照片高光发亮
 ctx.globalCompositeOperation='multiply';blob(-.05+.06*ph,-.04,.85,'255,178,128',night?.25:.62);blob(.34+.1*ph,-.08,.45,'255,150,160',night?.18:.38);blob(1.04,1.04,.7,'150,186,236',night?.25:.42);
 ctx.globalCompositeOperation='screen';blob(-.05+.06*ph,-.04,.6,'255,196,140',night?.30:.22);
 ctx.globalCompositeOperation='multiply';const v=ctx.createRadialGradient(W/2,H*.47,Math.min(W,H)*.34,W/2,H/2,Math.hypot(W,H)*.58);v.addColorStop(0,'rgba(255,255,255,0)');v.addColorStop(1,hsla(h,.30,night?.38:.6,night?.55:.5));ctx.fillStyle=v;ctx.fillRect(0,0,W,H);ctx.restore();}
// v2 相片级漏光：只覆盖照片本身，禁止跨越相框、纸张、文字、贴纸
// 三种艺术倾向，不做整页 multiply 染色。静态可复现，高清导出与预览一致。
function filmLight(ctx,r,img,opt={}){
 if(!img||opt.enabled===false)return;
 const w=r.w,h=r.h;
 if(!(w>1&&h>1))return;
 const style=['film','prism','haze'].includes(opt.style)?opt.style:'film';
 const value=Number.isFinite(+opt.strength)?+opt.strength:36;
 const t=Math.pow(clamp(value,0,100)/100,.9)*(opt.night?.84:1);
 if(t<=0)return;
 const base=tone(img)||{r:203,g:171,b:151};
 const mix=(arr,q)=>arr.map((v,i)=>Math.round(v*(1-q)+base[['r','g','b'][i]]*q));
 const amber=mix([255,172,119],.16),pink=mix([244,139,164],.14),blue=mix([146,199,231],.13),milk=[255,239,211];
 const rgba=(rgb,a)=>'rgba('+rgb.join(',')+','+Math.min(.95,Math.max(0,a)).toFixed(4)+')';
 const ellipse=(x,y,rx,ry,color,alpha)=>{
  if(rx<=0||ry<=0||alpha<=0)return;
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,rgba(color,alpha));
  g.addColorStop(.25,rgba(color,alpha*.78));
  g.addColorStop(.68,rgba(color,alpha*.23));
  g.addColorStop(1,rgba(color,0));
  ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
 };
 const strip=(color,alpha,width,fromRight=false)=>{
  const g=ctx.createLinearGradient(fromRight?w:0,0,fromRight?w-width:width,0);
  g.addColorStop(0,rgba(color,alpha));g.addColorStop(.12,rgba(color,alpha*.5));
  g.addColorStop(.5,rgba(color,alpha*.11));g.addColorStop(1,rgba(color,0));
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 };
 const dir=(Number(opt.seed)||0)%2===0?1:-1;
 ctx.save();ctx.translate(r.x,r.y);
 ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
 // soft-light 仅给照片染色，保留图像原有明暗，不形成不透明的色块
 ctx.globalCompositeOperation='soft-light';
 if(style==='film'){
  strip(amber,t*.65,w*.43,dir<0);
  ellipse(dir>0?-w*.03:w*1.03,h*.16,w*.58,h*.22,amber,t*.68);
  ellipse(dir>0?w*.01:w*.99,h*.61,w*.48,h*.27,pink,t*.43);
  ellipse(dir>0?w*.92:w*.08,h*.87,w*.31,h*.18,blue,t*.24);
 }else if(style==='prism'){
  ctx.save();ctx.translate(w*.35,h*.48);ctx.rotate(-.16*dir);
  ellipse(-dir*w*.36,-h*.17,w*.31,h*.42,amber,t*.62);
  ellipse(-dir*w*.23,-h*.10,w*.24,h*.44,pink,t*.49);
  ellipse(-dir*w*.08,-h*.03,w*.17,h*.45,blue,t*.39);
  ctx.restore();
 }else{
  ellipse(w*.18,h*.24,w*.9,h*.34,milk,t*.55);
  ellipse(w*.72,h*.71,w*.76,h*.33,pink,t*.19);
 }
 // screen 高光淡淡透出，不在整幅画布添加暗角
 ctx.globalCompositeOperation='screen';
 if(style==='film'){
  ellipse(dir>0?w*.035:w*.965,h*.24,w*.37,h*.17,milk,t*.45);
  ellipse(dir>0?w*.035:w*.965,h*.68,w*.31,h*.21,amber,t*.29);
  strip(milk,t*.16,w*.13,dir<0);
 }else if(style==='prism'){
  ellipse(dir>0?w*.07:w*.93,h*.31,w*.28,h*.24,milk,t*.37);
  ellipse(dir>0?w*.27:w*.73,h*.56,w*.22,h*.25,blue,t*.25);
 }else{
  ellipse(w*.16,h*.22,w*.78,h*.27,milk,t*.42);
  ellipse(w*.66,h*.73,w*.45,h*.24,amber,t*.19);
 }
 ctx.restore();
}
const drift=(t,i)=>Math.sin(t/(1900+hash(i)*1600)+i*2.3)*(5+hash(i+3)*5);
const wobble=(t,i)=>Math.sin(t/(2600+hash(i+9)*1800)+i)*.07;
function burst(t){const L=1.35,seg=Math.floor(t/L),local=t-seg*L;if(hash(seg)<.38)return 0;const n=1+Math.floor(hash(seg+17)*3);for(let q=0;q<n;q++){const s=.12+q*(.11+hash(seg+q)*.06);if(local>s&&local<s+.055+hash(seg+q*5)*.03)return 1;}return 0;}
window.GuArt={tone,cardBase,leak,filmLight,drift,wobble,burst,tear:easeInOutCubic};
})();
