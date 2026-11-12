const VERSION='nba-today-snapshot-shell-v23';
const ROOT=new URL('./',self.location.href);
const SHELL=['./','./index.html','./styles.css','./js/app.mjs','./js/data.mjs','./js/view.mjs','./js/highlights.mjs','./js/video-window.mjs','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('nba-glance-')||k.startsWith('nba-today-snapshot-'))&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Never cache or intercept third-party live scores. Only this GitHub Pages subpath.
  if(event.request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  const isData=url.pathname.startsWith(new URL('data/',ROOT).pathname);
  if(!isData&&!event.request.mode.includes('navigate')&&!SHELL.includes(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    try{
      const response=await fetch(event.request,{signal:AbortSignal.timeout(5000)});
      if(response.ok){await cache.put(event.request,response.clone());if(isData){const highlights=url.pathname.includes('/data/highlights/');const keys=(await cache.keys()).filter(r=>r.url.includes('/data/')&&r.url.includes('/data/highlights/')===highlights);await Promise.all(keys.slice(0,Math.max(0,keys.length-(highlights?10:7))).map(k=>cache.delete(k)));}return response;}
      const saved=await cache.match(event.request);return saved||response;
    }catch{
      const saved=await cache.match(event.request)||(event.request.mode==='navigate'?await cache.match(new URL('index.html',ROOT)):null);
      return saved||new Response('Offline and not yet cached',{status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
