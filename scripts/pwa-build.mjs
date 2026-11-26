import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
const files = (await readdir('dist', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name !== 'sw.js')
  .map((entry) => entry.parentPath.replace(/^dist\/?/, '') + '/' + entry.name)
  .map((path) => path.replace(/^\//, ''))
  .sort()
const hash = createHash('sha256')
for (const file of files) hash.update(await readFile('dist/' + file))
const version = hash.digest('hex').slice(0, 16)
await writeFile(
  'dist/sw.js',
  `
const CACHE='arquitec-shell-${version}'
const FILES=${JSON.stringify(files)}
const urls=FILES.map(file=>new URL(file,self.registration.scope).href)
const index=new URL('index.html',self.registration.scope).href
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})))))
})
self.addEventListener('message',event=>{if(event.data==='ACTIVATE')self.skipWaiting()})
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>{
    const old=keys.filter(key=>key.startsWith('arquitec-shell-')&&key!==CACHE)
    return Promise.all(old.slice(0,-1).map(key=>caches.delete(key)))
  }).then(()=>self.clients.claim()))
})
self.addEventListener('fetch',event=>{
  const {request}=event
  if(request.method!=='GET'||!request.url.startsWith(self.registration.scope))return
  if(request.mode==='navigate'||urls.includes(request.url)){
    const target=request.mode==='navigate'?index:request
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(target))||fetch(request)))
  }else if(new URL(request.url).pathname.includes('/assets/')){
    event.respondWith(caches.match(request).then(response=>response||fetch(request)))
  }
})
`,
)
