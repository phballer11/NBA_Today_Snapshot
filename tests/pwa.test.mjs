import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
async function worker(fetcher=async()=>{throw Error('offline');}){
 const handlers={},saved=new Map();const cache={addAll:async urls=>urls.forEach(url=>saved.set(url,new Response('shell'))),put:async(req,r)=>saved.set(typeof req==='string'?req:(req.url||req.href),r),match:async req=>saved.get(typeof req==='string'?req:(req.url||req.href)),keys:async()=>[...saved.keys()].map(url=>({url})),delete:async req=>saved.delete(typeof req==='string'?req:(req.url||req.href))};
 const self={location:{href:'https://person.github.io/nba_snapshot/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 const caches={open:async()=>cache,keys:async()=>['nba-glance-shell-v1','unrelated-app-cache'],delete:async()=>true};
 vm.runInNewContext(await readFile(new URL('sw.js',root),'utf8'),{self,caches,URL,Response,AbortSignal,fetch:fetcher});
 return {handlers,saved,cache};
}
test('PWA shell URLs and manifest remain inside a GitHub project subpath',async()=>{
 const w=await worker();let promise;w.handlers.install({waitUntil:p=>promise=p});await promise;
 assert.ok(w.saved.has('https://person.github.io/nba_snapshot/index.html'));
 assert.ok([...w.saved.keys()].every(url=>url.startsWith('https://person.github.io/nba_snapshot/')));
 const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
 for(const key of ['id','scope','start_url'])assert.equal(manifest[key],'./');
 for(const icon of manifest.icons)await access(new URL(icon.src,root));
});
test('service worker ignores ESPN requests and sibling GitHub Pages sites',async()=>{
 const w=await worker();let called=false;
 for(const url of ['https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard','https://person.github.io/other-site/index.html'])w.handlers.fetch({request:{url,method:'GET',mode:'cors'},respondWith:()=>called=true});
 assert.equal(called,false);
});
test('offline navigation returns cached app shell; missing data returns a real failure',async()=>{
 const w=await worker();w.saved.set('https://person.github.io/nba_snapshot/index.html',new Response('cached app'));
 let response;w.handlers.fetch({request:{url:'https://person.github.io/nba_snapshot/',method:'GET',mode:'navigate'},respondWith:p=>response=p});
 assert.equal(await(await response).text(),'cached app');
 w.handlers.fetch({request:{url:'https://person.github.io/nba_snapshot/data/2026-11-10.json',method:'GET',mode:'cors'},respondWith:p=>response=p});assert.equal((await response).status,503);
});
test('HTTP error falls back to last successful same-origin JSON snapshot',async()=>{
 const w=await worker(async()=>new Response('error',{status:500}));
 const url='https://person.github.io/nba_snapshot/data/2026-11-10.json';w.saved.set(url,new Response('{"schema":1}'));
 let response;w.handlers.fetch({request:{url,method:'GET',mode:'cors'},respondWith:p=>response=p});assert.equal(await(await response).text(),'{"schema":1}');
});
