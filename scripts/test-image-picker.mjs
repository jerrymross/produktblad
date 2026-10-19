import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import puppeteer from "puppeteer-core";

// Isolerat browserprov: riktiga komponenter/bildfiler, simulerat biblioteks-API.
// Ingen inloggning, databas eller produktionsskrivning används.
const browser = await puppeteer.launch({
  executablePath: process.env.PDF_BROWSER_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  for (const basePath of ["", "/produktblad"]) {
    const bundle = await build({
      stdin: { contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { ImagePicker } from './components/images/ImagePicker';
        import { snapshotLibraryImage } from './lib/image-library';
        window.snapshotLibraryImage = snapshotLibraryImage;
        createRoot(document.getElementById('root')).render(
          <ImagePicker title="Kock" onManage={() => {}} onChoose={image => {
            document.getElementById('chosen').src = image;
          }} />
        );`, resolveDir: process.cwd(), loader: "tsx" },
      bundle: true, write: false, platform: "browser", jsx: "automatic",
      define: { "process.env.NEXT_PUBLIC_APP_BASE_PATH": JSON.stringify(basePath), "process.env.NEXT_PUBLIC_PORTAL_URL": '"https://astar-studio-portal.vercel.app"', "process.env.NODE_ENV": '"production"' },
    });
    const requests = [];
    let failImage = false;
    const server = createServer(async (req, res) => {
      const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      requests.push(path);
      if (path === `${basePath}/api/images`) {
        res.setHeader("Content-Type", "application/json");
        return res.end('{"images":[]}');
      }
      if ([1, 2].some(slot => path === `${basePath}/education-heroes/Kock ${slot}.jpg`)) {
        if (failImage) { res.writeHead(404); return res.end(); }
        res.setHeader("Content-Type", "image/jpeg");
        return res.end(await readFile(`public/education-heroes/${path.split('/').at(-1)}`));
      }
      if (path === `${basePath}/test`) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.end('<div id="root"></div><img id="chosen" alt="Vald bild">');
      }
      res.writeHead(404); res.end();
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const page = await browser.newPage();
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}${basePath}/test`);
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.waitForSelector(".use-library-image:not(:disabled)");
      for (const slot of [1, 2]) {
        await page.select("#image-variant", String(slot));
        await page.click(".use-library-image");
        const bytes = await readFile(`public/education-heroes/Kock ${slot}.jpg`);
        const expected = `data:image/jpeg;base64,${bytes.toString('base64')}`;
        await page.waitForFunction(value => {
          const img = document.getElementById('chosen');
          return img.src === value && img.complete && img.naturalWidth > 0;
        }, {}, expected);
      }
      assert.ok(requests.includes(`${basePath}/education-heroes/Kock 2.jpg`));
      if (basePath) assert.ok(!requests.some(path => path.startsWith('/education-heroes/')));
      const before = await page.$eval('#chosen', img => img.src);
      failImage = true;
      await page.click('.use-library-image');
      await page.waitForSelector('[role="alert"]');
      assert.match(await page.$eval('[role="alert"]', el => el.textContent), /Bilden kunde inte hämtas/);
      assert.equal(await page.$eval('#chosen', img => img.src), before);
      const count = requests.length;
      const privateImage = await page.evaluate(() => window.snapshotLibraryImage({ dataUrl: '/api/media/test-private' }));
      assert.equal(privateImage, '/api/media/test-private');
      assert.equal(requests.length, count);
      console.log(`OK: ${basePath || '/'} — Bild 1/2 avkodas med exakta JPEG-data; hämtningsfel bevarar bildval; privat referens bevaras.`);
    } finally {
      await page.close();
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
} finally { await browser.close(); }
