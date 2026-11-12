/* 审美提升：卡片相纸质感、浮光、动画缓动与节奏（art-pass） */
(()=>{'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=n=>{const v=Math.sin(n*91.345+12.9898)*43758.5453;return v-Math.floor(v);};
const easeInOutCubic=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
function rr(ctx,x,y,w,h,r){r=clamp(r,0,Math.min(w,h)/2);ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):ctx.rect(x,y,w,h);}
// 两层投影：远处柔和的环境阴影 + 贴纸面的接触阴影
function cardBase(ctx,r,rad,fill){ctx.fillStyle=fill;ctx.shadowColor='#19282016';ctx.shadowBlur=36;ctx.shadowOffsetY=20;rr(ctx,r.x,r.y,r.w,r.h,rad);ctx.fill();ctx.shadowColor='#19282033';ctx.shadowBlur=3;ctx.shadowOffsetY=1.5;ctx.fill();ctx.shadowColor='transparent';}
// 相纸白边 + 内缘压线 + 斜向反光
function photo(ctx,img,r,p,rad,cover){const pad=clamp(Math.min(r.w,r.h)*.032,4,11),m={x:r.x+pad,y:r.y+pad,w:r.w-pad*2,h:r.h-pad*2},ir=Math.max(0,rad-pad*.7);
 ctx.save();rr(ctx,m.x,m.y,m.w,m.h,ir);ctx.clip();cover(ctx,img,m,p);
 const v=ctx.createLinearGradient(m.x,m.y,m.x,m.y+m.h);v.addColorStop(0,'#ffffff10');v.addColorStop(.55,'#ffffff00');v.addColorStop(1,'#2a1e1414');ctx.fillStyle=v;ctx.fillRect(m.x,m.y,m.w,m.h);ctx.restore();
 ctx.save();ctx.strokeStyle='#2a201826';ctx.lineWidth=.8;rr(ctx,m.x+.4,m.y+.4,m.w-.8,m.h-.8,ir);ctx.stroke();
 const g=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);g.addColorStop(0,'#ffffff00');g.addColorStop(.34,'#ffffff00');g.addColorStop(.42,'#ffffff1f');g.addColorStop(.5,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.restore();}
// 浮光：一束从左上斜入的柔光，动图模式下缓慢呼吸、平移
function light(ctx,W,H,time,animate,night){const ph=animate?(Math.sin(time/5200)+1)/2:.5,cx=W*(.08+.14*ph),cy=-H*.05,R=Math.hypot(W,H)*.9;
 ctx.save();ctx.globalCompositeOperation=night?'screen':'soft-light';
 const g=ctx.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,night?'#fff3d633':'#fff6dc8c');g.addColorStop(.45,night?'#fff3d610':'#fff6dc2e');g.addColorStop(1,'#fff6dc00');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.globalCompositeOperation=night?'screen':'overlay';ctx.translate(cx,cy);ctx.rotate(.62+.05*(ph-.5));
 for(const [o,w,a] of [[.16,.07,.16],[.3,.035,.12],[.42,.09,.08]]){const x=W*o;const s=ctx.createLinearGradient(x-W*w,0,x+W*w,0);s.addColorStop(0,'#fff8e400');s.addColorStop(.5,'#fff8e4'+Math.round(a*(night?.6:1)*255).toString(16).padStart(2,'0'));s.addColorStop(1,'#fff8e400');ctx.fillStyle=s;ctx.fillRect(x-W*w,0,W*w*2,R*1.2);}
 ctx.restore();}
// 碎片：每片周期不同，带轻微摆动
const drift=(t,i)=>Math.sin(t/(1900+hash(i)*1600)+i*2.3)*(5+hash(i+3)*5);
const wobble=(t,i)=>Math.sin(t/(2600+hash(i+9)*1800)+i)*.07;
// 故障：大部分时间安静，偶尔连闪 1–3 下
function burst(t){const L=1.35,seg=Math.floor(t/L),local=t-seg*L;if(hash(seg)<.38)return 0;const n=1+Math.floor(hash(seg+17)*3);for(let k=0;k<n;k++){const s=.12+k*(.11+hash(seg+k)*.06);if(local>s&&local<s+.055+hash(seg+k*5)*.03)return 1;}return 0;}
window.GuArt={cardBase,photo,light,drift,wobble,burst,tear:easeInOutCubic};
})();
