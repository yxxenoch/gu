// Generate static catalog covers from the actual default template canvas.
// Run manually or in CI. The resulting images are committed under assets/gallery-covers.
// The public website never runs this script or launches hidden editors.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const ids = ['fuguang','collage','guzhe','stitch','sunlit','food','zipbag','magazine','huajian','origami','petal-post-return','yan','theme','dark','ukiyo'];
const root = path.resolve(__dirname,'..');
const outDir = path.join(root,'assets','gallery-covers');
fs.mkdirSync(outDir,{recursive:true});
const type = {'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','json':'application/json','png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','webp':'image/webp','svg':'image/svg+xml'};
const server = http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return;}
  const file = path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  res.setHeader('Content-Type',type[file.split('.').pop().toLowerCase()]||'application/octet-stream');
  res.setHeader('Cache-Control','no-store');
  fs.createReadStream(file).pipe(res);
});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=()=>new Promise(resolve=>server.close(resolve));
async function captureCanvas(page){
  return await page.evaluate(()=>{
    const all=[...document.querySelectorAll('canvas')].filter(c=>{
      const r=c.getBoundingClientRect(),s=getComputedStyle(c);
      return c.width>=180&&c.height>=150&&r.width>=90&&r.height>=70&&s.visibility!=='hidden'&&s.display!=='none'&&!c.closest('[hidden]');
    }).sort((a,b)=>{
      const score=c=>(['preview','canvas','art','view'].includes(c.id)?100000000:0)+c.width*c.height;
      return score(b)-score(a);
    });
    if(!all.length)return null;
    const c=all[0],out=document.createElement('canvas');out.width=360;out.height=240;
    const g=out.getContext('2d',{willReadFrequently:true});
    g.fillStyle='#f7f4ed';g.fillRect(0,0,360,240);
    const k=Math.min(356/c.width,236/c.height),w=c.width*k,h=c.height*k;
    try{g.drawImage(c,(360-w)/2,(240-h)/2,w,h)}catch{return null;}
    const pix=g.getImageData(0,0,360,240).data;
    let colored=0;
    for(let i=0;i<pix.length;i+=4*149){
      if(Math.abs(pix[i]-247)+Math.abs(pix[i+1]-244)+Math.abs(pix[i+2]-237)>32)colored++;
    }
    if(colored<8)return null;
    const url=out.toDataURL('image/webp',0.85);
    return url.startsWith('data:image/webp;base64,')&&url.length>2300?url:null;
  }).catch(()=>null);
}
async function captureStage(page){
  for(const selector of ['.stage-wrap','#stage-wrap','.stage','#preview','.preview-col','#art','#view','.preview','.canvas-shell']){
    const el=page.locator(selector).first();
    if(!await el.count())continue;
    const box=await el.boundingBox().catch(()=>null);
    if(!box||box.width<120||box.height<90)continue;
    try{return {buffer:await el.screenshot({type:'png',timeout:6000,animations:'disabled'}),selector};}catch{}
  }
  return null;
}
(async()=>{
  let browser;const manifest=[];
  try{
    const port=await listen();
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
    const context=await browser.newContext({viewport:{width:1180,height:820},deviceScaleFactor:1,reducedMotion:'reduce'});
    for(const id of ids){
      const page=await context.newPage();let output=null,kind='canvas',error='';
      try{
        await page.goto('http://127.0.0.1:'+port+'/'+id+'.html?gallery-build=1',{waitUntil:'domcontentloaded',timeout:30000});
        for(const delay of [1400,1800,2300,2800]){
          await page.waitForTimeout(delay);
          const url=await captureCanvas(page);
          if(url){output=Buffer.from(url.split(',')[1],'base64');break;}
        }
        if(!output){
          const stage=await captureStage(page);
          if(stage){output=stage.buffer;kind='stage:'+stage.selector;}
        }
      }catch(e){error=String(e.message||e).slice(0,160);}
      const ext=kind==='canvas'?'webp':'png';
      if(output&&output.length>2000){
        const filename=id+'.'+ext;
        fs.writeFileSync(path.join(outDir,filename),output);
        manifest.push({id,path:'assets/gallery-covers/'+filename,bytes:output.length,source:kind});
        process.stdout.write('CREATED '+id+' '+kind+' '+output.length+' bytes\n');
      }else{
        manifest.push({id,error:error||'No usable default canvas or stage was rendered'});
        process.stdout.write('MISSING '+id+' '+(error||'no image')+'\n');
      }
      await page.close();
    }
    fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({version:1,generatedAt:new Date().toISOString(),covers:manifest},null,2)+'\n');
    const count=manifest.filter(x=>x.path).length;
    process.stdout.write('FINISHED '+count+'/'+ids.length+' genuine static template captures\n');
    if(count<12)process.exitCode=1;
    await context.close();
  }finally{if(browser)await browser.close();await close();}
})().catch(err=>{console.error(err);process.exitCode=1;server.close();});
