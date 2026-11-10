'use strict';
const $=id=>document.getElementById(id), art=$('art'), W=1280,H=896,context=art.getContext('2d');
const presets=[
 ['香草葡萄','#c7a6e5','#acd1f2','#6952b6','#ffead0'],
 ['蜜桃苏打','#f5b7c6','#ffcbaa','#d4658f','#fff0d2'],
 ['青提牛奶','#c6dfa4','#a7dcca','#598e70','#fff2ca'],
 ['蓝莓奶霜','#a9c7ec','#c8bafa','#4c70ae','#eef7ff'],
 ['薄荷冰沙','#bce6d5','#b6dfeb','#4c9388','#effcf2'],
 ['粉芭乐','#f5b8bc','#c5dab3','#ba5c76','#fff2db'],
 ['柠檬酸奶','#f7e6a5','#d9e9c5','#af8b45','#fff8df'],
 ['海盐青柠','#b3dcdf','#d9e8b9','#53868d','#f5f8dd']
];
let material=1,charm=0,pattern=0,layout=0,customPalette=null;
const patternNames=['素面','細網格','小波點','斜格紋'];
const signatureFonts={
 serif:'500 "Noto Serif TC","Songti TC","Noto Serif CJK TC",serif',
 sans:'600 system-ui,"PingFang TC",sans-serif',
 hand:'500 "Kaiti TC","DFKai-SB","KaiTi",cursive',
 italic:'italic 500 Georgia,"Noto Serif TC","Songti TC",serif'
};
const materialNames=["珠光软胶","清透胶膜"], charmNames=["★ 星星","♥ 愛心","✿ 小花","⋈ 线条蝴蝶结","○ 无吊坠"];
const motionHints={
 cards:'拉開袋口，截圖從左到右依次浮起，再滑回袋裡。',
 pearl:'袋子停在目前的開合位置，一道斜光掃過膠膜。',
 sway:'袋子停在目前的開合位置，整只輕晃兩下，吊墜跟著回擺。',
 zip:'拉開拉鍊，停留展示後再拉回。'
};
let previewStart=null,previewPose=null,exporting=false,reading=false,gifURL=null;
let photos=[],chosen=0,automatic=false,picked=null,opening=0,frame=0,anim=0,epoch=0,downloadURL=null;
const clip=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const rgb=h=>h.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
const hex=v=>'#'+v.map(x=>Math.round(clip(x,0,255)).toString(16).padStart(2,'0')).join('');
function mix(a,b,t){const z=rgb(b);return hex(rgb(a).map((v,i)=>v+(z[i]-v)*t))}
function hsl(h,s,l){const f=n=>{const k=(n+h/30)%12;return 255*(l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1)))};return hex([f(0),f(8),f(4)])}
function takeColor(image){
 const tile=document.createElement('canvas');tile.width=tile.height=40;const c=tile.getContext('2d');
 c.drawImage(image,0,0,40,40);const pixels=c.getImageData(0,0,40,40).data,bins=Array(24).fill(0);
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255,hi=Math.max(r,g,b),d=hi-Math.min(r,g,b);
  if(d<.09||hi<.19||pixels[i+3]<160)continue;
  const h=((hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360,k=Math.floor(h/15);
  bins[k]+=.35+d;bins[(k+1)%24]+=.14;bins[(k+23)%24]+=.14;
 }
 const max=Math.max(...bins);
 if(!max)return ['自動 · 中性奶霜','#d4ccd8','#b7c7d8','#716185','#fff1db'];
 const h=bins.indexOf(max)*15+7.5;
 return ['自動取色',hsl(h,.57,.77),hsl((h+37)%360,.60,.81),hsl(h,.48,.42),hsl((h+22)%360,.76,.92)];
}
const theme=()=>automatic&&picked?picked:customPalette||presets[chosen];
function path(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function box(c,x,y,w,h,r,color){path(c,x,y,w,h,r);c.fillStyle=color;c.fill()}
function line(c,x,y,x2,y2,stops){const g=c.createLinearGradient(x,y,x2,y2);for(const [p,v] of stops)g.addColorStop(p,v);return g}
function curve(c,a){c.beginPath();c.moveTo(a[0],a[1]);c.bezierCurveTo(...a.slice(2))}
const wrinkles=[
 [132,399,169,459,116,559,179,641],[164,716,225,675,251,696,305,668],
 [954,170,1007,216,1089,173,1154,246],[1110,306,1167,417,1099,480,1152,550],
 [704,730,767,681,849,722,933,690],[150,268,198,229,242,273,311,230],
 [1119,627,1093,665,1115,690,1062,732],[325,742,372,711,437,728,501,703],
 [192,614,219,591,191,555,232,524],[958,720,997,699,995,662,1024,640],
 [139,333,216,286,260,312,319,268],[954,700,1022,647,1057,660,1108,584]
];
function reflection(c,points,strength,pearl='#ead6ff'){
 const [x,y,,,,,endX,endY]=points;
 c.save();c.lineCap='round';
 curve(c,points);
 c.strokeStyle=line(c,x,y,endX,endY,[[0,'#fffdf000'],[.22,'#fffdf020'],[.48,'#fffdf0a4'],[.66,'#fffdf052'],[1,'#fffdf000']]);
 c.globalAlpha=strength;c.shadowColor='#fff9f3';c.shadowBlur=5;c.lineWidth=5;c.stroke();
 c.shadowBlur=0;c.lineWidth=1.2;c.globalAlpha=strength*.76;
 c.strokeStyle=line(c,x,y,endX,endY,[[0,'#ffffff00'],[.29,'#ffffff00'],[.47,'#fffdf2da'],[.61,pearl+'92'],[.78,'#ffffff00'],[1,'#ffffff00']]);
 c.stroke();c.restore();
}
function example(c,i,x,y,w,h,t){
 const [,body,rim,zip,cream]=t;c.save();path(c,x,y,w,h,8);c.clip();c.translate(x,y);c.scale(w/180,h/340);c.textAlign='start';
 box(c,0,0,180,340,0,[cream,'#f6edf8','#edf4fc'][i]);box(c,0,0,180,21,0,body);
 c.fillStyle=zip;c.font='bold 11px system-ui';c.fillText(['我的書架','閱讀頁','主題封面'][i],15,42);
 if(i===0){for(let n=0;n<4;n++){const y=55+n*58;box(c,13,y,154,49,8,'#ffffffb0');box(c,21,y+6,28,35,4,[body,rim,zip,'#ebc381'][n]);c.font='8px system-ui';c.fillStyle=zip;c.fillText(['山川與月','午後的來信','雲的形狀','晚風書房'][n],57,y+16);box(c,57,y+23,72,2,1,body);box(c,57,y+31,47,2,1,rim)}}
 if(i===1){box(c,13,54,154,247,12,'#fff8dc');for(let n=0;n<14;n++){const y=69+n*15;if(n%4===1)box(c,22,y-3,112,10,4,body+'a0');box(c,23,y,120-n%3*15,2,1,zip+'9a')}}
 if(i===2){box(c,13,54,154,247,12,line(c,0,54,155,301,[[0,rim],[.62,body],[1,cream]]));c.fillStyle='#fff8d6';c.beginPath();c.arc(91,126,31,0,7);c.fill();c.font='italic 21px Georgia';c.fillStyle=zip;c.fillText('Theme Notes',29,208);c.font='7px system-ui';c.fillText('A LITTLE READING CLUB',45,226)}
 for(let n=0;n<4;n++){c.fillStyle=n===0?zip:body;c.beginPath();c.arc(48+n*28,320,3,0,7);c.fill()}
 c.restore();
}
function cards(c,t,cardTime){
 const count=photos.length||3,total=count<4?820:914,gap=count>=5?14:24,cell=(total-gap*(count-1))/count,start=(W-total)/2;
 for(let i=0;i<count;i++){
  const img=photos[i]?.image,ratio=img?img.width/img.height:.54,w=Math.min(cell,ratio*(count<5?408:380)),h=w/ratio;
  const y=451+(layout===0?(i%2?12:-5):0), order=i/Math.max(1,count-1);
  const rise=ease((cardTime-1.03-order*.35)/.42)*(1-ease((cardTime-2.04-(1-order)*.16)/.24));
  const lift=Math.min(61+order*14, y-h/2-220)*rise;
  c.save();c.translate(start+i*(cell+gap)+cell/2,y-lift);
  c.rotate(layout===0?((i-(count-1)/2)*.019+(order-.5)*.033*rise):0);
  c.shadowColor='#3e265b60';c.shadowBlur=20;c.shadowOffsetY=10;
  box(c,-w/2-5,-h/2-5,w+10,h+10,11,'#fff8ed');c.shadowColor='transparent';
  if(img){c.save();path(c,-w/2,-h/2,w,h,7);c.clip();c.drawImage(img,-w/2,-h/2,w,h);c.restore()}else example(c,i,-w/2,-h/2,w,h,t);
  if($('decor-tape').checked&&(i===0||i===count-1))drawTape(c,w,h,t,i===0);
  if(i===0&&$('index-tab').checked)drawIndexTab(c,w,h,t);
  c.restore();
 }
}
function drawTape(c,w,h,[,body,rim,zip,cream],first){
 const tapeWidth=Math.min(48,w*.7),tapeHeight=Math.min(14,h*.55);
 c.save();c.translate(first?w/2-tapeWidth*.55:-w/2+tapeWidth*.55,-h/2-4);c.rotate(first?.15:-.14);
 c.scale(tapeWidth/48,tapeHeight/14);
 c.beginPath();c.moveTo(-24,-7);c.lineTo(24,-7);c.lineTo(21,-3);c.lineTo(24,0);c.lineTo(21,4);c.lineTo(24,7);
 c.lineTo(-24,7);c.lineTo(-21,3);c.lineTo(-24,0);c.lineTo(-21,-4);c.closePath();
 c.fillStyle=line(c,-20,-8,20,8,[[0,mix(rim,cream,.45)+'e8'],[1,mix(body,cream,.27)+'e8']]);c.fill();
 c.strokeStyle=mix(zip,cream,.71);c.lineWidth=.8;c.stroke();c.clip();
 c.strokeStyle='#ffffff93';c.lineWidth=2;
 for(let x=-26;x<=26;x+=8){c.beginPath();c.moveTo(x,-8);c.lineTo(x+7,8);c.stroke();}
 c.restore();
}
function drawCandySeal(c,[,body,,zip,cream]){
 c.save();c.translate(167,660);c.rotate(-.16);
 c.shadowColor=zip+'46';c.shadowBlur=6;c.shadowOffsetY=3;
 box(c,-26,-18,52,36,18,line(c,-22,-17,22,18,[[0,cream],[1,mix(body,cream,.48)]]));
 c.shadowColor='transparent';path(c,-23,-15,46,30,15);c.strokeStyle='#ffffffcc';c.lineWidth=1.3;c.stroke();
 c.strokeStyle=mix(zip,'#473447',.23);c.lineWidth=1.5;c.lineJoin='round';
 c.beginPath();c.roundRect(-8,-6,16,12,5);
 c.moveTo(-8,0);c.lineTo(-16,-5);c.lineTo(-16,5);c.closePath();
 c.moveTo(8,0);c.lineTo(16,-5);c.lineTo(16,5);c.closePath();c.stroke();
 c.restore();
}
function drawSparkles(c,[,,,zip,cream],sweep){
 c.save();
 for(const [x,y,r] of [[1124,662,12],[1103,681,6],[1137,684,4]]){
  const size=r*(1+.24*sweep);
  c.beginPath();c.moveTo(x,y-size);
  c.quadraticCurveTo(x+1.8,y-1.8,x+size*.72,y);
  c.quadraticCurveTo(x+1.8,y+1.8,x,y+size);
  c.quadraticCurveTo(x-1.8,y+1.8,x-size*.72,y);
  c.quadraticCurveTo(x-1.8,y-1.8,x,y-size);c.closePath();
  c.fillStyle=mix(cream,'#ffffff',.51);c.fill();
  c.strokeStyle=mix(zip,cream,.35);c.lineWidth=1.15;c.stroke();
 }
 c.restore();
}
function drawIndexTab(c,w,h,t){
 const name=$('index-text').value.trim();
 if(!name)return;
 const [,body,,zip,cream]=t;
 c.save();c.translate(-w/2-5,-h/2+Math.min(40,h*.25));c.rotate(-.035);
 c.font='600 15px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';
 const width=Math.min(76,Math.ceil(c.measureText(name).width)+15);
 const x=7-width;
 c.shadowColor='#42324e30';c.shadowBlur=5;c.shadowOffsetY=2;
 box(c,x,0,width,23,5,mix(body,cream,.58)+'ed');
 c.shadowColor='transparent';
 path(c,x+.5,.5,width-1,22,4.5);c.strokeStyle='#ffffffc0';c.lineWidth=1;c.stroke();
 c.fillStyle=mix(zip,'#32223c',.42);c.fillText(name,x+width/2,11.5,width-8);
 c.restore();
}
function daylight(c){
 // The same soft light crosses the table and the film, so the pouch reads as transparent.
 c.save();
 c.translate(700,380);c.rotate(-.51);
 const light=line(c,0,-390,0,400,[[0,'#ffffff00'],[.26,'#ffffff00'],[.37,'#ffffff6b'],[.46,'#ffffff05'],[.63,'#ffffff00'],[.71,'#fffdfb8c'],[.84,'#ffffff07'],[1,'#ffffff00']]);
 c.fillStyle=light;c.fillRect(-1000,-390,2000,790);c.restore();
}
function bagMouth(open){
 const left=146,right=1134,y=204,slider=right-(right-left)*.90*open;
 const lower=x=>{
  const t=clip((x-slider)/(right-slider||1));
  return y+open*57*Math.sin(Math.PI*t)**2;
 };
 const xs=Array.from({length:81},(_,i)=>left+(right-left)*i/80);
 if(open>0)xs.push(slider);
 const points=xs.sort((a,b)=>a-b).map(x=>[x,lower(x)]);
 return {left,right,y,slider,lower,points};
}
function traceLip(c,mouth,from,to,offset=0){
 c.beginPath();
 c.moveTo(from,mouth.lower(from)+offset);
 // The front film and zipper tape use the exact same sampled curve.
 for(const [x,y] of mouth.points)if(x>from&&x<to)c.lineTo(x,y+offset);
 c.lineTo(to,mouth.lower(to)+offset);
}
function frontPanelPath(c,mouth,x,y,w,h){
 traceLip(c,mouth,x,x+w);
 c.lineTo(x+w,y+h);c.lineTo(x,y+h);c.closePath();
}
function patternInk(t){
 const mode=$('pattern-color').value;
 if(mode==='milk')return '#fff9ef';
 const [,body,,zip]=mode==='auto'&&picked?picked:t;
 return mix(zip,mix(body,'#fff9ef',.24),material===1?.34:.46);
}
function syncPatternColor(){
 const mode=$('pattern-color').value, ink=patternInk(theme());
 $('pattern-swatch').style.backgroundColor=ink;
 $('pattern-hint').textContent=mode==='auto'
  ?(picked?'取自首張截圖，濃淡可另外調整。':'上傳後跟隨首張截圖，目前跟隨袋身配色。')
  :mode==='theme'?'跟隨目前的袋身配色。':'所有配色都使用同一款奶白。';
}
function printPattern(c,x,y,w,h,t){
 if(!pattern)return;
 const ink=patternInk(t),strength=Number($('pattern-strength').value)/100;
 c.save();c.globalAlpha=strength;
 c.lineWidth=1.4;c.strokeStyle=ink;c.fillStyle=ink;
 if(pattern===2){
  c.beginPath();
  for(let row=0,yy=y+16;yy<y+h;row++,yy+=30)for(let xx=x+15+(row%2)*15;xx<x+w;xx+=30){
   c.moveTo(xx+2.6,yy);c.arc(xx,yy,2.6,0,Math.PI*2);
  }
  c.fill();
 }else{
  c.beginPath();
  if(pattern===1){
   for(let xx=x+14;xx<x+w;xx+=27){c.moveTo(xx,y);c.lineTo(xx,y+h);}
   for(let yy=y+14;yy<y+h;yy+=27){c.moveTo(x,yy);c.lineTo(x+w,yy);}
  }else{
   for(let xx=x-h;xx<x+w+h;xx+=34){c.moveTo(xx,y);c.lineTo(xx+h,y+h);c.moveTo(xx,y);c.lineTo(xx-h,y+h);}
  }
  c.stroke();
 }
 c.restore();
}
function pouch(c,{open=opening,swing=0,glint=0,cardTime=0,pearl=0,tilt=0,drift=0,lift=0}={}){
 const t=theme(),[,body,rim,zip,cream]=t,x=106,y=131,w=1068,h=628,p=open,clear=material===1,mouth=bagMouth(p);
 c.clearRect(0,0,W,H);
 c.fillStyle=line(c,0,0,W,H,clear?[[0,'#fffaf7'],[.5,'#f5edec'],[1,mix(rim,'#faf1f1',.88)]]:[[0,'#fff9ee'],[.49,mix(body,'#ffffff',.72)],[1,mix(rim,'#ffffff',.57)]]);
 c.fillRect(0,0,W,H);
 if(clear){
  daylight(c);
  const shadow=c.createRadialGradient(640,738,50,640,738,570);
  shadow.addColorStop(0,'#49343c38');shadow.addColorStop(1,'#49343c00');
  c.save();c.translate(0,552);c.scale(1,.27);c.fillStyle=shadow;c.fillRect(0,340,W,850);c.restore();
 }
 c.save();
 if(tilt||drift||lift){
  c.translate(W/2+drift,H/2+lift);c.rotate(tilt);c.translate(-W/2,-H/2);
 }
 c.save();c.shadowColor=clear?'#49343c2e':'#50346266';c.shadowBlur=clear?27:45;c.shadowOffsetY=clear?13:23;
 box(c,x,y,w,h,57,clear?'#f9f4f359':body);c.restore();
 c.save();path(c,x,y,w,h,57);c.clip();
 c.fillStyle=line(c,x,y,x+w,y+h,clear?[[0,'#ffffff6b'],[.28,'#ffffff15'],[.54,body+'0b'],[.81,'#8b758019'],[1,'#ffffff58']]:[[0,cream],[.23,body],[.61,mix(body,'#fff9f0',.15)],[1,rim]]);c.fillRect(x,y,w,h);
 c.fillStyle=line(c,0,y,0,y+h,[[0,'#ffffff68'],[.16,'#ffffff00'],[.84,'#ffffff00'],[1,clear?'#65566127':zip+'2b']]);c.fillRect(x,y,w,h);
 cards(c,t,cardTime);
 frontPanelPath(c,mouth,x,y,w,h);c.clip();
 printPattern(c,x,y,w,h,t);
 c.fillStyle=line(c,x,y,x+w,y+h,clear?[[0,'#fffaf152'],[.19,'#fffdfa12'],[.47,'#ffffff02'],[.69,'#ffffff06'],[.86,'#fffdf943'],[1,'#ffffff68']]:[[0,'#fff6ee54'],[.18,'#fff5ff20'],[.45,'#ffffff05'],[.62,'#ffffff03'],[.82,'#dfffff2b'],[1,'#fff4df58']]);c.fillRect(x,y,w,h);
 for(const [i,a] of wrinkles.entries()){
  if(clear&&i%3!==0&&i!==6)continue;
  reflection(c,a,[.60,.44,.24,.64,.35,.25,.54,.32,.20,.28,.32,.24][i],clear?'#fff7ed':i%2?'#e4eff9':'#f4dfeb');
 }
 if(clear){
  c.save();c.translate(640,390);c.rotate(-.52);
  c.fillStyle=line(c,0,-380,0,390,[[0,'#fffdfb00'],[.2,'#fffdfb00'],[.32,'#fffdfb29'],[.38,'#fffdfb06'],[.57,'#fffdfb00'],[.68,'#fffdfb30'],[.74,'#fffdfb08'],[1,'#fffdfb00']]);
  c.fillRect(-1000,-380,2000,770);c.restore();
 }
 if(pearl>0&&pearl<1){
  c.save();c.translate(-196+(W+392)*pearl,H/2);c.rotate(.29);
  c.fillStyle=line(c,-125,0,125,0,[[0,'#ffffff00'],[.3,rim+'16'],[.49,'#fff9e26b'],[.59,'#ffffff8c'],[.72,body+'22'],[1,'#ffffff00']]);
  c.fillRect(-125,-530,250,1060);c.restore();
 }
 c.restore();
 const seam=mix(rim,'#fff6ed',.48);
 const border=line(c,x,y,x+w,y+h,[[0,mix(seam,'#ffffff',.20)],[.32,seam],[.74,mix(seam,body,.19)],[1,mix(seam,zip,.17)]]);
 const edges=clear?[[5,9,'#fffdfa79'],[6,1.3,'#ffffffee'],[11,1.25,'#86748258'],[14,2,'#ffffffa0'],[18,.9,'#ffffff6b']]:[[6,17,border],[9,2.4,'#ffffffe0'],[16,1.5,'#ffffff68'],[22,1.3,'#fff8e2aa']];
 for(const [pad,size,ink] of edges){
  path(c,x+pad,y+pad,w-pad*2,h-pad*2,57-pad);
  c.lineWidth=size;c.strokeStyle=ink;c.setLineDash(pad===22?[4,5]:[]);c.stroke();
 }
 c.setLineDash([]);
 // A few interrupted reflections on the rounded seams rather than a rainbow border.
 reflection(c,[118,241,113,167,156,140,251,141],.72,'#ecdef3');
 reflection(c,[945,142,1041,140,1120,137,1160,216],.41,'#dfedf8');
 reflection(c,[1162,618,1158,709,1140,750,1040,751],.57,'#efdef1');
 if(glint>0&&glint<1){
  const center=x+45+(w-90)*glint;
  reflection(c,[center-44,y+12,center-25,y+9,center+15,y+9,center+44,y+12],Math.sin(Math.PI*glint)*.65);
 }
 zipper(c,t,p,mouth,clear,swing);
 if($('decor-candy').checked)drawCandySeal(c,t);
 if($('decor-stars').checked)drawSparkles(c,t,Math.max(0,1-Math.abs(pearl-.78)*9));
 const name=$('bag-name').value.trim();
 if(name){
  c.save();c.textAlign='right';c.textBaseline='alphabetic';
  const font=signatureFonts[$('name-font').value]||signatureFonts.serif;
  c.font=font.replace(/(\d+) /,'$1 '+$('name-size').value+'px ');
  c.shadowColor='#3f2b3f4a';c.shadowBlur=clear?3:0;c.shadowOffsetY=1;
  c.fillStyle=$('name-color').value;
  c.fillText(name,x+w-45,y+h-43,w-90);
  c.restore();
 }
 c.restore();
}
function starPath(c,r){
 const points=Array.from({length:10},(_,i)=>{
  const a=i*Math.PI/5-Math.PI/2, radius=i%2?r*.59:r;
  return [Math.cos(a)*radius,Math.sin(a)*radius];
 });
 const between=(a,b,f)=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
 c.beginPath();c.moveTo(...between(points[9],points[0],.77));
 for(let i=0;i<10;i++){
  const p=points[i], next=points[(i+1)%10];
  c.quadraticCurveTo(...p,...between(p,next,.23));
  c.lineTo(...between(p,next,.77));
 }
 c.closePath();
}
function charmPath(c,kind,r){
 if(kind===0){starPath(c,r);return;}
 c.beginPath();
 if(kind===1){
  c.moveTo(0,r*.89);
  c.bezierCurveTo(-r*.24,r*.68,-r*1.05,r*.11,-r*.89,-r*.43);
  c.bezierCurveTo(-r*.75,-r*.91,-r*.25,-r*.85,0,-r*.46);
  c.bezierCurveTo(r*.25,-r*.85,r*.75,-r*.91,r*.89,-r*.43);
  c.bezierCurveTo(r*1.05,r*.11,r*.24,r*.68,0,r*.89);
 }else if(kind===2){
  for(let i=0;i<=100;i++){
   const a=i/100*Math.PI*2-Math.PI/2, d=r*(.81+.19*Math.cos((a+Math.PI/2)*5));
   const x=Math.cos(a)*d,y=Math.sin(a)*d;
   if(i)c.lineTo(x,y);else c.moveTo(x,y);
  }

 }
 c.closePath();
}
function lineBow(c,zip,cream){
 c.save();c.translate(0,37);c.rotate(-.09);
 c.lineCap='round';c.lineJoin='round';
 c.beginPath();
 c.moveTo(0,-13);c.quadraticCurveTo(3,-7,0,0);
 c.moveTo(0,0);
 c.bezierCurveTo(-7,-8,-18,-17,-25,-12);
 c.bezierCurveTo(-33,-6,-26,5,-18,6);
 c.bezierCurveTo(-11,7,-5,3,0,0);
 c.bezierCurveTo(7,-8,18,-17,25,-12);
 c.bezierCurveTo(33,-6,26,5,18,6);
 c.bezierCurveTo(11,7,5,3,0,0);
 c.bezierCurveTo(-7,6,-8,16,-17,20);
 c.moveTo(0,0);c.bezierCurveTo(6,6,6,16,16,22);
 c.strokeStyle=mix(zip,'#392834',.25);
 c.lineWidth=4.6;c.shadowColor='#402b4042';c.shadowBlur=4;c.shadowOffsetY=2;c.stroke();
 c.shadowColor='transparent';c.strokeStyle=mix(zip,cream,.49);
 c.lineWidth=2.25;c.stroke();c.restore();
}
function drawCharm(c,cream,body,zip){
 if(charm===3){lineBow(c,zip,cream);return;}
 const [base,dark]=[['#ffdc82','#c69145'],['#f4a6c2','#b85b82'],['#cab4f2','#906bb6']][charm];
 const candy=mix(base,body,.12),light=mix(candy,'#ffffff',.62);
 c.translate(0,48);c.rotate(.24);
 c.shadowColor='#442b4954';c.shadowBlur=9;c.shadowOffsetY=4;
 charmPath(c,charm,30);c.fillStyle=line(c,-21,-24,24,30,[[0,light],[.3,mix(candy,cream,.32)],[.59,candy],[1,dark]]);c.fill();
 c.shadowColor='transparent';c.strokeStyle=dark+'9c';c.lineWidth=1;c.stroke();
 charmPath(c,charm,25.5);c.strokeStyle='#fff9ecdb';c.lineWidth=1.25;c.stroke();
 if(charm===2)box(c,-6,-6,12,12,6,line(c,-3,-5,5,6,[[0,'#fff7d8'],[1,'#edba62']]));
 if(charm<2){
  c.setLineDash([2,2]);charmPath(c,charm,22);c.strokeStyle='#fff8d899';c.lineWidth=.85;c.stroke();c.setLineDash([]);
 }
}
function zipper(c,t,p,mouth,clear,swing){
 const [,body,rim,zip,cream]=t,{left:x,right,y,slider}=mouth,w=right-x,count=81;
 const candy=mix(zip,'#ffffff',.46),deep=mix(zip,'#30243e',.16);
 const matte=mix(zip,'#f2e9e3',clear?.78:.68),toothShade=mix(matte,zip,.18);
 c.save();c.lineCap='round';c.lineJoin='round';
 // Back tape stays put; the front tape is fused to the edge of the film.
 for(const [front,offset,tape,edge] of [
  [false,-4,mix(rim,'#fff6ea',clear?.86:.66),'#fffefaac'],
  [true,4,mix(body,'#fff8ec',clear?.85:.62),'#fff9ecba']
 ]){
  if(front)traceLip(c,mouth,x,right,offset);
  else {c.beginPath();c.moveTo(x,y+offset);c.lineTo(right,y+offset);}
  c.strokeStyle=clear?'#7265743c':zip+'55';c.lineWidth=13;c.stroke();
  c.strokeStyle=tape;c.lineWidth=10;c.stroke();
  c.strokeStyle=edge;c.lineWidth=1.4;c.stroke();
 }
 for(let i=0;i<count;i++)for(const front of [false,true]){
  const at=x+i*w/count+(front?4.5:0);
  const yy=front?mouth.lower(at)+2.9:y-2.9;
  const slope=front?Math.atan2(mouth.lower(at+1)-mouth.lower(at-1),2):0;
  c.save();c.translate(at,yy);c.rotate(slope);
  box(c,-4,-2.25,8.1,4.5,1.5,toothShade);
  box(c,-3.7,-2.25,7.5,2.75,1.25,matte);
  c.restore();
 }
 c.translate(slider,y+3);c.rotate(-.12-p*.31);
 const sliderPaint=line(c,-19,-12,20,20,[[0,'#fff4fb'],[.26,candy],[.69,zip],[1,deep]]);
 c.shadowColor='#39214368';c.shadowBlur=9;c.shadowOffsetY=4;
 box(c,-21,-12,43,23,9,sliderPaint);
 c.shadowColor='transparent';
 path(c,-16,-9,33,13,6);c.strokeStyle='#ffffff85';c.lineWidth=1;c.stroke();
 if(charm!==4){
  c.beginPath();c.ellipse(0,15,6,11,0,0,Math.PI*2);c.strokeStyle=deep;c.lineWidth=5;c.stroke();
  c.strokeStyle='#fff4e8c0';c.lineWidth=1.25;c.stroke();
  c.translate(0,24);c.rotate(swing);c.translate(0,-24);
  drawCharm(c,cream,body,zip);
 }
 c.restore();
}
function render(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;pouch(context,previewPose||undefined);const mini=$('floating-art');if(mini){const c=mini.getContext('2d');c.clearRect(0,0,mini.width,mini.height);c.drawImage(art,0,0,mini.width,mini.height)}})}
function sync(){
 $('material-label').textContent=materialNames[material]+' · 1280 × 896';
 $('material-hint').textContent=material===1?'透明前片、細雙封邊與柔和的斜向反光。':'半透明珠光袋身，搭配奶白滾邊。';
 for(const [id,value] of [['materials',material],['patterns',pattern],['charms',charm]]){
  for(const button of $(id).children)button.setAttribute('aria-pressed',String(Number(button.dataset.index)===value));
 }
 $('pattern-strength').disabled=pattern===0;
 $('pattern-color').disabled=pattern===0;
 syncPatternColor();
 $('summary').textContent=theme()[0]+' · '+(photos.length?photos.length+' 张截图':'3 张示例');
 $('hint').textContent=automatic?'更換或移除首張截圖時會重新取色。':'袋身、滾邊和拉鍊會一起換色。';
 $('auto').setAttribute('aria-pressed',String(automatic));
 for(const b of $('colors').children)b.setAttribute('aria-pressed',String(!automatic&&!customPalette&&Number(b.dataset.index)===chosen));
 $('thumbs').replaceChildren();
 photos.forEach((pic,i)=>{const b=document.createElement('button');b.type='button';b.textContent='×';b.setAttribute('aria-label','移除 '+pic.name);b.style.backgroundImage='url('+pic.thumb+')';b.onclick=()=>{photos.splice(i,1);picked=photos.length?takeColor(photos[0].image):null;if(!picked)automatic=false;$('status').textContent=photos.length?'已移除截圖。':'已回到示例。';sync()};$('thumbs').append(b)});
 render();
}
async function read(file){
 const u=URL.createObjectURL(file),img=new Image();
 try{img.src=u;await img.decode();const s=Math.min(1,1440/Math.max(img.naturalWidth,img.naturalHeight)),image=document.createElement('canvas');image.width=Math.max(1,Math.round(img.naturalWidth*s));image.height=Math.max(1,Math.round(img.naturalHeight*s));image.getContext('2d').drawImage(img,0,0,image.width,image.height);
 const m=document.createElement('canvas');m.width=36;m.height=44;m.getContext('2d').drawImage(image,0,0,36,44);return {image,thumb:m.toDataURL('image/jpeg',.7),name:file.name}}finally{URL.revokeObjectURL(u)}
}
async function upload(files){
 const list=[...files];if(!list.length||exporting)return;
 reading=true;$('save-gif').disabled=true;
 const version=++epoch,next=[];$('status').textContent='正在讀取圖片…';
 for(const f of list.slice(0,6)){try{next.push(await read(f))}catch{}if(version!==epoch)return}
 reading=false;$('save-gif').disabled=false;
 if(!next.length){$('status').textContent='讀不到圖片，請試試 PNG、JPG 或 WebP。';return}
 photos=next;picked=takeColor(next[0].image);
 $('status').textContent='已放入 '+next.length+' 張'+(list.length>6?'，最多保留前 6 張':next.length<list.length?'，部分圖片讀取失敗':'')+'。';sync();
}
for(const [i,t] of presets.entries()){
 const b=document.createElement('button');b.type='button';b.dataset.index=i;const dot=document.createElement('i');dot.style.background='linear-gradient(135deg,'+t[4]+' 35%,'+t[1]+' 36% 67%,'+t[3]+' 68%)';b.append(dot,t[0]);b.onclick=()=>{chosen=i;automatic=false;customPalette=null;sync()};$('colors').append(b);
}
for(const [id,labels,choose] of [['materials',materialNames,i=>{material=i}],['patterns',patternNames,i=>{pattern=i}],['charms',charmNames,i=>{charm=i}]]){
 for(const [i,label] of labels.entries()){
  const button=document.createElement('button');button.type='button';button.dataset.index=i;button.textContent=label;
  button.onclick=()=>{choose(i);sync()};$(id).append(button);
 }
}
$('auto').onclick=()=>{if(!photos.length){$('status').textContent='先上传截图，就能从首张图片自动取色。';return}automatic=true;customPalette=null;sync()};
$('custom-color').addEventListener('input',e=>{const {h}=StudioColors.hexToHSV(e.target.value), base=e.target.value;customPalette=['自选颜色',base,StudioColors.hsvToHex(h+34,28,96),StudioColors.hsvToHex(h,50,46),StudioColors.hsvToHex(h+18,35,98)];automatic=false;sync()});
for(const [i,label] of ['错落摆放','整齐排列'].entries()){const b=document.createElement('button');b.type='button';b.dataset.index=i;b.textContent=label;b.setAttribute('aria-pressed',String(layout===i));b.onclick=()=>{layout=i;for(const x of $('layouts').children)x.setAttribute('aria-pressed',String(Number(x.dataset.index)===layout));render()};$('layouts').append(b)}
$('index-tab').onchange=()=>{$('index-text').disabled=!$('index-tab').checked;render();};
$('index-text').oninput=render;
$('bag-name').oninput=render;
$('name-font').onchange=render;
$('name-color').oninput=render;
$('name-size').oninput=()=>{$('name-size-value').textContent=$('name-size').value+' px';render();};
$('pattern-color').onchange=()=>{syncPatternColor();render();};
$('pattern-strength').oninput=()=>{$('pattern-value').textContent=$('pattern-strength').value+'%';render();};
for(const id of ['decor-tape','decor-candy','decor-stars'])$(id).onchange=render;
$('motion-mode').onchange=()=>{
 stopLoop();
 $('motion-hint').textContent=motionHints[$('motion-mode').value];
};
$('files').onchange=e=>{upload(e.target.files);e.target.value=''};
$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files)};
function setOpen(v){opening=clip(v);$('open').value=Math.round(opening*100);$('zip').textContent=opening>.5?'拉上拉鍊':'拉開拉鍊';render()}
const ease=t=>{const u=clip(t);return u*u*(3-2*u);};
function loopPose(t,mode,baseOpen){
 if(mode==='pearl')return {open:baseOpen,pearl:ease((t-.38)/1.96)};
 if(mode==='sway'){
  const phase=clip((t-.30)/1.98), envelope=Math.sin(Math.PI*phase)**2;
  return {
   open:baseOpen,
   tilt:.053*envelope*Math.sin(phase*Math.PI*4),
   drift:16*envelope*Math.sin(phase*Math.PI*4),
   lift:-14*envelope,
   swing:.30*envelope*Math.sin(phase*Math.PI*4-.9)
  };
 }
 const settle=t-.95;
 return {
  open:ease((t-.25)/.70)*(1-ease((t-2.95)/.75)),
  swing:settle>0&&settle<.65?-.18*Math.sin(settle*16)*Math.exp(-settle*6):0,
  glint:clip((t-1.40)/1.05),
  cardTime:mode==='cards'?t:0
 };
}
function labelPreview(playing){
 $('play-loop').textContent=playing?'停止預覽':'預覽動效';
 $('preview-on-canvas').textContent=$('play-loop').textContent;
}
function stopLoop(){
 if(previewStart===null)return;
 cancelAnimationFrame(anim);previewStart=null;previewPose=null;
 labelPreview(false);render();
}
$('play-loop').onclick=$('preview-on-canvas').onclick=()=>{
 if(previewStart!==null){stopLoop();return;}
 cancelAnimationFrame(anim);
 const mode=$('motion-mode').value,baseOpen=opening;
 previewStart=performance.now();
 labelPreview(true);
 $('preview-on-canvas').scrollIntoView({block:'nearest'});
 const tick=now=>{
  const t=(now-previewStart)/1000;
  if(t>=4){stopLoop();return;}
  previewPose=loopPose(t,mode,baseOpen);render();anim=requestAnimationFrame(tick);
 };
 anim=requestAnimationFrame(tick);
};
$('open').oninput=e=>{stopLoop();cancelAnimationFrame(anim);setOpen(Number(e.target.value)/100)};
$('zip').onclick=()=>{stopLoop();cancelAnimationFrame(anim);const a=opening,b=a>.5?0:1,start=performance.now();if(matchMedia('(prefers-reduced-motion: reduce)').matches){setOpen(b);return}const tick=now=>{const t=clip((now-start)/520);setOpen(a+(b-a)*ease(t));if(t<1)anim=requestAnimationFrame(tick)};anim=requestAnimationFrame(tick)};
$('save').onclick=()=>{
 const c=document.createElement('canvas');c.width=W;c.height=H;pouch(c.getContext('2d'));$('save').disabled=true;
 c.toBlob(async blob=>{$('save').disabled=false;if(!blob){$('status').textContent='PNG 生成失败，请再试一次。';return}if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(blob);try{await StudioNative.save(blob,'zip-bag.png');$('status').textContent='PNG 已生成并发送到保存流程。'}catch(error){$('status').textContent=error.message==='cancelled'?'已取消保存。':'PNG 已生成，可点击链接下载。';const a=document.createElement('a');a.href=downloadURL;a.download='zip-bag.png';a.textContent='下载 PNG';$('status').append(' ',a)}},'image/png');
};
$('save-gif').onclick=async()=>{
 if(exporting||reading)return;
 exporting=true;stopLoop();cancelAnimationFrame(anim);
 const mode=$('motion-mode').value,baseOpen=opening;
 const controls=[...document.querySelectorAll('.work button,.work input,.work select')].filter(el=>!el.disabled);
 controls.forEach(el=>{el.disabled=true;});
 const notice=$('gif-status'),link=$('gif-download');
 notice.textContent='正在準備 GIF…';
 const c=document.createElement('canvas');c.width=960;c.height=672;
 const out=c.getContext('2d',{alpha:false,willReadFrequently:true});out.scale(c.width/W,c.height/H);
 try{
  const blob=await encodePouchGIF(out, t=>pouch(out,loopPose(t,mode,baseOpen)), (done,total)=>{
   notice.textContent='正在製作 GIF · '+Math.round(done/total*100)+'%';
  });
  if(gifURL)URL.revokeObjectURL(gifURL);
  gifURL=URL.createObjectURL(blob);link.href=gifURL;link.download='zip-bag.gif';
  link.hidden=false;link.click();
  notice.textContent='GIF 已產生 · '+(blob.size/1048576).toFixed(1)+' MB';
 }catch(error){
  console.error(error);notice.textContent='GIF 產生失敗，請再試一次。';
 }finally{
  exporting=false;controls.forEach(el=>{el.disabled=false;});
 }
};
$('motion-mode').onchange();sync();pouch(context);render();
(()=>{const box=$('float-preview'),head=$('float-head'),toggle=$('float-toggle');try{const pos=JSON.parse(localStorage.getItem('zipbag-preview-position')||'null');if(pos){box.style.left=pos.x+'px';box.style.top=pos.y+'px';box.style.right='auto';box.style.bottom='auto'}}catch{}let drag=null;head.addEventListener('pointerdown',e=>{if(e.target===toggle)return;const r=box.getBoundingClientRect();drag={x:e.clientX-r.left,y:e.clientY-r.top};head.setPointerCapture(e.pointerId)});head.addEventListener('pointermove',e=>{if(!drag)return;const x=Math.max(8,Math.min(innerWidth-box.offsetWidth-8,e.clientX-drag.x)),y=Math.max(8,Math.min(innerHeight-box.offsetHeight-8,e.clientY-drag.y));box.style.left=x+'px';box.style.top=y+'px';box.style.right='auto';box.style.bottom='auto'});head.addEventListener('pointerup',()=>{if(!drag)return;drag=null;const r=box.getBoundingClientRect();try{localStorage.setItem('zipbag-preview-position',JSON.stringify({x:r.left,y:r.top}))}catch{}});toggle.onclick=()=>{const folded=box.classList.toggle('folded');toggle.textContent=folded?'＋':'−';toggle.setAttribute('aria-label',folded?'展开悬浮预览':'收起悬浮预览')};})();
