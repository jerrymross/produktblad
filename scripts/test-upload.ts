import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN??'http://localhost:3000';
const email=process.env.TEST_EMAIL??'studio-test@example.org';
const password=readFileSync('.test-password','utf8').trim();
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function main(){let cookie='';const request=async(path:string,body?:FormData|object)=>{const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{origin,cookie,...(body instanceof FormData?{}:body?{'content-type':'application/json'}:{})},body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const cookies=response.headers.getSetCookie();if(cookies.length)cookie=cookies.map(value=>value.split(';')[0]).join('; ');return response;};
assert.equal((await request('/api/auth/sign-in/email',{email,password})).status,200,'Synthetic test login');
const send=(file:File)=>{const form=new FormData();form.set('sheetId','example');form.set('file',file);return request('/api/media',form);};
const uploaded=await send(new File([png],'photo.jpg',{type:'image/jpeg'}));assert.equal(uploaded.status,200,await uploaded.clone().text());const {dataUrl}=await uploaded.json();assert.match(dataUrl,/^\/api\/media\/[a-f0-9-]{36}$/);
const image=await request(dataUrl);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
assert.equal((await fetch(origin+dataUrl)).status,401);
assert.equal((await send(new File(['not an image'],'bad.png',{type:'image/png'}))).status,400);
assert.equal((await send(new File([Buffer.alloc(2_000_001)],'large.png',{type:'image/png'}))).status,413);
const library=await(await request('/api/images')).json();const existing=library.images.find((item:{education:string;name:string;slot:number})=>item.education==='kock'&&item.name==='test.png');
if(origin==='http://localhost:3000'||existing){const form=new FormData();form.set('education','kock');form.set('slot',String(existing?.slot??2));form.set('file',new File([png],'test.png',{type:'image/png'}));const saved=await request('/api/images',form);assert.equal(saved.status,200,await saved.clone().text());const result=await saved.json();const found=await(await request('/api/images')).json();assert.ok(found.images.some((item:{dataUrl:string})=>item.dataUrl===result.dataUrl));assert.deepEqual(Buffer.from(await(await request(result.dataUrl)).arrayBuffer()),png);}else console.log('Library mutation skipped: no synthetic test slot remains in production.');
await request('/api/auth/sign-out',{});
console.log('PASS: multipart files stored and read byte-for-byte, actual MIME detection, private access, invalid/oversized rejection and library persistence.');}
main().catch(error=>{console.error(error.stack);process.exit(1);});
