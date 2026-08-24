// FIN-4 — Le risposte non-JSON di Apps Script vanno ritentate, mai mostrate grezze.
//
// Causa reale accertata: non e' throttling da concorrenza, e' la pagina 404 di
// Drive ("Impossibile aprire il file in questo momento") servita quando
// l'esecuzione e' lenta. Passarla a r.json() produceva
// "Unexpected token '<', \"<!DOCTYPE \"..." fin dentro l'interfaccia.
const h = require('./helpers');
const { verifica, sezione } = h;

const HTML_DRIVE = '<!DOCTYPE html><html lang="it"><head><title>Pagina non trovata</title></head>' +
                   '<body>Impossibile aprire il file in questo momento.</body></html>';

let chiamate = [], ritardi = [], online = true;

// Node espone gia' un `navigator` globale non scrivibile: va ridefinito.
Object.defineProperty(globalThis, 'navigator', {
  value: { get onLine() { return online; } }, configurable: true, writable: true
});
global.API_URL = 'https://example.invalid/exec';
global.console = { ...console, warn: () => {} };   // silenzia il log diagnostico
const setTimeoutVero = setTimeout;
global.setTimeout = (fn, ms) => { ritardi.push(ms); return setTimeoutVero(fn, 0); };

eval([`const _RETRY_MAX = ${h.costante(h.src, '_RETRY_MAX')};`,
      `const _RETRY_BASE_MS = ${h.costante(h.src, '_RETRY_BASE_MS')};`,
      `const _ERR_UPSTREAM = ${h.costante(h.src, '_ERR_UPSTREAM')};`,
      `const _ERR_RETE = ${h.costante(h.src, '_ERR_RETE')};`,
      h.estrai(h.src, '_fetchJson')].join('\n'));

function rispondiCon(risposte) {
  chiamate = []; ritardi = [];
  let i = 0;
  global.fetch = async (url, opts) => {
    chiamate.push({ url, opts });
    const r = risposte[Math.min(i++, risposte.length - 1)];
    if (r === 'RETE_KO') throw new TypeError('Failed to fetch');
    return { text: async () => r };
  };
}

const errore = async () => {
  try { await _fetchJson(API_URL); return null; } catch (e) { return e; }
};

(async () => {
  sezione('percorso felice');
  rispondiCon(['{"ok":true,"data":[1,2]}']);
  verifica('JSON valido restituito subito', await _fetchJson(API_URL), { ok: true, data: [1, 2] });
  verifica('  nessun tentativo aggiuntivo', chiamate.length, 1);

  sezione('HTML transitorio');
  rispondiCon([HTML_DRIVE, '{"ok":true}']);
  verifica('HTML poi JSON: riesce', await _fetchJson(API_URL), { ok: true });
  verifica('  ha ritentato una volta sola', chiamate.length, 2);

  sezione('HTML persistente');
  rispondiCon([HTML_DRIVE]);
  let e = await errore();
  verifica('fallisce', e instanceof Error, true);
  verifica('  con causa comprensibile', e.message, 'risposta non valida dal server');
  verifica('  senza messaggio del parser',
    /Unexpected token|JSON at position|not valid JSON/i.test(e.message), false);
  verifica('  senza frammenti di HTML', /DOCTYPE|<html/i.test(e.message), false);
  verifica('  tentativi = 1 + _RETRY_MAX', chiamate.length, 3);
  verifica('  backoff esponenziale', ritardi, [400, 800]);

  sezione('guasto di rete');
  rispondiCon(['RETE_KO']);
  e = await errore();
  verifica('causa distinta da quella upstream', e.message, 'nessuna risposta dal server');
  verifica('  ritentato comunque', chiamate.length, 3);

  rispondiCon(['RETE_KO', 'RETE_KO', '{"ok":true,"data":"ok"}']);
  verifica('recupero al terzo tentativo', await _fetchJson(API_URL), { ok: true, data: 'ok' });

  sezione('offline');
  online = false;
  rispondiCon([HTML_DRIVE]);
  e = await errore();
  verifica('un solo tentativo: inutile insistere', chiamate.length, 1);
  verifica('  errore comunque comprensibile', e.message, 'risposta non valida dal server');
  online = true;

  sezione('altri corpi');
  rispondiCon(['']);
  e = await errore();
  verifica('corpo vuoto trattato come risposta non valida', e.message, 'risposta non valida dal server');

  rispondiCon(['{"ok":false,"error":"Azione non riconosciuta"}']);
  verifica('errore applicativo NON ritentato',
    await _fetchJson(API_URL), { ok: false, error: 'Azione non riconosciuta' });
  verifica('  un solo tentativo', chiamate.length, 1);

  sezione('struttura');
  verifica('index.html non usa piu r.json()', /\.json\(\)/.test(h.senzaCommenti(h.src)), false);
  verifica('sw.js non usa piu r.json()', /\.json\(\)/.test(h.senzaCommenti(h.sw)), false);
  verifica('apiGet passa da _fetchJson',  /_fetchJson/.test(h.estrai(h.src, 'apiGet')), true);
  verifica('apiPost passa da _fetchJson', /_fetchJson/.test(h.estrai(h.src, 'apiPost')), true);
  verifica('_flushPendingOps passa da _fetchJson',
    /_fetchJson/.test(h.estrai(h.src, '_flushPendingOps')), true);
  verifica('sw.js: il sync usa postJson', /postJson/.test(h.estrai(h.sw, 'syncPendingOps')), true);
  verifica('sw.js: postJson legge il corpo come testo', /\.text\(\)/.test(h.estrai(h.sw, 'postJson')), true);

  verifica('errore mostrato senza prefissi',
    /setStatus\('err', (daCache \? '[^']+' : )?e\.message\)/.test(h.estrai(h.src, 'reloadAll')), true);
  verifica('bottone Riprova presente', /id="retry-btn"/.test(h.src), true);
  verifica('  mostrato solo in errore',
    /state === 'err' \? '' : 'none'/.test(h.estrai(h.src, 'setStatus')), true);

  h.fine();
})();
