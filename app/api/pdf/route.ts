import {existsSync} from "node:fs";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {api,identity,sameOrigin,HttpError} from "@/lib/access";
import {readSheet} from "@/lib/sheets-server";
import {measureSheetOverflow} from "@/lib/overflow";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function POST(request:Request){return api(async()=>{
  sameOrigin(request);const user=await identity(request);const {id,revision}=await request.json();
  if(typeof id!=="string"||!Number.isInteger(revision)||revision<1)throw new HttpError(400,"Spara bladet innan du exporterar.");
  const saved=await readSheet(user.id,id,revision);
  if(!/^https?:\/\//i.test(saved.content.qrUrl))throw new HttpError(400,"Ange en giltig QR-adress.");
  const local=[process.env.PDF_BROWSER_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((value):value is string=>!!value&&existsSync(value));
  const browser=await puppeteer.launch({executablePath:local??await chromium.executablePath(),headless:true,args:local?["--no-sandbox","--disable-gpu"]:chromium.args});
  try{
    const page=await browser.newPage();await page.setViewport({width:794,height:1123,deviceScaleFactor:1});
    const origin=new URL(request.url).origin;
    await page.setRequestInterception(true);
    page.on("request",incoming=>{
      const target=new URL(incoming.url());
      if(target.origin!==origin && target.protocol!=="data:"){void incoming.abort();return;}
      const forwarded:Record<string,string>={...incoming.headers()};
      if(target.origin===origin){forwarded.cookie=request.headers.get("cookie")??"";const bypass=request.headers.get("x-vercel-protection-bypass");if(bypass)forwarded["x-vercel-protection-bypass"]=bypass;}
      void incoming.continue({headers:forwarded});
    });
    await page.goto(`${origin}/render?id=${encodeURIComponent(id)}&revision=${revision}`,{waitUntil:"networkidle0",timeout:40_000});
    await page.waitForSelector(".sheet-page",{timeout:10_000});
    await page.emulateMediaType("print");
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode()));document.body.style.margin="0";document.body.style.background="white";});
    const violations=await page.evaluate(measureSheetOverflow);
    if(violations.length)throw new HttpError(422,`Texten får inte plats: ${violations.join(", ")}.`);
    const pdf=await page.pdf({format:"A4",preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false,margin:{top:0,right:0,bottom:0,left:0}});
    return new Response(new Uint8Array(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=produktblad.pdf","Cache-Control":"private, no-store"}});
  }finally{await browser.close();}
});}
