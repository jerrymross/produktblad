import assert from 'node:assert/strict';
process.env.NEXT_PUBLIC_APP_BASE_PATH='/produktblad';
process.env.APP_URL='http://localhost:3000/produktblad';
process.env.PORTAL_ISSUER='http://localhost:3000';
async function main(){
  const {appPath}=await import('../lib/app-path');
  const {safeReturnTo,callback,issuer}=await import('../lib/portal-protocol');
  assert.equal(callback,'http://localhost:3000/produktblad/api/portal/callback');
  assert.equal(issuer,'http://localhost:3000');
  assert.equal(appPath('/api/media/123'),'/produktblad/api/media/123');
  assert.equal(appPath('/produktblad/api/media/123'),'/produktblad/api/media/123');
  assert.equal(appPath('data:image/png;base64,123'),'data:image/png;base64,123');
  for(const path of ['https://evil.example','//evil.example','/api/me','/nytt-program','/produktblad/../api/me','/produktblad/api/portal/login','/produktblad/\\evil.example'])assert.equal(safeReturnTo(path),'/produktblad');
  assert.equal(safeReturnTo('/produktblad/?blad=example'),'/produktblad/?blad=example');
  console.log('Mounted assets, return paths and SSO configuration passed');
}void main();
