<!-- ========================= sw.js ========================= -->
<!--
SAVE AS: sw.js (root)
-->
<script type="text/plain" id="sw.js">
const CACHE_NAME = 'qt-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', (e)=>{
  const req = e.request;
  e.respondWith(
    caches.match(req).then(res=> res || fetch(req).then(r=>{
      const copy = r.clone();
      caches.open(CACHE_NAME).then(c=> c.put(req, copy)).catch(()=>{});
      return r;
    }).catch(()=> caches.match('./index.html')))
  );
});
</script>
