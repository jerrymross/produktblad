export type AiQuota = { limit:number; reserved:number; remaining:number; unlimited:boolean; enabled:boolean; resetsAt:string };
export function isAiQuota(value: unknown): value is AiQuota {
  if (!value || typeof value!=="object") return false;
  const q=value as AiQuota;
  return [q.limit,q.reserved,q.remaining].every(v=>Number.isSafeInteger(v)&&v>=0)&&q.remaining===Math.max(0,q.limit-q.reserved)&&typeof q.unlimited==="boolean"&&typeof q.enabled==="boolean"&&typeof q.resetsAt==="string"&&Number.isFinite(Date.parse(q.resetsAt));
}
