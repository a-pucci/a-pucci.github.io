// FIN-3 — Le metriche della tab Entrate devono riferirsi al periodo mostrato.
//
// Spese ed entrate avevano periodi indipendenti: il risparmio poteva confrontare
// mesi diversi senza segnalarlo. Inoltre nessun percorso che modificava le spese
// ricalcolava le metriche Entrate, che restavano stantie fino al reload.
const h = require('./helpers');
const { verifica, sezione } = h;

sezione('struttura');
verifica('nessuno stato di periodo separato per le entrate',
  /currentEntrate(Month|Year)/.test(h.src), false);
verifica('changeMonthEntrate delega a changeMonth',
  /function changeMonthEntrate\(d\)\s*\{\s*changeMonth\(d\);\s*\}/.test(h.estrai(h.src, 'changeMonthEntrate')), true);
verifica('spese ed entrate derivano il periodo dalla stessa fonte',
  /periodoCorrente\(\)/.test(h.estrai(h.src, 'loadSpese')) &&
  /periodoCorrente\(\)/.test(h.estrai(h.src, 'loadEntrate')), true);
verifica('periodoCorrente legge lo stato condiviso',
  /currentYear/.test(h.estrai(h.src, 'periodoCorrente')) &&
  /currentMonth/.test(h.estrai(h.src, 'periodoCorrente')), true);
verifica('loadPeriodo carica entrambi i dataset',
  /loadSpese\(/.test(h.estrai(h.src, 'loadPeriodo')) &&
  /loadEntrate\(/.test(h.estrai(h.src, 'loadPeriodo')), true);

sezione('ogni mutazione delle spese rirende le entrate');
verifica('loadSpese rirende', /renderEntrate\(\)/.test(h.estrai(h.src, 'loadSpese')), true);
verifica('_renderDopoMutazione copre entrambe le viste',
  /applyFilters\(\)[\s\S]*renderEntrate\(\)/.test(h.estrai(h.src, '_renderDopoMutazione')), true);
verifica('eliminare un movimento passa da li',
  /_renderDopoMutazione\(sheetKey\)/.test(h.estrai(h.src, 'deleteMovimento')), true);

// ── matematica delle metriche, con stub DOM ───────────────────────────
sezione('metriche');
const elementi = {};
global.document = { getElementById: id => (elementi[id] = elementi[id] || { innerHTML: '' }) };
global.MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
global.INV_CAT = 'Investimenti';
global.GIROCONTO_SUB = 'Giroconto';
eval(h.estrai(h.src, 'fmtDec') + '\n' + h.estrai(h.src, 'renderEntrate'));

function metriche(spese, entrate, mese) {
  global.currentSpese = spese;
  global.currentEntrate = entrate;
  global.currentMonth = mese;
  elementi['entrate-metrics'] = { innerHTML: '' };
  elementi['entrate-list'] = { innerHTML: '' };
  renderEntrate();
  const html = elementi['entrate-metrics'].innerHTML;
  const valori = [...html.matchAll(/€([\d.]+,\d{2})/g)].map(m => m[1]);
  return { entrate: valori[0], spese: valori[1], risparmio: valori[2],
           segno: /class="delta up"/.test(html) ? 'avanzo' : 'deficit' };
}

const speseMaggio = [
  { categoria: 'Casa',         sottocategoria: 'Bollette',  importo: 300 },
  { categoria: 'Cibo',         sottocategoria: 'Generale',  importo: 200 },
  { categoria: 'Investimenti', sottocategoria: 'Risparmi',  importo: 500 },  // esclusa
  { categoria: 'Altro',        sottocategoria: 'Giroconto', importo: 999 },  // esclusa
];
const entrateMaggio = [
  { tipo: 'Stipendio', importo: 2000, data: '2026-05-27' },
  { tipo: 'Giroconto', importo: 999,  data: '2026-05-10' },   // esclusa
];

// NB: in it-IT il CLDR usa minimumGroupingDigits=2, quindi i numeri a 4 cifre non
// hanno il punto delle migliaia: 2000,00 ma 10.000,00. Vale anche nei browser.
verifica('spese escludono investimenti e giroconti', metriche(speseMaggio, entrateMaggio, 5).spese, '500,00');
verifica('entrate escludono i giroconti',            metriche(speseMaggio, entrateMaggio, 5).entrate, '2000,00');
verifica('risparmio = entrate - spese',              metriche(speseMaggio, entrateMaggio, 5).risparmio, '1500,00');
verifica('avanzo segnalato come tale',               metriche(speseMaggio, entrateMaggio, 5).segno, 'avanzo');
verifica('raggruppamento migliaia da 5 cifre in su',
  metriche([{ categoria: 'Casa', sottocategoria: 'x', importo: 2000 }],
           [{ tipo: 'Stipendio', importo: 12000, data: '2026-05-27' }], 5).entrate, '12.000,00');

const inDeficit = metriche(speseMaggio, [{ tipo: 'Stipendio', importo: 100, data: '2026-05-27' }], 5);
verifica('deficit segnalato come tale',        inDeficit.segno, 'deficit');
verifica('deficit mostrato in valore assoluto', inDeficit.risparmio, '400,00');

sezione('coerenza fra periodi');
const m5 = metriche(speseMaggio, entrateMaggio, 5);
const m6 = metriche([{ categoria: 'Casa', sottocategoria: 'Bollette', importo: 1000 }],
                    [{ tipo: 'Stipendio', importo: 1200, data: '2026-06-27' }], 6);
verifica('maggio coerente', [m5.entrate, m5.spese, m5.risparmio], ['2000,00', '500,00', '1500,00']);
verifica('giugno coerente', [m6.entrate, m6.spese, m6.risparmio], ['1200,00', '1000,00', '200,00']);
// la combinazione incrociata era il bug: entrate di giugno con spese di maggio
const misto = metriche(speseMaggio, [{ tipo: 'Stipendio', importo: 1200, data: '2026-06-27' }], 6);
verifica('incrociare i periodi darebbe un numero diverso', misto.risparmio !== m6.risparmio, true);

h.fine();
