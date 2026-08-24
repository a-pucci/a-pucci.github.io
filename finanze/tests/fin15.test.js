// FIN-15 — Stato di caricamento al cambio mese e coda offline visibile.
//
// Il cambio mese aggiornava subito l'etichetta ma i dati arrivavano dopo: nel
// frattempo si leggevano i numeri del mese precedente sotto l'intestazione di
// quello nuovo. E le operazioni accodate offline erano del tutto invisibili.
const h = require('./helpers');
const { verifica, sezione } = h;

sezione('protezione dalle risposte fuori ordine');
// Le const dichiarate dentro eval non escono dal suo scope: si valuta la sola
// espressione della arrow e si tiene il contatore come globale.
global._tokenPeriodo = 0;
const periodoScaduto = eval(
  h.arrow(h.src, 'periodoScaduto')
   .replace(/^const\s+periodoScaduto\s*=\s*/, '')
   .replace(/;\s*$/, ''));

const primo = ++_tokenPeriodo;
verifica('il token appena emesso e valido', periodoScaduto(primo), false);
const secondo = ++_tokenPeriodo;
verifica('un nuovo caricamento invalida il precedente', periodoScaduto(primo), true);
verifica('  e il piu recente resta valido', periodoScaduto(secondo), false);
// le chiamate diverse dal cambio periodo (addSpesa, saveMonthStartDay) non passano
// un token: non devono essere scartate
verifica('senza token non si scarta nulla', periodoScaduto(undefined), false);

sezione('viste oscurate durante il caricamento');
const elementi = [];
const creaEl = () => {
  const classi = new Set();
  return { classList: { toggle: (c, on) => { on ? classi.add(c) : classi.delete(c); } },
           ha: c => classi.has(c) };
};
let selettoreUsato = null;
global.document = {
  querySelectorAll: sel => { selettoreUsato = sel; return elementi; }
};
eval([h.src.match(/const _VISTE_PERIODO = [\s\S]*?;/)[0],
      h.estrai(h.src, 'segnalaCaricamento')].join('\n'));

elementi.push(creaEl(), creaEl());
segnalaCaricamento(true);
verifica('tutte le viste marcate', elementi.map(e => e.ha('in-caricamento')), [true, true]);
segnalaCaricamento(false);
verifica('marcatura rimossa a fine caricamento', elementi.map(e => e.ha('in-caricamento')), [false, false]);

verifica('copre metriche, liste e grafico delle spese',
  ['#spese-metrics', '#view-cat', '#view-subcat', '#view-list', '#spesa-chart-wrap']
    .every(s => selettoreUsato.includes(s)), true);
verifica('copre metriche e lista delle entrate',
  ['#entrate-metrics', '#entrate-list'].every(s => selettoreUsato.includes(s)), true);
verifica('copre il riepilogo mobile', selettoreUsato.includes('.mobile-summary'), true);
// il form di aggiunta deve restare usabile mentre i dati si ricaricano
verifica('NON copre il form di aggiunta spesa',
  /#q-amount|#q-cat|#save-btn/.test(selettoreUsato), false);
verifica('NON copre la barra dei filtri', selettoreUsato.includes('#filter-bar'), false);

sezione('resa dello stato di attesa');
const regola = (h.src.match(/\.in-caricamento\s*\{([^}]*)\}/) || [, ''])[1];
// la sfocatura rende i numeri illeggibili senza far saltare il layout,
// cosa che sostituirli con uno scheletro farebbe
verifica('i numeri diventano illeggibili', /filter:\s*blur\(/.test(regola), true);
verifica('  e non cliccabili', /pointer-events:\s*none/.test(regola), true);
verifica('rispetta prefers-reduced-motion',
  /prefers-reduced-motion[^}]*\{\s*\.in-caricamento\s*\{\s*transition:\s*none/.test(h.src.replace(/\n/g, '')), true);

sezione('badge della coda offline');
let inCoda = [];
let negato = false;
const badge = { textContent: '', style: {} };
global.document = { getElementById: id => (id === 'coda-badge' ? badge : null) };
global._getAllPendingOps = async () => { if (negato) throw new Error('IndexedDB negato'); return inCoda; };
eval(h.estrai(h.src, 'aggiornaBadgeCoda'));

(async () => {
  inCoda = [];
  verifica('coda vuota -> nessun badge', await aggiornaBadgeCoda(), 0);
  verifica('  nascosto', badge.style.display, 'none');

  inCoda = [{ id: 1 }];
  await aggiornaBadgeCoda();
  verifica('una operazione: singolare', badge.textContent, '1 in coda');
  verifica('  visibile', badge.style.display, 'inline-flex');

  inCoda = [{ id: 1 }, { id: 2 }, { id: 3 }];
  await aggiornaBadgeCoda();
  verifica('tre operazioni: plurale', badge.textContent, '3 in coda');

  inCoda = [];
  await aggiornaBadgeCoda();
  verifica('svuotata -> torna nascosto', badge.style.display, 'none');

  negato = true;
  let esploso = false;
  try { await aggiornaBadgeCoda(); } catch { esploso = true; }
  verifica('IndexedDB negato non fa esplodere', esploso, false);
  negato = false;

  const senzaBadge = { getElementById: () => null };
  const vero = global.document;
  global.document = senzaBadge;
  verifica('badge assente dal DOM gestito', await aggiornaBadgeCoda(), 0);
  global.document = vero;

  sezione('struttura');
  const lp = h.estrai(h.src, 'loadPeriodo');
  verifica('loadPeriodo emette un token', /\+\+_tokenPeriodo/.test(lp), true);
  verifica('  segnala il caricamento', /segnalaCaricamento\(true\)/.test(lp), true);
  verifica('  non lo segnala quando rende dalla cache', /if \(!pre\) segnalaCaricamento\(true\)/.test(lp), true);
  verifica('  lo toglie solo se il token e ancora attuale',
    /if \(token === _tokenPeriodo\) segnalaCaricamento\(false\)/.test(lp), true);
  verifica('  in finally, cosi anche in caso di errore', /finally/.test(lp), true);

  verifica('loadSpese scarta le risposte scadute',
    /if \(periodoScaduto\(token\)\) return;/.test(h.estrai(h.src, 'loadSpese')), true);
  verifica('loadEntrate scarta le risposte scadute',
    /if \(periodoScaduto\(token\)\) return;/.test(h.estrai(h.src, 'loadEntrate')), true);
  verifica('  il controllo precede l assegnazione dei dati',
    h.estrai(h.src, 'loadSpese').indexOf('periodoScaduto') <
    h.estrai(h.src, 'loadSpese').indexOf('currentSpese = rows'), true);

  verifica('badge aggiornato quando si accoda', /aggiornaBadgeCoda\(\)/.test(h.estrai(h.src, 'apiPost')), true);
  verifica('  e mano a mano che la coda si svuota',
    /aggiornaBadgeCoda\(\)/.test(h.estrai(h.src, '_flushPendingOps')), true);
  verifica('  e a sincronizzazione completata dal service worker',
    /sync-complete'\) \{ _showSyncBanner\(\); aggiornaBadgeCoda\(\); \}/.test(h.src), true);
  verifica('  e all avvio, per le code rimaste da sessioni precedenti',
    /aggiornaBadgeCoda\(\);\s*\/\/ possono esserci operazioni/.test(h.src), true);
  verifica('  e a ogni ricarica manuale',
    /aggiornaBadgeCoda\(\)/.test(h.estrai(h.src, 'reloadAll')), true);
  verifica('badge presente nel markup', /id="coda-badge"/.test(h.src), true);

  h.fine();
})();
