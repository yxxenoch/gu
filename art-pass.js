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
 for(const[d,a]of[[1,.14],[2.5,.10],[6,.085],[13,.07],[26,.06]]){ctx.shadowColor=hsla(h,sat,.2,a);ctx.shadowBlur=d*1.6*k;ctx.shadowOffsetX=d*.45*k;ctx.shadowOffsetY=d*k;ctx.fill();}
 ctx.shadowColor='transparent';ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.shadowBlur=0;}
// 胶片漏光：暖色从左上溢入、冷色在右下回应，再加一层同色暗角收住画面
function leak(ctx,W,H,time,animate,night){const ph=animate?(Math.sin(time/4200)+1)/2:.4,M=Math.max(W,H),[h]=paper();
 ctx.save();ctx.globalCompositeOperation='screen';
 for(const[x,y,R,c,a]of[[-.04+.05*ph,-.03,.78,'255,166,104',night?.26:.46],[.30+.10*ph,-.06,.42,'255,120,128',night?.16:.28],[1.03,1.02,.62,'128,176,255',night?.18:.18]]){const g=ctx.createRadialGradient(x*W,y*H,0,x*W,y*H,R*M);g.addColorStop(0,`rgba(${c},${a})`);g.addColorStop(.42,`rgba(${c},${a*.42})`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
 ctx.globalCompositeOperation='multiply';const v=ctx.createRadialGradient(W/2,H*.47,Math.min(W,H)*.38,W/2,H/2,Math.hypot(W,H)*.6);v.addColorStop(0,'rgba(255,255,255,0)');v.addColorStop(1,hsla(h,.32,night?.4:.66,night?.5:.42));ctx.fillStyle=v;ctx.fillRect(0,0,W,H);ctx.restore();}
// 和纸胶带：半透明、锯齿撕口、细斜纹，每张卡颜色和角度不同
const TAPES=['232,201,168','206,217,194','236,190,190','198,210,226','240,222,166','214,200,228'];
function tape(ctx,r,transform){const i=r.index||0,c=TAPES[Math.floor(hash(i+7)*TAPES.length)],w=clamp(r.w*.36,52,128),h=clamp(w*.25,17,30),k=scale(ctx);
 ctx.save();transform&&transform();ctx.translate(r.x+r.w*(.5+(hash(i+13)-.5)*.2),r.y+2);ctx.rotate((hash(i+11)-.5)*.34);
 ctx.beginPath();ctx.moveTo(-w/2,-h/2);ctx.lineTo(w/2,-h/2);for(let j=1;j<=6;j++)ctx.lineTo(w/2+(j%2?-2.6:0),-h/2+h*j/6);ctx.lineTo(-w/2,h/2);for(let j=5;j>=0;j--)ctx.lineTo(-w/2+(j%2?2.6:0),-h/2+h*j/6);ctx.closePath();
 ctx.shadowColor='rgba(70,48,28,.20)';ctx.shadowBlur=3*k;ctx.shadowOffsetY=1.2*k;ctx.fillStyle=`rgba(${c},.80)`;ctx.fill();ctx.shadowColor='transparent';
 ctx.clip();ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2.4;for(let x=-w;x<w;x+=8){ctx.beginPath();ctx.moveTo(x,-h/2);ctx.lineTo(x+h,h/2);ctx.stroke();}
 ctx.fillStyle='rgba(255,255,255,.20)';ctx.fillRect(-w/2,-h/2,w,h*.3);ctx.restore();}
const drift=(t,i)=>Math.sin(t/(1900+hash(i)*1600)+i*2.3)*(5+hash(i+3)*5);
const wobble=(t,i)=>Math.sin(t/(2600+hash(i+9)*1800)+i)*.07;
function burst(t){const L=1.35,seg=Math.floor(t/L),local=t-seg*L;if(hash(seg)<.38)return 0;const n=1+Math.floor(hash(seg+17)*3);for(let q=0;q<n;q++){const s=.12+q*(.11+hash(seg+q)*.06);if(local>s&&local<s+.055+hash(seg+q*5)*.03)return 1;}return 0;}
window.GuArt={cardBase,leak,tape,drift,wobble,burst,tear:easeInOutCubic};
})();
