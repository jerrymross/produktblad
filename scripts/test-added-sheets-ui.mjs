import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

await mkdir('work/added-sheets', { recursive: true });
const bundle = await build({stdin:{contents:`
  import React from 'react'; import {createRoot} from 'react-dom/client';
  import {NewSheet} from './components/NewSheet'; import {AddedSheets} from './components/AddedSheets';
  import {Catalog} from './components/catalog/Catalog';
  const root=createRoot(document.getElementById('root'));root.render(<NewSheet/>);
  window.showAdded=()=>root.render(<main className="admin-page"><h1>Tillagda produktblad</h1><AddedSheets/></main>);
  window.showCatalog=()=>root.render(<Catalog allowedSchools={['B']}/>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',
  loader:{'.css':'empty'},define:{'process.env.NEXT_PUBLIC_APP_BASE_PATH':'"/produktblad"','process.env.NEXT_PUBLIC_PORTAL_URL':'"https://astar-studio-portal.vercel.app"','process.env.NODE_ENV':'"production"'},
  plugins:[{name:'next-test-boundary',setup(b){
    b.onResolve({filter:/^next\/(navigation|link|dynamic)$/},a=>({path:a.path,namespace:'next-test'}));
    b.onLoad({filter:/.*/,namespace:'next-test'},a=>({loader:'jsx',resolveDir:process.cwd(),contents:a.path.endsWith('navigation')?
      `export const useRouter=()=>({push:path=>{window.testDestination=path},refresh(){}});export const usePathname=()=>'/new';`:
      a.path.endsWith('link')?`import React from 'react';export default function Link({href,children,prefetch,...props}){return <a href={href} {...props}>{children}</a>}`:
      `export default ()=>()=>null;`}));
  }}],});
const calls=[];let fail=true;
const row={id:'new:11111111-1111-4111-8111-111111111111',school:'B',program:'AF RUB',title:'Ny utbildning ÅÄÖ',createdAt:'2026-10-19T12:00:00Z',creatorName:'Testredaktör',createdBy:'editor',revision:0};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/produktblad/api/me'){res.setHeader('Content-Type','application/json');return res.end('{"admin":true}');}
  if(path==='/produktblad/api/sheets/new'){
    res.setHeader('Content-Type','application/json');
    if(req.method==='GET')return res.end(JSON.stringify({available:true,schools:['A','B']}));
    let body='';for await(const chunk of req)body+=chunk;calls.push(JSON.parse(body));
    if(fail){fail=false;res.statusCode=503;return res.end('{"error":"Test: försök igen"}');}
    return res.end(JSON.stringify({id:row.id}));
  }
  if(path==='/produktblad/api/admin/added-sheets'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({available:true,sheets:[row]}));}
  if(path==='/produktblad/api/sheets'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({sheets:[],addedSheets:[row]}));}
  if(path==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].text);}
  if(path==='/style.css'){res.setHeader('Content-Type','text/css');return res.end((await readFile('app/globals.css','utf8'))+(await readFile('components/AppSidebar.css','utf8'))+(await readFile('app/new/new-sheet.css','utf8')));}
  if(path==='/produktblad/astar-studio-logo-staende.png'){res.setHeader('Content-Type','image/png');return res.end(await readFile('public/astar-studio-logo-staende.png'));}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PDF_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1400,height:1000});
  await page.goto(`http://127.0.0.1:${server.address().port}/produktblad/new`);
  await page.waitForFunction(()=>!document.querySelector('fieldset').disabled);
  assert.deepEqual(await page.$$eval('#new-sheet-program option',nodes=>nodes.map(n=>n.value)),['Komvux','AF','AF RUB']);
  await page.type('#new-sheet-title',row.title);await page.select('#new-sheet-program','AF RUB');await page.select('#new-sheet-school','B');
  await page.screenshot({path:'work/added-sheets/new-desktop.png',fullPage:true});
  await page.click('button[type="submit"]');await page.waitForSelector('[role="alert"]');
  assert.equal(await page.$eval('#new-sheet-title',el=>el.value),row.title);
  await page.click('button[type="submit"]');await page.waitForFunction(()=>!!window.testDestination);
  assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].school,'B');assert.equal(calls[0].program,'AF RUB');
  assert.equal(await page.evaluate(()=>window.testDestination),`/?blad=${encodeURIComponent(row.id)}`);
  await page.reload();await page.setViewport({width:390,height:844});await page.waitForFunction(()=>!document.querySelector('fieldset').disabled);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'work/added-sheets/new-mobile.png',fullPage:true});
  await page.evaluate(()=>window.showAdded());await page.waitForSelector('tbody tr');
  assert.match(await page.$eval('tbody',el=>el.textContent),/Testredaktör/);
  await page.type('input[type="search"]','finns inte');await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===0);
  await page.$eval('input[type="search"]',el=>el.select());await page.keyboard.press('Backspace');await page.waitForSelector('tbody tr');
  await page.setViewport({width:1400,height:1000});await page.screenshot({path:'work/added-sheets/admin-desktop.png',fullPage:true});
  await page.evaluate(()=>window.showCatalog());await page.waitForSelector('.catalog-card');
  assert.equal(await page.$eval('.catalog-card h2',el=>el.textContent),row.title);
  assert.ok((await page.$eval('.catalog-card-bottom a',el=>el.getAttribute('href'))).includes(encodeURIComponent(row.id)));
  assert.deepEqual(errors,[]);
  console.log('PASS: real form/sidebar/admin components; form choices, school selection, failed-create retry preserves fields and request ID, editor navigation, admin creator/search, mobile width. API simulated. Screenshots in work/added-sheets.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
