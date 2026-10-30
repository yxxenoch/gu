(() => {
 'use strict';
 const pending=new Map();let busy=false;
 function announce(value){if(parent!==window)parent.postMessage({type:'studio-busy',busy:value},location.origin);}
 function receive(value){const waiter=pending.get(value?.id);if(!waiter)return;pending.delete(value.id);value.status==='saved'?waiter.resolve(value.message):waiter.reject(Error(value.status==='cancelled'?'cancelled':(value.message||'保存失败')));}
 window.addEventListener('guzheNativeExport',e=>receive(e.detail));
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='native-result')receive(e.data.detail);});
 function chunk64(blob){return new Promise((resolve,reject)=>{const r=new FileReader;r.onerror=()=>reject(Error('无法读取导出文件'));r.onload=()=>resolve(String(r.result).split(',')[1]);r.readAsDataURL(blob);});}
 async function save(blob,name){
  if(busy)throw Error('请先完成上一次保存');
  if(!['image/png','image/jpeg','image/gif','application/json'].includes(blob.type))throw Error('不支持的导出格式');
  if(!window.GuzheFiles){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);return;}
  busy=true;announce(true);let token;
  try{token=GuzheFiles.begin(name,blob.type,blob.size);if(!token)throw Error('无法准备保存，请降低尺寸或等待上次保存结束');for(let p=0;p<blob.size;p+=131072){if(!GuzheFiles.append(token,await chunk64(blob.slice(p,p+131072))))throw Error('导出数据传输未完成');}
   return await new Promise((resolve,reject)=>{pending.set(token,{resolve,reject});if(!GuzheFiles.finish(token)){pending.delete(token);reject(Error('导出文件未能完成'));}});
  }catch(error){if(token){pending.delete(token);GuzheFiles.abort(token);}throw error;}
  finally{busy=false;announce(false);}
 }
 window.StudioNative={save,get busy(){return busy;}};
})();
