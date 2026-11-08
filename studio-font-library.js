(() => {
 'use strict';let database;
 const origin=location.origin;
 function open(){if(database)return database;database=new Promise((resolve,reject)=>{const r=indexedDB.open('guzhe-studio-device-v2',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('fonts'))d.createObjectStore('fonts',{keyPath:'id'});if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings');if(!d.objectStoreNames.contains('materials'))d.createObjectStore('materials');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('字体库正在更新，请稍后重试'));});return database;}
 async function run(mode,fn){const d=await open();return new Promise((resolve,reject)=>{const tx=d.transaction('fonts',mode),r=fn(tx.objectStore('fonts'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('字体保存中断'));});}
 async function id(buffer){if(crypto.subtle){const h=await crypto.subtle.digest('SHA-256',buffer);return [...new Uint8Array(h)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);}let h=2166136261;for(const b of new Uint8Array(buffer))h=Math.imul(h^b,16777619);return 'local'+(h>>>0).toString(16)+buffer.byteLength;}
 let catalog=null,catalogLoading=null;
 function invalidate(){catalog=null;catalogLoading=null;}
 async function list(){if(catalog)return catalog;if(catalogLoading)return catalogLoading;const pending=(async()=>{const d=await open();return new Promise((resolve,reject)=>{const rows=[],tx=d.transaction('fonts','readonly'),r=tx.objectStore('fonts').openCursor();r.onsuccess=()=>{const cur=r.result;if(cur){const v=cur.value;rows.push({id:v.id,name:v.name,bytes:v.buffer?.byteLength||v.blob?.size||0});cur.continue();}};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});})();catalogLoading=pending;try{const rows=await pending;if(catalogLoading===pending)catalog=rows;return rows;}finally{if(catalogLoading===pending)catalogLoading=null;}}
 window.addEventListener('message',e=>{if(e.source===parent&&e.origin===origin&&e.data?.type==='font-library-changed')invalidate();});
 function announce(){invalidate();if(parent!==window)parent.postMessage({type:'font-library-changed'},origin==='null'?'*':origin);}
 async function put(name,buffer){const record={id:await id(buffer),name,buffer};await run('readwrite',s=>s.put(record));announce();return record.id;}
 async function remove(key){await run('readwrite',s=>s.delete(key));announce();}
 window.StudioFontLibrary={all:()=>run('readonly',s=>s.getAll()),list,get:key=>run('readonly',s=>s.get(key)),invalidate,put,remove,id,announce};
})();
