
(()=>{'use strict';
const items=[
 ['fuguang','浮光碎影','纸感拼贴','paper','✦'],
 ['collage','散漫ins风','轻复古手帐','paper','✳'],
 ['guzhe','古风折页','织物与折页','paper','❖'],
 ['stitch','缝合艺术','针脚与拼接','object','✣'],
 ['sunlit','天气好','阳光与透纸','paper','☀'],
 ['food','零食小铺','包装创作','object','♡'],
 ['zipbag','拉链袋','透明收纳','object','◇'],
 ['magazine','旧刊杂志','双页排版','paper','❦'],
 ['huajian','花笺','花纸与诗意','paper','❀'],
 ['origami','东南西北','互动折纸','object','✧'],
 ['petal-post-return','折花寄影','花影与动画','art','✿'],
 ['yan','焰','复古印刷','art','✺'],
 ['theme','主题预览专供','专属主题展示','art','◈'],
 ['dark','信号丢失','故障美学','art','✶'],
 ['ukiyo','浮世三景','和风屏风','paper','❋']
].map(([key,title,desc,category,glyph])=>({key,title,desc,category,glyph}));
const known=new Set(items.map(x=>x.key)),storeFav='gu-studio-favorites-1',storeRecent='gu-studio-recent-1';
const nav=document.querySelector('.switch'),header=document.querySelector('.studio-bar');if(!nav||!header)return;
const load=(key)=>{try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.filter(x=>known.has(x)):[];}catch{return[];}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let favorites=new Set(load(storeFav)),recent=load(storeRecent),category='all',term='',isOpen=false,restoreFocus=null;
const findActive=()=>items.find(x=>document.getElementById('tab-'+x.key)?.getAttribute('aria-selected')==='true')||items[0];
const opener=document.createElement('button');opener.id='gu-open-library';opener.type='button';opener.setAttribute('aria-haspopup','dialog');
opener.setAttribute('aria-expanded','false');
opener.innerHTML='<span class="gu-gridicon" aria-hidden="true">▦</span><span class="gu-library-cta">模板图鉴</span><span class="gu-current" id="gu-current-name"></span>';
header.append(opener);
const root=document.createElement('div');root.className='gu-library';root.id='gu-library';root.hidden=true;
root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','gu-library-title');
root.innerHTML='<div class="gu-library-window"><div class="gu-library-head"><div class="gu-library-headline"><div class="gu-library-eyebrow">GU · THE TEMPLATE ATELIER</div><h2 id="gu-library-title">给每张返图，一间小小展室。</h2><p>挑一款喜欢的样式，图片只在你的设备上处理。</p></div><button class="gu-library-close" type="button" aria-label="关闭模板图鉴">×</button></div><div class="gu-library-toolbar"><label class="gu-library-search"><span aria-hidden="true">⌕</span><input id="gu-search" type="search" placeholder="搜索模板名称、风格…" autocomplete="off" aria-label="搜索模板"></label><div class="gu-filters" role="group" aria-label="筛选模板"><button type="button" data-filter="all" aria-pressed="true">全部 · 15</button><button type="button" data-filter="paper" aria-pressed="false">纸感 / 复古</button><button type="button" data-filter="object" aria-pressed="false">手作 / 小物</button><button type="button" data-filter="art" aria-pressed="false">艺术 / 实验</button><button type="button" data-filter="favorites" aria-pressed="false">☆ 收藏</button></div></div><div class="gu-library-recent" id="gu-recent"></div><div class="gu-library-grid" id="gu-grid" aria-live="polite"></div><div class="gu-library-foot"><span>15 款独立创作空间 · 支持在下次打开时继续选择最近使用的模板</span><span>在星星处收藏喜欢的样式</span></div></div>';
document.body.append(root);
const grid=root.querySelector('#gu-grid'),input=root.querySelector('#gu-search'),recentBox=root.querySelector('#gu-recent');
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function reflect(){const a=findActive();opener.querySelector('#gu-current-name').textContent=a.title;opener.setAttribute('aria-label','选择模板，当前为'+a.title); if(isOpen)draw();}
function draw(){
 const active=findActive().key,needle=term.trim().toLocaleLowerCase();
 const visible=items.filter(x=>(category==='all'||category==='favorites'&&favorites.has(x.key)||category===x.category)&&(x.title+x.desc+x.key).toLocaleLowerCase().includes(needle));
 root.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
 grid.innerHTML=visible.length?visible.map(x=>{
  const selected=x.key===active,star=favorites.has(x.key);
  return '<article class="gu-template-card" data-key="'+x.key+'" aria-current="'+selected+'"><button class="gu-card-main" type="button" data-choose="'+x.key+'"><span class="gu-art"><span class="gu-art-glyph" aria-hidden="true">'+escapeHTML(x.glyph)+'</span></span><span class="gu-card-copy"><strong>'+escapeHTML(x.title)+'</strong><small>'+escapeHTML(x.desc)+'</small><em>'+(selected?'正在创作 · CURRENT':'进入编辑器 ↗')+'</em></span></button><button type="button" class="gu-favorite" data-fav="'+x.key+'" aria-label="'+(star?'取消收藏':'收藏')+escapeHTML(x.title)+'" aria-pressed="'+star+'" title="'+(star?'取消收藏':'收藏')+'">'+(star?'★':'☆')+'</button></article>';
 }).join(''):'<div class="gu-library-empty">没有找到匹配的模板。可以试试其他关键词，或切换分类。</div>';
 const recentItems=recent.map(k=>items.find(i=>i.key===k)).filter(Boolean).slice(0,4);
 recentBox.innerHTML=recentItems.length?'<span>最近使用</span>'+recentItems.map(x=>'<button type="button" data-choose="'+x.key+'">'+escapeHTML(x.title)+'</button>').join(''):'<span>挑一款开始创作，最近使用的模板会出现在这里。</span>';
}
function open(){if(isOpen)return;isOpen=true;restoreFocus=document.activeElement;root.hidden=false;document.body.classList.add('gu-library-open');opener.setAttribute('aria-expanded','true');term='';input.value='';category='all';draw();requestAnimationFrame(()=>input.focus());}
function close(){if(!isOpen)return;isOpen=false;root.hidden=true;document.body.classList.remove('gu-library-open');opener.setAttribute('aria-expanded','false');restoreFocus?.focus?.();}
function choose(key){if(!known.has(key))return;const tab=document.getElementById('tab-'+key);if(!tab||tab.disabled){return;}tab.click();if(tab.getAttribute('aria-selected')!=='true')return;recent=[key,...recent.filter(x=>x!==key)].slice(0,8);save(storeRecent,recent);try{const url=new URL(location.href);url.searchParams.set('template',key);history.replaceState(null,'',url.pathname+url.search+url.hash);}catch{}close();reflect();}
opener.addEventListener('click',open);
root.querySelector('.gu-library-close').addEventListener('click',close);
root.addEventListener('click',e=>{if(e.target===root)close();const chooseButton=e.target.closest('[data-choose]');if(chooseButton){choose(chooseButton.dataset.choose);return;}const fav=e.target.closest('[data-fav]');if(fav){const key=fav.dataset.fav;if(favorites.has(key))favorites.delete(key);else favorites.add(key);save(storeFav,[...favorites]);draw();return;}const filter=e.target.closest('[data-filter]');if(filter){category=filter.dataset.filter;draw();}});
input.addEventListener('input',()=>{term=input.value;draw();});
root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key!=='Tab')return;const focusable=[...root.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(n=>n.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
nav.addEventListener('click',e=>{const tab=e.target.closest('button[id^="tab-"]');if(!tab||tab.disabled)return;const key=tab.id.slice(4);if(known.has(key)){recent=[key,...recent.filter(x=>x!==key)].slice(0,8);save(storeRecent,recent);reflect();}});
new MutationObserver(reflect).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-selected']});
recent=[findActive().key,...recent.filter(x=>x!==findActive().key)].slice(0,8);save(storeRecent,recent);reflect();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen)close();if(!isOpen&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}});
})();
