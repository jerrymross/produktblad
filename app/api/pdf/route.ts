import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { isSheetData } from "@/lib/sheet";
import { measureSheetOverflow } from "@/lib/overflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function findBrowser(): string | null {
  const candidates = [
    process.env.PDF_BROWSER_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate))) ?? null;
}

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 7_100_000) return new Response("Bilden eller texten är för stor.", { status: 413 });
  let unknownData: unknown;
  try { unknownData = JSON.parse(body); } catch { return new Response("Ogiltigt innehåll.", { status: 400 }); }
  if (!isSheetData(unknownData)) return new Response("Bladets fält är ogiltiga.", { status: 400 });
  const data = unknownData;
  if (!(data.image === "/reference-hero.jpg" || /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(data.image))) {
    return new Response("Bildformatet stöds inte.", { status: 400 });
  }
  if (!/^https?:\/\//i.test(data.qrUrl)) return new Response("QR-adressen måste börja med http eller https.", { status: 400 });
  const executablePath = findBrowser();
  if (!executablePath) return new Response("Lokal webbläsare för PDF saknas. Ange PDF_BROWSER_PATH.", { status: 503 });

  let browser;
  try {
    browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    const origin = new URL(request.url).origin;
    await page.goto(`${origin}/?exempel=1`, { waitUntil: "networkidle0" });
    // The local prototype's own preview is the source of the printable DOM.
    // A large uploaded image is applied separately to avoid localStorage limits.
    const storedData = { ...data, image: "/reference-hero.jpg" };
    await page.evaluate((value) => localStorage.setItem("produktbladsapp:kock:lokalt-utkast:v1", JSON.stringify(value)), storedData);
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector(".sheet-page");
    await page.evaluate((customImage) => {
      const sheet = document.querySelector<HTMLElement>(".sheet-page");
      if (!sheet) throw new Error("Bladet saknas i förhandsvisningen.");
      const hero = sheet.querySelector<HTMLImageElement>(".sheet-hero-image");
      if (hero && customImage !== "/reference-hero.jpg") hero.src = customImage;
      document.body.replaceChildren(sheet);
      document.body.style.margin = "0";
      document.body.style.background = "white";
    }, data.image);
    await page.emulateMediaType("print");
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => undefined)));
    });
    const violations = await page.evaluate(measureSheetOverflow);
    if (violations.length) return new Response(`Texten får inte plats: ${violations.join(", ")}.`, { status: 422 });
    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=produktblad-kock-prototyp.pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF export failed", error);
    return new Response("PDF-genereringen misslyckades lokalt. Se serverloggen.", { status: 500 });
  } finally {
    await browser?.close();
  }
}
