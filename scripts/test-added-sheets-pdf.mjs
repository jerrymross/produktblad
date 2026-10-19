import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

// Run test-added-sheets.mjs first. PDF inspection dependencies are isolated in work/pdf-qa.
const snapshots=JSON.parse(await readFile('work/added-sheets/snapshots.json','utf8'));
const {getDocument}=await import(pathToFileURL(resolve('work/pdf-qa/node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href);
const {createCanvas}=await import(pathToFileURL(resolve('work/pdf-qa/node_modules/@napi-rs/canvas/index.js')).href);
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{Sheet}from'./components/sheet/Sheet';import{measureSheetOverflow}from'./lib/overflow';window.checkOverflow=measureSheetOverflow;const root=createRoot(document.getElementById('root'));window.showSheet=data=>root.render(<Sheet data={data}/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',jsx:'automatic',define:{'process.env.NEXT_PUBLIC_APP_BASE_PATH':'""','process.env.NEXT_PUBLIC_PORTAL_URL':'"https://astar-studio-portal.vercel.app"','process.env.NODE_ENV':'"production"'}});
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/test'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<style>body{margin:0}</style><link rel="stylesheet" href="/sheet.css"><div id="root"></div>');}
  if(url.pathname==='/sheet.css'){res.setHeader('Content-Type','text/css');return res.end((await readFile('app/sheet.css','utf8')).replaceAll('../public/','/'));}
  const file=resolve('public','.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(resolve('public')+sep)){res.writeHead(404);return res.end();}
  try{res.setHeader('Content-Type',file.endsWith('.woff2')?'font/woff2':file.endsWith('.png')?'image/png':'image/jpeg');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await puppeteer.launch({executablePath:process.env.PDF_BROWSER_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function inspect(bytes,name){
  if(name!=='reference')assert.match(Buffer.from(bytes).toString('latin1'),/\/FontFile2/);
  const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:false});const pdf=await task.promise;
  assert.equal(pdf.numPages,1,name);
  const page=await pdf.getPage(1);const viewport=page.getViewport({scale:1});
  assert.ok(Math.abs(viewport.width-595.276)<0.6);assert.ok(Math.abs(viewport.height-841.89)<0.6);
  const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  await writeFile(`work/added-sheets/${name}.png`,canvas.toBuffer('image/png'));
  const text=(await page.getTextContent()).items.map(item=>item.str).join(' ');
  if(name!=='reference')assert.match(text,/Ändrat yrke/);
  await task.destroy();console.log(`OK: ${name}: en A4, läsbar text, renderad PNG.`);
}
try{
  for(const snapshot of snapshots){
    const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/test`);await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.evaluate(data=>window.showSheet(data),snapshot.content);await page.waitForSelector('.sheet-page');
    await page.emulateMediaType('print');await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));});
    assert.deepEqual(await page.evaluate(()=>window.checkOverflow()),[],snapshot.program);
    const name=snapshot.program.replaceAll(' ','-');
    await page.screenshot({path:`work/added-sheets/${name}-preview.png`,fullPage:true});
    const bytes=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,margin:{top:0,right:0,bottom:0,left:0}});
    await writeFile(`work/added-sheets/${name}.pdf`,bytes);await inspect(bytes,name);await page.close();
  }
  await inspect(await readFile('references/Kock.pdf'),'reference');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
