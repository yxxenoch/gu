/* 共享水印编辑器：素材来源 小红书 @春雨楼雪 */
(function(){
'use strict';
if(!/\/(huajian|magazine)\.html$/.test(location.pathname))return;
const key=location.pathname.includes("huajian")?"huajian":"magazine";
const storage="gu-watermark-v1-"+key;
const baseState={enabled:false,idx:0,mode:"soft-light",opacity:.35,zoom:1,rotate:0,x:0,y:0,fit:"cover",scope:"photo",drag:false};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
let state={...baseState};
try{const old=JSON.parse(localStorage.getItem(storage)||"null");if(old&&typeof old==="object")state={...state,...old,drag:false}}catch(e){}
state.idx=clamp(state.idx,0,14);state.opacity=clamp(state.opacity,0,1);state.zoom=clamp(state.zoom,.2,3);
const modes=["soft-light","multiply","overlay","screen","source-over"];
if(!modes.includes(state.mode))state.mode="soft-light";
if(!["photo","canvas"].includes(state.scope))state.scope="photo";
let epoch=0, pendingRepaint=false;
function repaint(){epoch++;if(pendingRepaint)return;pendingRepaint=true;requestAnimationFrame(()=>{pendingRepaint=false;window.dispatchEvent(new Event("gu-watermark-changed"));});}
let history=[],future=[],committed={...state},catalog=null,catalogPromise=null,img=null,imgIndex=-1,imagePromise=null;
let canvas=null,overlay=null,details=null,thumbs=null,notice=null,dragStart=null;
const persist=()=>{try{const{drag,...settings}=state;localStorage.setItem(storage,JSON.stringify(settings))}catch(e){}};
const inform=msg=>{if(notice)notice.textContent=msg;};
function getCatalog(){
 if(catalog)return Promise.resolve(catalog);
 if(catalogPromise)return catalogPromise;
 catalogPromise=new Promise((resolve,reject)=>{
   if(window.GuWatermarkCatalog){catalog=window.GuWatermarkCatalog;resolve(catalog);return}
   const script=document.createElement("script");script.src="watermark-catalog.js?v=watermark-trial-2";
   script.onload=()=>{catalog=window.GuWatermarkCatalog;Array.isArray(catalog)&&catalog.length===15?resolve(catalog):reject(Error("水印清单不完整"))};
   script.onerror=()=>reject(Error("无法加载水印素材库"));document.head.append(script);
 }).catch(error=>{catalogPromise=null;inform(error.message);throw error});
 return catalogPromise;
}
function ready(){
 if(!state.enabled)return Promise.resolve();
 return getCatalog().then(items=>{
   populate();
   if(imgIndex===state.idx&&img?.naturalWidth)return;
   if(imgIndex===state.idx&&imagePromise)return imagePromise;
   const i=state.idx, picture=new Image();imgIndex=i;img=null;
   imagePromise=new Promise((resolve,reject)=>{
     picture.onload=()=>{if(imgIndex===i){img=picture;imagePromise=null;repaint()}resolve()};
     picture.onerror=()=>{if(imgIndex===i){imgIndex=-1;imagePromise=null}reject(Error("水印图片读取失败"))};
     picture.src=items[i].full;
   });
   inform("正在载入 "+items[i].name);
   return imagePromise.then(()=>inform(items[i].name+" · 已载入")).catch(e=>{inform(e.message);throw e});
 });
}
function paintImage(ctx,x,y,w,h){
 if(!state.enabled||imgIndex!==state.idx||!img?.naturalWidth||w<=0||h<=0)return;
 const iw=img.naturalWidth,ih=img.naturalHeight;
 const scale=(state.fit==="contain"?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih))*state.zoom;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.globalAlpha=state.opacity;ctx.globalCompositeOperation=state.mode;
 ctx.translate(x+w/2+w*state.x/100,y+h/2+h*state.y/100);
 ctx.rotate(state.rotate*Math.PI/180);
 ctx.drawImage(img,-iw*scale/2,-ih*scale/2,iw*scale,ih*scale);
 ctx.restore();
}
function paint(ctx,w,h){if(state.scope==="canvas")paintImage(ctx,0,0,w,h)}
function paintArea(ctx,x,y,w,h){if(state.scope==="photo")paintImage(ctx,x,y,w,h)}
window.GuWatermark={paint,paintArea,ready,get enabled(){return state.enabled},get scope(){return state.scope},get epoch(){return epoch}};
function drawOverlay(){
 if(!overlay||!canvas)return;
 overlay.style.left=canvas.offsetLeft+"px";overlay.style.top=canvas.offsetTop+"px";
 overlay.style.width=canvas.clientWidth+"px";overlay.style.height=canvas.clientHeight+"px";
 overlay.style.pointerEvents=state.enabled&&state.drag?"auto":"none";
 // 水印现在实际绘制进模板 Canvas，透明层只负责可选的触摸拖动，避免预览重复叠色。
}
function refresh(){
 if(!details)return;
 const $=id=>details.querySelector('[data-wm="'+id+'"]');
 for(const id of ["enabled","drag","mode","fit","scope"]){const el=$(id);if(el){if(el.type==="checkbox")el.checked=!!state[id];else el.value=state[id]}}
 for(const id of ["opacity","zoom","rotate","x","y"]){
   const input=$(id),v=["opacity","zoom"].includes(id)?Math.round(state[id]*100):Math.round(state[id]);
   if(input)input.value=v;
   const output=details.querySelector('[data-out="'+id+'"]');
   if(output)output.textContent=v+(["opacity","zoom"].includes(id)?"%":id==="rotate"?"°":"");
 }
 thumbs?.querySelectorAll("button").forEach((el,i)=>el.classList.toggle("chosen",i===state.idx));
 $("undo").disabled=!history.length;$("redo").disabled=!future.length;
 $("label").textContent=state.enabled?"已开启 · "+(catalog?.[state.idx]?.name||"水印图层"):"默认关闭，不影响原版作品";
}
function commit(patch){
 const old=JSON.stringify(committed);
 if(patch)Object.assign(state,patch);
 if(old!==JSON.stringify(state)){history.push({...committed});if(history.length>40)history.shift();future=[];committed={...state};persist()}
 refresh();drawOverlay();repaint();if(state.enabled)ready().catch(()=>{});
}
function undo(dir){
 const a=dir==="undo"?history:future,b=dir==="undo"?future:history;
 if(!a.length)return;b.push({...committed});state={...a.pop()};committed={...state};persist();refresh();drawOverlay();repaint();
 if(state.enabled)ready().catch(()=>{});
}
function populate(){
 if(!thumbs||thumbs.dataset.done||!catalog)return;
 catalog.forEach((item,i)=>{
  const b=document.createElement("button");b.type="button";b.className="guwm-thumb";b.title=item.name;
  b.setAttribute("aria-label","使用水印 "+item.name);
  const photo=document.createElement("img");photo.src=item.thumb;photo.alt="";photo.loading="lazy";
  const label=document.createElement("span");label.textContent=String(i+1).padStart(2,"0")+" "+item.name;
  b.append(photo,label);b.onclick=()=>commit({idx:i,enabled:true,mode:item.mode,opacity:item.opacity});
  thumbs.append(b);
 });
 thumbs.dataset.done="1";refresh();
}
function setup(){
 const background=document.getElementById("panel-background");canvas=document.getElementById("preview");
 const nav=document.querySelector(".tabs");if(!background||!canvas||!nav)return;
 const tab=document.createElement("button");tab.type="button";tab.className="tab";tab.textContent="水印";tab.setAttribute("role","tab");
 const panel=document.createElement("section");panel.id="panel-watermark";panel.className="panel";panel.setAttribute("role","tabpanel");
 if(key==="huajian"){tab.dataset.panel="watermark";tab.setAttribute("aria-selected","false");nav.querySelector('[data-panel="export"]')?.before(tab);background.after(panel);}
 else{tab.id="tab-watermark";tab.dataset.tab="watermark";tab.setAttribute("aria-controls","panel-watermark");tab.setAttribute("aria-selected","false");tab.tabIndex=-1;nav.querySelector('[data-tab="background"]')?.after(tab);background.after(panel);}
 tab.onclick=()=>{if(key==="huajian")window.GuSwitchPanel?.("watermark");else window.GuMagazineSwitchTab?.("watermark");details.open=true;getCatalog().then(populate).catch(()=>{});};
 const parent=canvas.parentElement;if(getComputedStyle(parent).position==="static")parent.style.position="relative";
 overlay=document.createElement("div");overlay.className="guwm-layer";overlay.setAttribute("aria-hidden","true");parent.append(overlay);
 const style=document.createElement("style");
 style.textContent=`
.guwm-layer{display:block;position:absolute;z-index:4;max-width:none!important;max-height:none!important;touch-action:none}
.guwm-details{border:1px solid #cad7ce;border-radius:12px;background:#fafbf7;padding:12px;color:#345345;font:12px/1.5 system-ui,sans-serif}
.guwm-details summary{font-size:14px;font-weight:700;cursor:pointer;list-style:revert}
.guwm-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:11px 0}
.guwm-row input[type=range]{min-width:0;flex:1;accent-color:#547b64}
.guwm-row output{min-width:36px;text-align:right}.guwm-row select{max-width:55%;border:1px solid #c9d4cb;border-radius:8px;padding:7px;font-size:12px}
.guwm-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0}
.guwm-thumb{min-width:0;padding:5px;border:1px solid #d5ded4;border-radius:8px;background:white;color:#51665c;cursor:pointer}
.guwm-thumb.chosen{outline:2px solid #527b65}.guwm-thumb img{width:100%;height:62px;display:block;object-fit:cover;border-radius:5px}
.guwm-thumb span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;font:10px system-ui,sans-serif}
.guwm-buttons{display:flex;gap:7px;flex-wrap:wrap}.guwm-buttons button{border:1px solid #c9d4cb;border-radius:8px;background:#edf3eb;padding:8px;color:#315b45;font-size:12px}
.guwm-buttons button:disabled{opacity:.45}.guwm-credit{color:#6d8071;font-size:11px;line-height:1.7;margin:10px 0 0}
`;
 document.head.append(style);
 const section=document.createElement("div");section.className="section guwm-section";
 section.innerHTML=`
<details class="guwm-details"><summary>✦ 春雨楼雪 · 水印素材库（15 款）</summary>
<div class="guwm-row"><label><input data-wm="enabled" type="checkbox"> 启用水印</label><span data-wm="status"></span></div>
<p class="guwm-credit" data-wm="label"></p><div class="guwm-grid" data-wm="thumbs"></div>
<div class="guwm-row"><label>混合方式</label><select data-wm="mode"><option value="soft-light">柔光</option><option value="multiply">正片叠底</option><option value="screen">滤色</option><option value="overlay">叠加</option><option value="source-over">正常</option></select></div>
<div class="guwm-row"><label>作用范围</label><select data-wm="scope"><option value="photo">跟随每张图片（推荐）</option><option value="canvas">覆盖整张返图</option></select></div>
<div class="guwm-row"><label>纹理适配</label><select data-wm="fit"><option value="cover">填满图片区域</option><option value="contain">完整显示底纹</option></select></div>
<div class="guwm-row"><label>透明度</label><input data-wm="opacity" aria-label="水印透明度" type="range" min="0" max="100"><output data-out="opacity"></output></div>
<div class="guwm-row"><label>缩放</label><input data-wm="zoom" aria-label="水印缩放" type="range" min="20" max="300"><output data-out="zoom"></output></div>
<div class="guwm-row"><label>旋转</label><input data-wm="rotate" aria-label="水印旋转" type="range" min="-180" max="180"><output data-out="rotate"></output></div>
<div class="guwm-row"><label>左右</label><input data-wm="x" aria-label="水印水平位置" type="range" min="-100" max="100"><output data-out="x"></output></div>
<div class="guwm-row"><label>上下</label><input data-wm="y" aria-label="水印垂直位置" type="range" min="-100" max="100"><output data-out="y"></output></div>
<div class="guwm-row"><label><input data-wm="drag" type="checkbox"> 在预览上拖动水印（暂时锁住图片拖动）</label></div>
<div class="guwm-buttons"><button type="button" data-wm="undo">撤销</button><button type="button" data-wm="redo">重做</button><button type="button" data-wm="reset">关闭并重置</button></div>
<p class="guwm-credit">纹理默认按照每张图片的实际宽高独立适配，不拉伸变形。悬浮预览、主画面与 PNG、JPG、GIF 使用相同渲染结果。<br>素材来源：小红书 @春雨楼雪（已获授权），仅影响当前模板。</p></details>`;
 panel.append(section);details=section.querySelector("details");thumbs=details.querySelector('[data-wm="thumbs"]');notice=details.querySelector('[data-wm="status"]');
 details.addEventListener("toggle",()=>{if(details.open)getCatalog().then(populate).catch(()=>{})});
 for(const el of details.querySelectorAll("[data-wm]")){
  const id=el.dataset.wm;
  if(["enabled","drag","mode","fit","scope"].includes(id))el.addEventListener("change",()=>commit({[id]:el.type==="checkbox"?el.checked:el.value}));
  if(["opacity","zoom","rotate","x","y"].includes(id)){
   const convert=()=>["opacity","zoom"].includes(id)?Number(el.value)/100:Number(el.value);
   el.addEventListener("input",()=>{state[id]=convert();drawOverlay();repaint();const out=details.querySelector('[data-out="'+id+'"]');if(out)out.textContent=el.value+(["opacity","zoom"].includes(id)?"%":id==="rotate"?"°":"")});
   el.addEventListener("change",()=>commit());
  }
 }
 details.querySelector('[data-wm="undo"]').onclick=()=>undo("undo");
 details.querySelector('[data-wm="redo"]').onclick=()=>undo("redo");
 details.querySelector('[data-wm="reset"]').onclick=()=>commit({...baseState});
 overlay.addEventListener("pointerdown",e=>{if(!state.enabled||!state.drag)return;e.preventDefault();overlay.setPointerCapture(e.pointerId);dragStart={id:e.pointerId,x:e.clientX,y:e.clientY,ox:state.x,oy:state.y}});
 overlay.addEventListener("pointermove",e=>{if(!dragStart||e.pointerId!==dragStart.id)return;const r=overlay.getBoundingClientRect();state.x=clamp(dragStart.ox+(e.clientX-dragStart.x)/r.width*100,-100,100);state.y=clamp(dragStart.oy+(e.clientY-dragStart.y)/r.height*100,-100,100);refresh();drawOverlay();repaint()});
 const end=e=>{if(dragStart?.id===e.pointerId){dragStart=null;commit()}};overlay.addEventListener("pointerup",end);overlay.addEventListener("pointercancel",end);
 if(typeof ResizeObserver==="function")new ResizeObserver(drawOverlay).observe(canvas);
 new MutationObserver(drawOverlay).observe(canvas,{attributes:true,attributeFilter:["width","height","style","class"]});
 window.addEventListener("resize",drawOverlay,{passive:true});
 refresh();drawOverlay();if(state.enabled)ready().catch(()=>{});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();
