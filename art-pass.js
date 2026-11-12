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
function tone(img){try{if(!img||!img.complete||!img.naturalWidth)return null;const cs=24,cv=document.createElement('canvas');cv.width=cv.height=cs;const c2=cv.getContext('2d');c2.drawImage(img,0,0,cs,cs);const pix=c2.getImageData(0,0,cs,cs).data;let pixels=[];for(let i=0;i<pix.length;i+=4){const r=pix[i],g=pix[i+1],b=pix[i+2],a=pix[i+3];if(a<128)continue;const max=Math.max(r,g,b),min=Math.min(r,g,b),sat=(max-min)/(max+min+1);if(max<40||max>240||sat<.15)continue;pixels.push({r,g,b,s:sat,l:(max+min)/2});}if(!pixels.length)return null;pixels.sort((a,b)=>b.s*b.l-a.s*a.l);const p=pixels[0];return{r:p.r,g:p.g,b:p.b};}catch{return null;}}
// 胶片漏光：暖色从左上溢入、冷色在右下回应，再加一层同色暗角收住画面
function leak(ctx,W,H,time,animate,night,color){const ph=animate?(Math.sin(time/4200)+1)/2:.4,M=Math.max(W,H),[h]=paper();
 const blob=(x,y,R,c,a)=>{const g=ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,R*M);g.addColorStop(0,`rgba(${c},${a})`);g.addColorStop(.45,`rgba(${c},${a*.45})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);};
 ctx.save();
 // 浅色纸面上 screen 几乎无效，先用 multiply 给纸面染上暖色，再用 screen 让照片高光发亮
 ctx.globalCompositeOperation='multiply';blob(-.05+.06*ph,-.04,.85,'255,178,128',night?.25:.62);blob(.34+.1*ph,-.08,.45,'255,150,160',night?.18:.38);blob(1.04,1.04,.7,'150,186,236',night?.25:.42);
 ctx.globalCompositeOperation='screen';blob(-.05+.06*ph,-.04,.6,'255,196,140',night?.30:.22);
 ctx.globalCompositeOperation='multiply';const v=ctx.createRadialGradient(W/2,H*.47,Math.min(W,H)*.34,W/2,H/2,Math.hypot(W,H)*.58);v.addColorStop(0,'rgba(255,255,255,0)');v.addColorStop(1,hsla(h,.30,night?.38:.6,night?.55:.5));ctx.fillStyle=v;ctx.fillRect(0,0,W,H);ctx.restore();}
const drift=(t,i)=>Math.sin(t/(1900+hash(i)*1600)+i*2.3)*(5+hash(i+3)*5);
const wobble=(t,i)=>Math.sin(t/(2600+hash(i+9)*1800)+i)*.07;
function burst(t){const L=1.35,seg=Math.floor(t/L),local=t-seg*L;if(hash(seg)<.38)return 0;const n=1+Math.floor(hash(seg+17)*3);for(let q=0;q<n;q++){const s=.12+q*(.11+hash(seg+q)*.06);if(local>s&&local<s+.055+hash(seg+q*5)*.03)return 1;}return 0;}
window.GuArt={tone,cardBase,leak,drift,wobble,burst,tear:easeInOutCubic};
})();
