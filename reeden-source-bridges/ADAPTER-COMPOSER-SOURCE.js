
"use strict";
const escapeAttr=x=>String(x).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const plain=x=>String(x).replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim().slice(0,30);
const screens=["home","reader","bookshelf","statistics","profile","splash"].slice(0,cfg.count).map((page,i)=>({id:"s"+(i+1),label:["首页","阅读页","书架","统计","我的","启动"][i],page}));
const meta=['<meta name="reeden-template-version" content="1">','<meta name="reeden-template-name" content="'+escapeAttr("gu · "+cfg.name+"（原绘制版）")+'">','<meta name="reeden-template-type" content="themePreview">','<meta name="reeden-template-width" content="640">','<meta name="reeden-template-screens" content="'+escapeAttr(JSON.stringify(screens))+'">','<meta data-red-param="param.themeTitle" data-red-type="text" data-red-label="主题名覆盖">','<meta data-red-param="param.themeAuthor" data-red-type="text" data-red-label="制作者覆盖">','<meta data-red-param="param.themeDescription" data-red-type="text" data-red-label="副标题覆盖">'];
let ctrlCount=0;
for(const id of cfg.ctrl){
 const safe=id.replace(/[-_]+([a-z])/g,(_,c)=>c.toUpperCase());
 const lookup=new RegExp('<(input|select|textarea)\\b([^>]*\\bid=["\\x27]'+id+'["\\x27][^>]*)>(?:([\\s\\S]*?)<\\/\\1>)?','i').exec(source);
 if(!lookup)continue;
 const tag=lookup[1].toLowerCase(),attrs=lookup[2],inside=lookup[3]||"";
 const xtype=(attrs.match(/type=["']([^"']+)/i)||[])[1]||"";
 let type="",extra="",def=(attrs.match(/value=["']([^"']*)/i)||[])[1]||"";
 if(tag==="select"){
   const op=[...inside.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map(x=>({value:(x[1].match(/value=["']([^"']+)/)||[])[1]||plain(x[2]),label:plain(x[2])})).filter(x=>x.value&&x.label&&!/[,:]/.test(x.value+x.label));
   if(op.length<2)continue;
   type="select";extra=' data-red-options="'+escapeAttr(op.slice(0,15).map(x=>x.value+":"+x.label).join(","))+'"';
   def=op[0].value;
 }else if(xtype==="color"){type="color";def=def||"#6b786f";}
 else if(xtype==="checkbox"){type="switch";def=/\bchecked\b/.test(attrs)?"true":"false";}
 else if(xtype==="range"){type="range";const min=(attrs.match(/\bmin=["']([^"']+)/)||[])[1],max=(attrs.match(/\bmax=["']([^"']+)/)||[])[1],step=(attrs.match(/\bstep=["']([^"']+)/)||[])[1]||"1";if(min===undefined||max===undefined)continue;
   extra=' data-red-min="'+escapeAttr(min)+'" data-red-max="'+escapeAttr(max)+'" data-red-step="'+escapeAttr(step)+'"';def=def||min;
 }else if(xtype==="text"||tag==="textarea"){type="text";}
 else continue;
 meta.push('<meta data-red-param="param.'+safe+'" data-red-type="'+type+'" data-red-label="'+escapeAttr((cfg.labels||{})[id]||id)+'" data-red-default="'+escapeAttr(def)+'" data-red-group="原模板设置"'+extra+'>');
 ctrlCount++;
}
const keep=new Set(["art-pass.js","export-watermark.js","paper-textures.js","pouch.js","huajian.js","huajian-colors.js","studio-font-library.js","petal-background.js","assets/petal-patterns/catalog.js"]);
let replaced=[],missing=[];
source=source.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi,(m,_,file)=>{
 const key=file.split("?")[0].replace(/^\.\//,"");
 if(keep.has(key)&&dependencies[key]){replaced.push(key);return "<script>\n"+dependencies[key].replace(/<\/script/gi,"<\\/script")+"\n</script>";}
 if(keep.has(key))missing.push(key);
 return '';
});
const style='<style id="gu-red-reeden-view">html,body{margin:0!important;padding:0!important;width:640px!important;min-width:640px!important;max-width:640px!important;height:auto!important;min-height:0!important;overflow:visible!important;background:transparent!important;display:block!important}body>:not(#gu-reeden-output):not(script):not(style){position:absolute!important;left:-20000px!important;top:0!important;min-width:960px!important;max-width:none!important;visibility:visible!important}#gu-reeden-output{display:block!important;position:relative!important;left:auto!important;top:auto!important;width:640px!important;max-width:640px!important;min-height:360px!important;height:auto!important;padding:0!important;margin:0!important;background:#f1eee7!important;overflow:hidden!important;z-index:999!important;border:0!important}#gu-reeden-img{display:block!important;position:relative!important;width:640px!important;min-height:360px!important;height:auto!important;object-fit:contain!important;max-width:640px!important}</style>';
source=source.replace(/<\/head>/i,meta.join("\n")+"\n"+style+"\n</head>");
source=source.replace(/<body([^>]*)>/i,(m,a)=>m+'\n<div id="gu-reeden-output" data-reeden-capture=""><img id="gu-reeden-img" alt="'+escapeAttr(cfg.name)+'原画布"></div>\n');
const script=bridge.replace("__CFG__",JSON.stringify({...cfg,screens}));
if(source.includes("</body>"))source=source.replace(/<\/body>/i,"<script>\n"+script+"\n</script>\n</body>");
else source=source.replace(/<\/html>/i,"<script>\n"+script+"\n</script>\n</html>");
return {html:source,stats:{ctrlCount,assetsInlined:replaced,missingScripts:missing,bytes:source.length,screens:screens.length}};
