export async function cloud<T>(url:string,options?:RequestInit):Promise<T> {
  const response=await fetch(url,{cache:"no-store",...options});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error??"Servern kunde inte nås. Försök igen.");
  return result;
}
export const jsonRequest=(method:string,body:unknown):RequestInit=>({method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
