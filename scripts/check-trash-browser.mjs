import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// Actual components and API handlers backed by the caller's isolated PostgreSQL.
export async function checkTrashBrowser(api) {
  await mkdir('work/trash', { recursive: true });
  const bundle = await build({ stdin: { contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {Catalog} from './components/catalog/Catalog';import {TrashSheets} from './components/TrashSheets';
    const root=createRoot(document.getElementById('root'));
    window.catalog=()=>root.render(<Catalog allowedSchools={['A']}/>);
    window.trash=()=>root.render(<main className="admin-page"><h1>Skräpkorg</h1><TrashSheets/></main>);
    window.catalog();`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false,
    platform: 'browser', jsx: 'automatic', loader: { '.css': 'empty' },
    define: { 'process.env.NEXT_PUBLIC_APP_BASE_PATH': '"/produktblad"', 'process.env.NEXT_PUBLIC_PORTAL_URL': '"https://astar-studio-portal.vercel.app"', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'next-boundary', setup(b) {
      b.onResolve({ filter: /^next\/(link|navigation|dynamic)$/ }, args => ({ path: args.path, namespace: 'stub' }));
      b.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ loader: 'jsx', resolveDir: process.cwd(), contents:
        args.path.endsWith('link') ? `import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}` :
        args.path.endsWith('navigation') ? `export const usePathname=()=>'/produktblad';export const useRouter=()=>({push(){},refresh(){}});` : `export default ()=>()=>null;` }));
    } }]
  });
  let mutations = 0, failNext = false;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname.replace(/^\/produktblad/, '');
      if (path.startsWith('/api/')) {
        let body = ''; for await (const chunk of req) body += chunk;
        const request = new Request(url, { method: req.method, headers: { origin: url.origin, 'Content-Type': 'application/json' }, ...(body ? { body } : {}) });
        let result;
        if (req.method === 'POST') { mutations++; if (failNext) { failNext = false; result = Response.json({ error: 'Tillfälligt anslutningsfel. Försök igen.' }, { status: 503 }); } }
        if (!result) {
          if (path === '/api/me') result = Response.json(url.pathname === '/api/me' ? { user: { name: 'Test', role: globalThis.actor === 'owner' ? 'admin' : 'user' }, apps: [{ id: 'produktblad' }] } : { admin: globalThis.actor === 'owner' });
          else if (path === '/api/sheets') result = await api.list(request);
          else if (path === '/api/admin/trash') result = await (req.method === 'POST' ? api.restore(request) : api.trash(request));
          else {
            const match = /^\/api\/sheets\/([^/]+)(\/trash)?$/.exec(path);
            if (!match) throw Error('Unexpected API path ' + path);
            const id = Buffer.from(match[1].slice(2), 'base64url').toString('utf8');
            result = match[2] ? await api.remove(request, { params: Promise.resolve({ id }) }) : Response.json(await api.readSheet(globalThis.actor, id));
          }
        }
        res.statusCode = result.status; res.setHeader('Content-Type', 'application/json'); return res.end(await result.text());
      }
      if (path === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle.outputFiles[0].text); }
      if (path === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end((await readFile('app/globals.css', 'utf8'))+(await readFile('components/AppSidebar.css', 'utf8'))); }
      if (path === '/platform/v3/workspace.css') { res.setHeader('Content-Type', 'text/css'); return res.end(await readFile('../Astarstudioportal/public/platform/v3/workspace.css', 'utf8')); }
      if (path === '/platform/v3/navigation.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(await readFile('../Astarstudioportal/public/platform/v3/navigation.js', 'utf8')); }
      if (/\.(jpg|png)$/.test(path)) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/platform/v3/workspace.css"><astar-navigation current="produktblad"></astar-navigation><div id="root"></div><script src="/platform/v3/navigation.js"></script><script src="/app.js"></script>');
    } catch (error) { res.statusCode = error.status ?? 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: error.message })); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage(); const errors = []; page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`http://127.0.0.1:${server.address().port}/produktblad/`);
    await page.waitForSelector('#catalog-search');
    await page.type('#catalog-search', 'Webbläsarprov');
    await page.waitForSelector('.catalog-select'); await page.click('.catalog-select');
    try { await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Ta bort blad'), { timeout: 8000 }); }
    catch (error) { console.error(await page.$eval('.catalog-inspector', el => el.textContent)); throw error; }
    const clickDelete = () => page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Ta bort blad').click());
    page.once('dialog', async dialog => { assert.match(dialog.message(), /Webbläsarprov.*\(A\)/); await dialog.dismiss(); });
    await clickDelete(); assert.equal(mutations, 0);
    failNext = true;
    page.once('dialog', dialog => dialog.accept()); await clickDelete(); await page.waitForSelector('[role="alert"]');
    assert.equal(await page.$eval('.catalog-card h2', el => el.textContent), 'Webbläsarprov');
    await page.screenshot({ path: 'work/trash/delete-retry.png', fullPage: true });
    page.once('dialog', dialog => dialog.accept()); await clickDelete();
    await page.waitForFunction(() => !document.querySelector('.catalog-card'));
    assert.equal(mutations, 2);
    globalThis.actor = 'owner'; await page.evaluate(() => window.trash());
    await page.waitForSelector('tbody tr');
    await page.type('input[type="search"]', 'Webbläsarprov');
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
    await page.screenshot({ path: 'work/trash/trash-desktop.png', fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: 'work/trash/trash-mobile.png', fullPage: true });
    await page.click('tbody button'); await page.waitForFunction(() => document.body.textContent.includes('har återställts'));
    globalThis.actor = 'editor'; await page.evaluate(() => window.catalog());
    await page.waitForSelector('#catalog-search'); await page.click('#catalog-search'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.type('#catalog-search', 'Webbläsarprov');
    await page.waitForSelector('.catalog-card');
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: browser -> actual API -> PostgreSQL: cancel, confirm, retry, removal from library and admin restore; desktop/mobile.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
