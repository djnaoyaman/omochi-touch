const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const config = JSON.parse(fs.readFileSync('site-update.json','utf8'));
const root = path.resolve(config.root || '.');
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server = http.createServer((req,res)=>{
  let filename;
  try { filename = path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); } catch {res.writeHead(400).end();return;}
  if(filename!==root&&!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(fs.existsSync(filename)&&fs.statSync(filename).isDirectory()) filename=path.join(filename,'index.html');
  fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch();
  const results=[];
  fs.mkdirSync('test-artifacts/site-update',{recursive:true});
  try{
    for(const width of [390,1280]){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',timezoneId:'America/Los_Angeles'});
      await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
      for(const file of config.pages){
        const page=await context.newPage();
        await page.goto(`${origin}/${file}`,{waitUntil:'domcontentloaded'});
        const date=page.locator('time[data-site-updated]');
        await date.scrollIntoViewIfNeeded();
        assert.equal(await date.count(),1,file);
        assert.equal(await date.isVisible(),true,file+' visible');
        assert.equal(await date.getAttribute('datetime'),config.date,file+' stable date');
        assert.match(await date.innerText(),/JST/);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,file+' horizontal overflow');
        const box=await date.boundingBox();assert(box&&box.width>0&&box.x>=0&&box.x+box.width<=width+1);
        await page.screenshot({path:`test-artifacts/site-update/${file.replace(/[^a-z0-9.-]/gi,'-')}-${width}.png`});
        await page.reload({waitUntil:'domcontentloaded'});
        assert.equal(await date.getAttribute('datetime'),config.date,file+' repeat load');
        results.push({file,width,date:config.date,visible:true});
        await page.close();
      }
      await context.close();
    }
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
    await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
    for(const file of config.pages){const page=await context.newPage();await page.goto(`${origin}/${file}`);const date=page.locator('time[data-site-updated]');await date.scrollIntoViewIfNeeded();assert.equal(await date.isVisible(),true,file+' no-JS');assert.equal(await date.getAttribute('datetime'),config.date);await page.close();}
    await context.close();
    fs.writeFileSync('test-artifacts/site-update/report.json',JSON.stringify({results,noJavaScript:true,externalRequests:'blocked'},null,2));
    console.log(JSON.stringify(results));
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
