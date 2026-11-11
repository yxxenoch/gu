import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT=resolve(process.cwd());
const DEST=join(ROOT,'assets','template-covers');
const TEMPLATES=['fuguang','collage','guzhe','stitch','sunlit','food','zipbag','magazine','huajian','origami','petal-post-return','yan','theme','dark','ukiyo'];
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.gif':'image/gif'};
mkdirSync(DEST,{recursive:true});
const server=createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 const file=resolve(ROOT,'.'+pathname);
 if(!(file===ROOT||file.startsWith(ROOT+sep))||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',TYPES[extname(file).toLowerCase()]||'application/octet-stream');
 res.setHeader('Cache-Control','no-store');
 createReadStream(file).on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end()}).pipe(res);
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1240,height:820},deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'});
const outcome=[];
try{
 for(const id of TEMPLATES){
  const page=await context.newPage();
  const url='http://127.0.0.1:'+port+'/'+id+'.html?fixed-cover-capture=1';
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e.message).slice(0,130)));
  let status='ok',candidateCount=0,from='canvas';
  try{
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:38000});
   await page.waitForLoadState('load',{timeout:18000}).catch(()=>{});
   await page.waitForTimeout(1550);
   const candidates=await page.locator('canvas').evaluateAll(els=>els.map((e,i)=>{
     const r=e.getBoundingClientRect(),s=getComputedStyle(e);
     const named=['preview','canvas','art'].includes(e.id);
     const onScreen=r.width>=80&&r.height>=80&&s.visibility!=='hidden'&&s.display!=='none';
     return {i,id:e.id,w:e.width,h:e.height,rw:r.width,rh:r.height,good:onScreen,score:(named?1e9:0)+(onScreen?1e8:0)+e.width*e.height};
   }).filter(x=>x.w>=170&&x.h>=130).sort((a,b)=>b.score-a.score));
   candidateCount=candidates.length;
   let shot=null;
   for(const item of candidates.slice(0,3)){
    try{
     const locator=page.locator('canvas').nth(item.i);
     if(item.good){
      await locator.scrollIntoViewIfNeeded({timeout:2500}).catch(()=>{});
      shot=await locator.screenshot({timeout:9000,animations:'disabled'});
     }else{
      const data=await locator.evaluate(c=>{try{return c.toDataURL('image/png')}catch{return null}});
      if(data?.startsWith('data:image/png;base64,'))shot=Buffer.from(data.split(',')[1],'base64');
     }
     if(shot?.length>850)break;
    }catch(e){console.warn(id,'canvas attempt:',String(e).slice(0,130));}
   }
   if(!shot){
    from='stage';
    const sel=page.locator('.stage-wrap,.stage,.canvas-shell,.preview').first();
    if(await sel.count() && await sel.isVisible()){shot=await sel.screenshot({timeout:8000,animations:'disabled'});}
   }
   if(!shot){
    from='page';
    shot=await page.screenshot({type:'png',timeout:8000,animations:'disabled'});
   }
   const out=join(DEST,id+'.webp');
   await sharp(shot).rotate().resize(600,378,{fit:'contain',background:'#f9f7f0',withoutEnlargement:false}).flatten({background:'#f9f7f0'}).webp({quality:79,effort:5}).toFile(out);
   const bytes=statSync(out).size;
   if(bytes<900)throw Error('Generated image implausibly small: '+bytes);
   console.log('COVER',id,bytes,'bytes',from,'canvases',candidateCount);
   outcome.push({id,status:'ok',bytes,from,candidateCount,errors:errors.slice(0,2)});
  }catch(e){
   status='failed';
   console.error('COVER FAILED',id,String(e));
   outcome.push({id,status,error:String(e).slice(0,400),errors:errors.slice(0,3)});
  }finally{await page.close().catch(()=>{});}
 }
}finally{await context.close();await browser.close();await new Promise(ok=>server.close(ok));}
await writeFile(join(DEST,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),templateCount:TEMPLATES.length,results:outcome},null,2)+'\n');
const failures=outcome.filter(x=>x.status!=='ok');
console.log('COMPLETE',outcome.length-failures.length,'covers;',failures.length,'failures');
if(failures.length>0)process.exitCode=1;