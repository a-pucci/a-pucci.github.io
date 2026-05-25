const CACHE_VERSION = 'v1';
const SHELL_CACHE = `finanze-shell-${CACHE_VERSION}`;
const FONTS_CACHE = `finanze-fonts-${CACHE_VERSION}`;

const API_URL = 'https://script.google.com/macros/s/AKfycbyDVKON1C98Z5rnIgKVeYRR5w47gQnW8CoorxfXYMwmNedPcG72SCLGpqgfatS7nIo1/exec';

const APP_SHELL = [
  '/finanze/',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3/dist/chartjs-adapter-date-fns.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.2.0/dist/tabler-icons.min.css',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap',
];

// ── INSTALL: pre-cacha app shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── ACTIVATE: elimina cache vecchi ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== FONTS_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first per shell, cache-first per font gstatic ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (APP_SHELL.includes(event.request.url) || url.pathname === '/finanze/') {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }
});

// ── BACKGROUND SYNC ───────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-ops') {
    event.waitUntil(syncPendingOps());
  }
});

async function syncPendingOps() {
  const ops = await getAllPendingOps();
  if (ops.length === 0) return;

  let hasError = false;
  for (const op of ops) {
    try {
      const r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(op.body) });
      const res = await r.json();
      if (res.ok) {
        await deletePendingOp(op.id);
      } else {
        hasError = true;
      }
    } catch {
      hasError = true;
    }
  }

  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type: 'sync-complete' }));

  if (hasError) throw new Error('Some ops failed — Background Sync will retry');
}

// ── INDEXEDDB HELPERS (lato SW) ───────────────────────────────
const DB_NAME = 'finanze-db';
const DB_STORE = 'pending-ops';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function getAllPendingOps() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function deletePendingOp(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}
