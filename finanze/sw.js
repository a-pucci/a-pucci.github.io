const CACHE_VERSION = 'v7';
const SHELL_CACHE = `finanze-shell-${CACHE_VERSION}`;
const FONTS_CACHE = `finanze-fonts-${CACHE_VERSION}`;

// La pagina dell'app sta dietro l'autenticazione del Worker Cloudflare, che
// risponde con il form di login (HTTP 200) quando manca il cookie di sessione.
// Va quindi tenuta fuori dal pre-caching e servita rete-prima: un form di login
// finito in cache resterebbe li' anche dopo un accesso riuscito.
const APP_PAGE     = '/finanze/';
const HEADER_LOGIN = 'x-finanze-auth';   // il Worker puo' valorizzarlo 'login'
const APP_MARKER   = 'id="app"';         // presente solo nella pagina vera

const API_URL = 'https://script.google.com/macros/s/AKfycbwCuSYyUW2z6dTkX2OtthwR0WtRkz_hClei4LaL3ebwUcRAEWMAVrSp5DnN-5snbKJf/exec';

const APP_SHELL = [
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

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Mai intercettare le scritture. Il login e' un POST verso /finanze/ e una
  // risposta ottenuta seguendo un redirect non puo' essere restituita a una
  // richiesta di navigazione: intercettarlo rompeva l'accesso.
  if (event.request.method !== 'GET') return;

  // Pagina app: rete-prima, con la cache come rete di sicurezza offline.
  // Il form di login non viene mai messo in cache.
  if (url.pathname === APP_PAGE) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok && res.headers.get(HEADER_LOGIN) !== 'login') {
            // Non ci si fida del solo header: si conserva la pagina soltanto se
            // contiene davvero l'app. Cosi' il fix regge anche senza modifiche
            // al Worker, e qualsiasi altra interstiziale resta fuori dalla cache.
            const perControllo = res.clone();
            const perCache     = res.clone();
            perControllo.text().then(html => {
              if (html.includes(APP_MARKER)) {
                caches.open(SHELL_CACHE).then(cache => cache.put(event.request, perCache));
              }
            }).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(event.request).then(cached => cached || Response.error()))
    );
    return;
  }

  if (APP_SHELL.includes(event.request.url)) {
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

// Apps Script risponde sempre JSON, ma l'infrastruttura Google può interporre una
// pagina HTML (throttling, errore temporaneo). Con r.json() diretto l'eccezione è
// indistinguibile da un guasto di rete; qui si riconosce e non si consuma l'operazione.
async function postJson(body) {
  const r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(body) });
  const txt = await r.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error('risposta non JSON: ' + txt.slice(0, 120));
  }
}

async function syncPendingOps() {
  const ops = await getAllPendingOps();
  if (ops.length === 0) return;

  let hasError = false;
  for (const op of ops) {
    try {
      const res = await postJson(op.body);
      if (res.ok) {
        await deletePendingOp(op.id);
      } else {
        hasError = true;
      }
    } catch {
      hasError = true;
    }
  }

  if (hasError) throw new Error('Some ops failed — Background Sync will retry');

  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type: 'sync-complete' }));
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
