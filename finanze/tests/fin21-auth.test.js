// FIN-21 — Il service worker non deve mettere in cache il form di login.
//
// /finanze/ sta dietro il Worker Cloudflare, che risponde col form di login e
// HTTP 200 quando manca il cookie. Il service worker la pre-cacheava e la serviva
// cache-first: se all'installazione la sessione era scaduta, il form restava in
// cache anche dopo un accesso riuscito, e l'app diventava inaccessibile.
const vm = require('vm');
const h = require('./helpers');
const { verifica, sezione } = h;

const PAGINA_LOGIN = '<!DOCTYPE html><html><body><form method="POST"><input name="password"></form></body></html>';
const PAGINA_APP   = '<!DOCTYPE html><html><body><div id="app">FINANZE /</div></body></html>';

function ambiente(rispostaRete) {
  const cache = {};
  const listener = {};
  const mkRes = (corpo, { status = 200, headers = {} } = {}) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: k => headers[k.toLowerCase()] ?? null },
    clone() { return mkRes(corpo, { status, headers }); },
    text: async () => corpo,
    _corpo: corpo
  });
  const ctx = {
    console, URL,
    Response: { error: () => ({ _erroreDiRete: true }) },
    caches: {
      open: async () => ({
        put: async (req, res) => { cache[req.url] = res._corpo; },
        match: async req => (req.url in cache ? mkRes(cache[req.url]) : undefined)
      }),
      match: async req => (req.url in cache ? mkRes(cache[req.url]) : undefined),
      keys: async () => [], delete: async () => true
    },
    fetch: async () => {
      if (rispostaRete === 'OFFLINE') throw new TypeError('Failed to fetch');
      return mkRes(rispostaRete.corpo, { status: rispostaRete.status ?? 200, headers: rispostaRete.headers ?? {} });
    },
    indexedDB: {},
    self: {
      addEventListener: (t, fn) => { listener[t] = fn; },
      skipWaiting: () => {},
      clients: { claim: () => {}, matchAll: async () => [] },
      location: { origin: 'https://a-pucci.it' }
    }
  };
  vm.createContext(ctx);
  vm.runInContext(h.sw, ctx);
  return { listener, cache };
}

async function richiesta(env, { url, method = 'GET' }) {
  let promessa = null, intercettato = false;
  env.listener.fetch({
    request: { url, method },
    respondWith(p) { intercettato = true; promessa = p; },
    waitUntil() {}
  });
  const res = promessa ? await promessa : null;
  await new Promise(r => setImmediate(r));   // lascia completare i put asincroni
  await new Promise(r => setImmediate(r));
  return { intercettato, res };
}

const URL_APP = 'https://a-pucci.it/finanze/';

(async () => {
  sezione('form di login');
  let env = ambiente({ corpo: PAGINA_LOGIN });
  let out = await richiesta(env, { url: URL_APP });
  verifica('viene servito', out.res._corpo, PAGINA_LOGIN);
  verifica('  ma NON finisce in cache', Object.keys(env.cache), []);

  env = ambiente({ corpo: PAGINA_APP, headers: { 'x-finanze-auth': 'login' } });
  await richiesta(env, { url: URL_APP });
  verifica('header del Worker rispettato anche se il corpo somiglia all app',
    Object.keys(env.cache), []);

  sezione('pagina autenticata');
  env = ambiente({ corpo: PAGINA_APP });
  out = await richiesta(env, { url: URL_APP });
  verifica('viene servita', out.res._corpo, PAGINA_APP);
  verifica('  e messa in cache', Object.keys(env.cache), [URL_APP]);

  sezione('POST di login');
  env = ambiente({ corpo: PAGINA_APP });
  out = await richiesta(env, { url: URL_APP, method: 'POST' });
  // una risposta ottenuta seguendo un redirect non puo' essere restituita a una
  // richiesta di navigazione: intercettare il POST rompeva l'accesso
  verifica('non viene intercettato dal service worker', out.intercettato, false);

  sezione('altri casi');
  env = ambiente({ corpo: 'errore', status: 500 });
  await richiesta(env, { url: URL_APP });
  verifica('una risposta 500 non viene messa in cache', Object.keys(env.cache), []);

  env = ambiente({ corpo: PAGINA_APP });
  await richiesta(env, { url: URL_APP });
  const conCache = env.cache;
  env = ambiente('OFFLINE');
  Object.assign(env.cache, conCache);
  out = await richiesta(env, { url: URL_APP });
  verifica('offline serve la pagina dalla cache', out.res._corpo, PAGINA_APP);

  env = ambiente('OFFLINE');
  out = await richiesta(env, { url: URL_APP });
  verifica('offline senza cache -> errore di rete', out.res._erroreDiRete, true);

  sezione('struttura');
  verifica('la pagina app non e piu pre-cacheata',
    /const APP_SHELL = \[[\s\S]*?\]/.exec(h.sw)[0].includes("'/finanze/'"), false);
  verifica('le richieste non-GET non vengono intercettate',
    /event\.request\.method !== 'GET'/.test(h.sw), true);
  verifica('versione cache alzata per invalidare quella avvelenata',
    /CACHE_VERSION = 'v7'/.test(h.sw), true);

  h.fine();
})();
