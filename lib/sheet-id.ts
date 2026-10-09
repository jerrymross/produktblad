// Keep persistent catalog IDs unchanged; transport them without percent-encoded path characters.
export function sheetApiPath(id: string) {
  const bytes = new TextEncoder().encode(id);
  const encoded = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return `/api/sheets/b_${encoded}`;
}
export function decodeSheetId(value: string) {
  if (!value.startsWith('b_')) return value;
  const encoded = value.slice(2).replaceAll('-','+').replaceAll('_','/');
  return new TextDecoder().decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0)));
}
