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
// V3: 光影仅在单张照片内部，静态、可复现，不遮盖模板文字与纸纹
function filmLight(ctx,r,img,opt={}){
 if(!img||opt.enabled===false||r.w<=1||r.h<=1)return;
 const w=r.w,h=r.h,style=['film','prism','haze'].includes(opt.style)?opt.style:'film';
 const amount=Number.isFinite(Number(opt.strength))?Number(opt.strength):36;
 const t=Math.pow(clamp(amount,0,100)/100,.96)*(opt.night?.90:1);
 if(t<.001)return;
 const base=tone(img)||{r:185,g:168,b:151};
 const adjust=(a,q)=>a.map((v,i)=>Math.round(v*(1-q)+base[['r','g','b'][i]]*q));
 const coral=adjust([248,112,122],.15),orange=adjust([255,164,102],.16);
 const gold=adjust([255,209,148],.09),icy=adjust([128,198,227],.12);
 const lavender=adjust([181,158,227],.13),pearl=[255,248,232];
 const rgba=(c,a)=>'rgba('+c[0]+','+c[1]+','+c[2]+','+clamp(a,0,.92).toFixed(4)+')';
 function bloom(x,y,rx,ry,col,opacity,angle=0){
  if(!opacity)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(rx,ry);
  const grd=ctx.createRadialGradient(-.10,-.04,.01,0,0,1);
  grd.addColorStop(0,rgba(col,opacity));grd.addColorStop(.17,rgba(col,opacity*.91));
  grd.addColorStop(.44,rgba(col,opacity*.52));grd.addColorStop(.76,rgba(col,opacity*.105));
  grd.addColorStop(1,rgba(col,0));ctx.fillStyle=grd;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 function ribbon(x,y,span,length,col,opacity,angle){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const g=ctx.createLinearGradient(-span/2,0,span/2,0);
  g.addColorStop(0,rgba(col,0));g.addColorStop(.18,rgba(col,opacity*.12));
  g.addColorStop(.42,rgba(col,opacity*.69));g.addColorStop(.53,rgba(col,opacity));
  g.addColorStop(.69,rgba(col,opacity*.42));g.addColorStop(1,rgba(col,0));
  ctx.fillStyle=g;ctx.fillRect(-span/2,-length/2,span,length);ctx.restore();
 }
 const dir=(Math.abs(Math.trunc(Number(opt.seed)||0))%2===0)?1:-1;
 const X=x=>dir===1?x*w:(1-x)*w;
 ctx.save();ctx.translate(r.x,r.y);ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
 if(style==='film'){
  ctx.globalCompositeOperation='soft-light';
  bloom(X(-.13),h*.20,w*.55,h*.55,orange,t*.83,-dir*.08);
  bloom(X(.045),h*.60,w*.36,h*.32,coral,t*.64,dir*.17);
  bloom(X(-.09),h*.83,w*.29,h*.25,gold,t*.30);
  bloom(X(.24),-h*.03,w*.35,h*.27,coral,t*.19);
  ctx.globalCompositeOperation='screen';
  bloom(X(-.04),h*.22,w*.25,h*.19,pearl,t*.57);
  bloom(X(.045),h*.57,w*.18,h*.17,gold,t*.32);
  ribbon(X(-.015),h*.49,w*.14,h*1.24,orange,t*.21,dir*.016);
  bloom(X(-.02),h*.78,w*.12,h*.09,pearl,t*.20);
 }else if(style==='prism'){
  const ang=dir*.21;
  ctx.globalCompositeOperation='soft-light';
  bloom(X(.04),h*.39,w*.53,h*.69,lavender,t*.28,ang);
  ribbon(X(.10),h*.43,w*.31,h*1.48,coral,t*.51,ang);
  ribbon(X(.20),h*.42,w*.22,h*1.51,gold,t*.54,ang);
  ribbon(X(.30),h*.42,w*.28,h*1.54,icy,t*.45,ang);
  ctx.globalCompositeOperation='screen';
  bloom(X(.09),h*.19,w*.24,h*.27,pearl,t*.33,ang);
  ribbon(X(.175),h*.45,w*.10,h*1.38,pearl,t*.18,ang);
  bloom(X(.36),h*.77,w*.27,h*.23,lavender,t*.14);
 }else{
  ctx.globalCompositeOperation='soft-light';
  bloom(w*.11,h*.13,w*.82,h*.47,pearl,t*.72,-.16);
  bloom(w*.85,h*.67,w*.71,h*.53,gold,t*.38,.15);
  bloom(w*.36,h*.92,w*.58,h*.34,lavender,t*.11);
  ctx.globalCompositeOperation='screen';
  bloom(w*.17,h*.22,w*.42,h*.27,pearl,t*.30,-.13);
  bloom(w*.79,h*.72,w*.31,h*.27,pearl,t*.16);
  bloom(w*.05,h*.52,w*.20,h*.19,gold,t*.10);
 }
 ctx.restore();
}
const drift=(t,i)=>Math.sin(t/(1900+hash(i)*1600)+i*2.3)*(5+hash(i+3)*5);
const wobble=(t,i)=>Math.sin(t/(2600+hash(i+9)*1800)+i)*.07;
function burst(t){const L=1.35,seg=Math.floor(t/L),local=t-seg*L;if(hash(seg)<.38)return 0;const n=1+Math.floor(hash(seg+17)*3);for(let q=0;q<n;q++){const s=.12+q*(.11+hash(seg+q)*.06);if(local>s&&local<s+.055+hash(seg+q*5)*.03)return 1;}return 0;}
window.GuArt={tone,cardBase,leak,filmLight,drift,wobble,burst,tear:easeInOutCubic};
})();
