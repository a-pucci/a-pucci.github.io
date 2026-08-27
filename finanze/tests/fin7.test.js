// FIN-7 — Cache di categorie e conti tra esecuzioni Apps Script.
//
// Aprire uno Spreadsheet domina il costo: misurato, leggere 5 righe da Conti puo'
// richiedere decine di secondi a freddo. Il rischio della cache non e' la lettura
// ma l'invalidazione: updateSaldoConto_ scrive a ogni spesa ed entrata, e senza
// invalidare il saldo sarebbe rimasto vecchio fino a sei ore.
const h = require('./helpers');
const { verifica, sezione } = h;

let deposito = {}, ttl = [], putRotto = false, serviceRotto = false;
global.CacheService = {
  getScriptCache: () => {
    if (serviceRotto) throw new Error('cache non disponibile');
    return {
      get: k => (k in deposito ? deposito[k] : null),
      put: (k, v, t) => { if (putRotto) throw new Error('oltre 100KB'); deposito[k] = v; ttl.push(t); },
      removeAll: ks => ks.forEach(k => delete deposito[k])
    };
  }
};
eval([`const CACHE_TTL_SEC = ${h.costante(h.gas, 'CACHE_TTL_SEC')};`,
      `const CACHE_ANAGRAFICHE = ${h.costante(h.gas, 'CACHE_ANAGRAFICHE')};`,
      h.estrai(h.gas, 'cached_'), h.estrai(h.gas, 'invalidaAnagrafiche_')].join('\n'));

let letture = 0;
const leggi = () => { letture++; return { ok: true, data: { valore: letture } }; };

sezione('comportamento della cache');
deposito = {}; letture = 0; ttl = [];
verifica('prima chiamata legge dal foglio', cached_('k', leggi), { ok: true, data: { valore: 1 } });
verifica('seconda chiamata serve dalla cache', cached_('k', leggi), { ok: true, data: { valore: 1 } });
verifica('  il foglio e stato letto una volta sola', letture, 1);
verifica('TTL di sei ore', ttl, [21600]);
verifica('chiavi diverse non si mescolano', cached_('altra', leggi).data.valore, 2);

deposito['k'] = '{rotto';
verifica('voce corrotta -> rilettura invece di errore', cached_('k', leggi).data.valore, 3);

deposito = {}; letture = 0; putRotto = true;
verifica('put fallito non impedisce la risposta', cached_('k', leggi).data.valore, 1);
verifica('  e la volta dopo si rilegge', cached_('k', leggi).data.valore, 2);
putRotto = false;

deposito = {}; letture = 0; serviceRotto = true;
verifica('CacheService non disponibile -> lettura diretta', cached_('k', leggi).data.valore, 1);
serviceRotto = false;

deposito = {};
let propagata = false;
try { cached_('k', () => { throw new Error('Foglio non trovato'); }); } catch { propagata = true; }
verifica('errore di lettura propagato, non mascherato', propagata, true);

sezione('invalidazione');
deposito = {}; letture = 0;
cached_('cat_uscite', leggi); cached_('cat_entrate', leggi); cached_('conti', leggi);
verifica('tre voci in cache', Object.keys(deposito).sort(), ['cat_entrate', 'cat_uscite', 'conti']);
invalidaAnagrafiche_();
verifica('rimosse tutte', Object.keys(deposito), []);

serviceRotto = true;
let esploso = false;
try { invalidaAnagrafiche_(); } catch { esploso = true; }
verifica('invalidazione con cache rotta non esplode', esploso, false);
serviceRotto = false;

sezione('punti di lettura e scrittura');
verifica('getCategorie_ passa dalla cache', /cached_\('cat_uscite'/.test(h.estrai(h.gas, 'getCategorie_')), true);
verifica('getCategorieEntrate_ passa dalla cache', /cached_\('cat_entrate'/.test(h.estrai(h.gas, 'getCategorieEntrate_')), true);
verifica('anagrafica conti cachata', /cached_\('conti'/.test(h.estrai(h.gas, 'getContiAnagrafica_')), true);
verifica('getConti_ deriva il saldo, non cacha', /calcolaSaldiConti_/.test(h.estrai(h.gas, 'getConti_')), true);
verifica('addCategoria_ invalida', /invalidaAnagrafiche_\(\)/.test(h.estrai(h.gas, 'addCategoria_')), true);
verifica('addConto_ invalida', /invalidaAnagrafiche_\(\)/.test(h.estrai(h.gas, 'addConto_')), true);
verifica('updateSaldoConto_ rimosso (saldo derivato in FIN-10)', /function updateSaldoConto_/.test(h.gas), false);

// Le funzioni di setup creano i fogli da zero: la cache non esiste ancora e
// vengono eseguite a mano una volta sola.
const esenti = ['addCategoria_', 'addConto_', 'setupSaldiIniziali',
                'setupCompleto', 'setupCategorie_', 'setupConti_', 'setupSheet_', 'setupBudget_'];
const sospette = [...h.gas.matchAll(/function (\w+)\s*\(/g)].map(m => m[1]).filter(nome => {
  if (esenti.includes(nome)) return false;
  const corpo = h.estrai(h.gas, nome);
  const tocca = /ID_CONTI|ID_CATEGORIE/.test(corpo);
  const scrive = /appendRow\(|setValue\(|setValues\(|deleteRow\(/.test(corpo);
  return tocca && scrive && !/invalidaAnagrafiche_/.test(corpo);
});
verifica('nessuna scrittura su Conti o Categorie senza invalidare', sospette, []);

sezione('cache di esecuzione');
verifica('openById_ riusa il file gia aperto', /_ssCache_\[id\]/.test(h.estrai(h.gas, 'openById_')), true);
verifica('nessun SpreadsheetApp.openById diretto fuori dall helper',
  (h.gas.match(/SpreadsheetApp\.openById\(/g) || []).length, 1);
verifica('la cache dei valori si attiva solo in sola lettura',
  /_valuesCache_ = \{\};[\s\S]*finally[\s\S]*_valuesCache_ = null;/.test(h.estrai(h.gas, 'getBootstrap_')), true);

h.fine();
