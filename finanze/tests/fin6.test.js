// FIN-6 — Render immediato dall'ultimo stato noto, poi aggiornamento.
//
// La latenza di Apps Script e' fuori dal nostro controllo e oscilla da 1 a 50
// secondi. L'unica leva e' non aspettarla: misurato nel browser, render da cache
// in 39ms contro 6734ms della rete.
const h = require('./helpers');
const { verifica, sezione } = h;

let deposito = {}, quotaPiena = false, negato = false;
global.localStorage = {
  getItem: k => { if (negato) throw new Error('storage negato'); return k in deposito ? deposito[k] : null; },
  setItem: (k, v) => { if (quotaPiena) throw new Error('QuotaExceededError'); deposito[k] = String(v); },
  removeItem: k => { delete deposito[k]; }
};
const avvisi = [];
global.console = { ...console, warn: (...a) => avvisi.push(a.join(' ')) };

eval([`const _CACHE_KEY = ${h.costante(h.src, '_CACHE_KEY')};`,
      `const _CACHE_SCHEMA = ${h.costante(h.src, '_CACHE_SCHEMA')};`,
      h.estrai(h.src, '_periodoKey'), h.estrai(h.src, 'salvaCache'),
      h.estrai(h.src, 'leggiCache'), h.estrai(h.src, 'cachePerPeriodoCorrente')].join('\n'));

// le const dichiarate dentro eval non escono dal suo scope: copia locale
const CHIAVE = eval(h.costante(h.src, '_CACHE_KEY'));
const periodo = (y, m, sd) => { global.currentYear = y; global.currentMonth = m; global.monthStartDay = sd; };

const payload = {
  categorie: { Casa: { subs: ['Bollette'] } },
  categorieEntrate: ['Stipendio'],
  conti: [{ nome: 'N26' }],
  summaryAnno: { spese: [1, 2] },
  spese: [{ id: 's1', data: '2026-05-20' }],
  entrate: [{ id: 'e1', data: '2026-05-27' }],
  investimenti: [{ piattaforma: 'MF', valore: 100 }]
};

sezione('salvataggio e rilettura');
deposito = {}; periodo(2026, 5, 1);
salvaCache(payload);
let c = leggiCache();
verifica('payload riletto integro', c.data, payload);
verifica('periodo registrato', c.periodo, '2026-5-1');
verifica('schema registrato', c.v, 1);
verifica('timestamp presente', typeof c.salvatoIl, 'number');
deposito = {};
verifica('cache assente -> null', leggiCache(), null);

sezione('cache non fidata');
periodo(2026, 5, 1); salvaCache(payload);
deposito[CHIAVE] = JSON.stringify({ ...JSON.parse(deposito[CHIAVE]), v: 99 });
verifica('schema diverso -> scartata', leggiCache(), null);
verifica('  e rimossa', CHIAVE in deposito, false);

deposito[CHIAVE] = '{rotto';
verifica('JSON corrotto -> scartata', leggiCache(), null);
verifica('  e rimossa', CHIAVE in deposito, false);

deposito[CHIAVE] = JSON.stringify({ v: 1, salvatoIl: 1 });
verifica('payload senza data -> scartata', leggiCache(), null);

deposito = {}; quotaPiena = true;
let esploso = false;
try { salvaCache(payload); } catch { esploso = true; }
verifica('quota superata non fa esplodere il salvataggio', esploso, false);
verifica('  ma viene segnalato', avvisi.some(a => /cache non salvata/.test(a)), true);
quotaPiena = false;

negato = true;
verifica('storage negato (Safari privato) -> null', leggiCache(), null);
negato = false;

sezione('validita per periodo');
deposito = {}; periodo(2026, 5, 1); salvaCache(payload);
c = leggiCache();
let uso = cachePerPeriodoCorrente(c);
verifica('stesso periodo: movimenti usati', [uso.spese.length, uso.entrate.length], [1, 1]);

periodo(2026, 6, 1);
uso = cachePerPeriodoCorrente(c);
verifica('mese diverso: movimenti scartati', [uso.spese.length, uso.entrate.length], [0, 0]);
verifica('  categorie comunque riusate', Object.keys(uso.categorie), ['Casa']);
verifica('  conti comunque riusati', uso.conti.length, 1);
verifica('  investimenti comunque riusati', uso.investimenti.length, 1);
verifica('  la cache originale non viene mutata', c.data.spese.length, 1);

periodo(2026, 5, 16);
verifica('cambio giorno contabile invalida i movimenti', cachePerPeriodoCorrente(c).spese.length, 0);
periodo(2025, 5, 1);
verifica('anno diverso invalida i movimenti', cachePerPeriodoCorrente(c).spese.length, 0);

sezione('struttura di reloadAll');
const r = h.estrai(h.src, 'reloadAll');
verifica('legge la cache prima di andare in rete',
  r.indexOf('leggiCache()') < r.indexOf('fetchBootstrap()'), true);
verifica('rende dalla cache prima del fetch',
  r.indexOf('idrata(cachePerPeriodoCorrente') < r.indexOf('fetchBootstrap()'), true);
verifica('segnala che sta aggiornando', /setStatus\('load', 'aggiorno\.\.\.'\)/.test(r), true);
verifica('salva il payload fresco', /salvaCache\(pre\)/.test(r), true);
verifica('conserva la posizione di scroll', /window\.scrollTo\(0, scrollY\)/.test(r), true);
verifica('offline con dati a schermo non tenta la rete',
  /!navigator\.onLine && daCache[\s\S]{0,140}return;/.test(r), true);
verifica('errore con dati a schermo non azzera la vista',
  /daCache \? 'dati non aggiornati'/.test(r), true);
verifica('reloadAll chiamato all avvio', /reloadAll\(\);\s*\}\);/.test(h.src), true);

h.fine();
