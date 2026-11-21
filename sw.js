/* CYB 游戏导航站 Service Worker · v30
   作用：让 PWA 可安装 + 断网可打开 + 静态资源秒开
   注意：Service Worker 仅在 HTTPS 或 localhost 下生效，file:// 打开时浏览器会静默跳过 */
const CACHE = 'cyb-nav-v31';
const PRECACHE = ['./', './manifest.json', './cyb-icon-192.png', './cyb-icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // 只接管同源资源；favicon 服务、Supabase CDN 等跨域请求交给浏览器
  if (url.origin !== location.origin) return;

  // 页面导航：网络优先，失败回落到缓存（离线也能打开）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./')))
    );
    return;
  }

  // 静态资源：缓存优先 + 后台更新
  e.respondWith(
    caches.match(req).then(hit => {
      const fetching = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || fetching;
    })
  );
});
