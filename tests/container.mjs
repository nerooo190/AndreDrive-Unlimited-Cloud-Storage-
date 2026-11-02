// Optional: run against a locally started instance of the production image.
// node tests/container.mjs <container-name>; PORT is published as 3015.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const container=process.argv[2];
if(!container||!/^andredrive-check-[a-z0-9-]+$/.test(container))throw new Error('Provide the name of a dedicated andredrive-check-* test container.');
const docker=['-u','DOCKER_HOST','-u','DOCKER_CONTEXT','-u','DOCKER_TLS','-u','DOCKER_TLS_VERIFY','-u','DOCKER_CERT_PATH','docker','--host=unix:///var/run/docker.sock'];
const base='http://127.0.0.1:3015';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await sleep(200)}throw new Error('Container failed readiness.');}
await ready();
const processStatus=execFileSync('env',[...docker,'exec',container,'cat','/proc/1/status'],{encoding:'utf8'});
assert.equal(processStatus.match(/^Uid:\s+(\d+)/m)?.[1],'1000');
const registration=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Container Test',email:`container${Date.now()}@example.test`,password:'container-test-password'})});
assert.equal(registration.status,200);const cookie=registration.headers.get('set-cookie').split(';')[0];
const form=new FormData();form.set('kind','movie');form.append('files',new Blob([readFileSync('public/demo-landscape.mp4')],{type:'video/mp4'}),'Smoke Test.mp4');
const upload=await fetch(base+'/api/upload',{method:'POST',headers:{Cookie:cookie},body:form});assert.equal(upload.status,200);const [file]=await upload.json();
let hls;
for(let n=0;n<200;n++){const library=await(await fetch(base+'/api/library',{headers:{Cookie:cookie}})).json();hls=library.files[0].hls;if(hls!=='pending')break;await sleep(300)}assert.equal(hls,'ready');
const share=await(await fetch(base+'/api/links',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({type:'file',target:file.id})})).json();
const playlist=await fetch(base+`/playlist/${share.token}/library.m3u8`);assert.equal(playlist.status,200);assert.match(await playlist.text(),/\/hls\//);
execFileSync('env',[...docker,'restart',container],{stdio:'ignore'});await ready();
const me=await(await fetch(base+'/api/me',{headers:{Cookie:cookie}})).json();assert.equal(me.name,'Container Test');
const download=await fetch(base+`/media/${share.token}/${file.id}`);assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),readFileSync('public/demo-landscape.mp4'));
const manifest=await fetch(base+`/hls/${share.token}/${file.id}/index.m3u8`);assert.equal(manifest.status,200);assert.match(await manifest.text(),/#EXT-X-ENDLIST/);
console.log('Production container passed: unprivileged user, registration/session, video upload, FFmpeg HLS, playlist, restart, persisted account/file/share.');
