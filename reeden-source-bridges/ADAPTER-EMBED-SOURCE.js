
(function(){
'use strict';
const cfg=__CFG__,root=document.getElementById('gu-reeden-output'),img=document.getElementById('gu-reeden-img');
const qs=x=>x.startsWith('#')?document.querySelector(x):document.getElementById(x);
let generation=0;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const put=(id,value)=>{const e=document.getElementById(id);if(!e||!('value'in e)||value==null)return;if(e.type==='checkbox')e.checked=!!value;else e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
function redraw(){
 let e=document.getElementById(cfg.canvas||'__no_canvas__');
 try{
  if(cfg.svg){e=document.getElementById(cfg.svg);if(e){const clone=e.cloneNode(true);clone.removeAttribute('id');clone.setAttribute('xmlns','http://www.w3.org/2000/svg');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(clone));return}}
  if(e&&e.width&&e.height){const pic=e.toDataURL('image/png');if(img.src!==pic)img.src=pic}
 }catch(err){root.dataset.captureError=String(err)}
}
async function fileFrom(src,index){
 if(typeof src!=='string'||!src)return null;let b=null;
 try{const r=await fetch(src);if(r.ok)b=await r.blob()}catch(_){}
 if(!b){
  b=await new Promise(resolve=>{const im=new Image();im.onload=()=>{try{
   const c=document.createElement('canvas'),f=Math.min(1,1600/Math.max(im.width,im.height));
   c.width=Math.max(1,Math.round(im.width*f));c.height=Math.max(1,Math.round(im.height*f));
   c.getContext('2d').drawImage(im,0,0,c.width,c.height);
   c.toBlob(resolve,'image/png');c.width=c.height=1;
  }catch(_){resolve(null)}};im.onerror=()=>resolve(null);im.src=src});
 }
 return b?new File([b],'reeden-'+(index+1)+'.png',{type:b.type||'image/png'}):null;
}
function send(selector,list){
 const target=qs(selector);if(!target||!list.length)return false;
 try{const d=new DataTransfer();list.forEach(file=>d.items.add(file));target.files=d.files;target.dispatchEvent(new Event('change',{bubbles:true}));return true}
 catch(err){root.dataset.uploadError=selector+':'+String(err);return false}
}
function applyParams(payload){
 const p=payload.params||{},th=payload.theme||{};
 const title=p.themeTitle||th.name||'',author=p.themeAuthor||th.author||'',description=p.themeDescription||th.description||'';
 const map={title,themeName:title,maker:author,author,'cover-title':title,'cover-author':author,titleText:title,'bag-name':title,message:description};
 for(const [id,value] of Object.entries(map))if(value)put(id,value);
 for(const id of cfg.ctrl||[]){const key=id.replace(/[-_]+([a-z])/g,(_,c)=>c.toUpperCase());if(Object.hasOwn(p,key))put(id,p[key])}
}
window.ReedenShareTemplate={render(payload){
 payload=payload||window.ReedenShareTemplateMock||{};
 const version=++generation;
 redraw();
 (async()=>{
  await delay(120);if(version!==generation)return;
  applyParams(payload);
  const s=Array.isArray(payload.screens)?payload.screens.slice(0,cfg.count):[];
  const files=(await Promise.all(s.map((a,i)=>fileFrom(a&&a.image,i)))).filter(Boolean);
  if(version!==generation)return;
  if(cfg.id==='huajian'){send('#groups input[type=file]',files.slice(0,2))}
  else if(cfg.id==='yan'){send('setA',files.slice(0,3));if(files.length>3){await delay(450);send('setB',files.slice(3,6))}}
  else if(cfg.id==='relics'){send('imageInput',files.slice(0,1))}
  else send(cfg.upload,files);
  let tries=16;
  const tick=()=>{if(version!==generation)return;redraw();if(--tries>0)setTimeout(tick,250)};
  setTimeout(tick,400);
 })().catch(err=>{root.dataset.renderError=String(err)});
}};
const mock={type:'themePreview',theme:{name:cfg.name,author:'gu',description:'原版 gu 艺术模板'},screens:cfg.screens.map(s=>({...s,image:null,width:720,height:1600}))};
window.ReedenShareTemplateMock=mock;
window.ReedenShareTemplate.render(window.__REEDEN_SHARE_PAYLOAD__||mock);
})();
