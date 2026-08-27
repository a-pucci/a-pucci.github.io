// FIN-18 — Confronto col periodo precedente in Panoramica.
//
// Le metriche mostravano valori assoluti senza contesto. La domanda immediata in
// un'app di finanze e' "rispetto al mese scorso?", e richiedeva di navigare avanti
// e indietro annotandosi i numeri a mente.
const h = require('./helpers');
const { verifica, sezione } = h;

global.MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
global.INV_CAT = 'Investimenti';

eval([h.estrai(h.src, 'localISO'), h.estrai(h.src, 'getMonthRange'),
      h.estrai(h.src, 'shiftMonth'), h.estrai(h.src, 'periodoPer'),
      h.estrai(h.src, 'periodoCorrente'), h.estrai(h.src, 'periodoPrecedente'),
      h.estrai(h.src, 'filtraPeriodo'), h.estrai(h.src, 'calcolaTotali'),
      h.estrai(h.src, 'fmtDec'), h.estrai(h.src, 'deltaVsPrecedente')].join('\n'));

const contesto = (y, m, sd) => { global.currentYear = y; global.currentMonth = m; global.monthStartDay = sd; };

sezione('periodo precedente');
contesto(2026, 5, 1);
verifica('mese solare: aprile', periodoPrecedente().mesi, [{ year: 2026, month: 4 }]);
verifica('  range di aprile', [periodoPrecedente().fromISO, periodoPrecedente().toISO],
  ['2026-04-01', '2026-04-30']);
verifica('il periodo corrente ha comunque un range',
  [periodoCorrente().fromISO, periodoCorrente().toISO], ['2026-05-01', '2026-05-31']);

contesto(2026, 1, 1);
verifica('gennaio -> dicembre dell anno prima', periodoPrecedente().mesi, [{ year: 2025, month: 12 }]);

contesto(2026, 5, 16);
verifica('mese contabile: due mesi solari', periodoPrecedente().mesi,
  [{ year: 2026, month: 4 }, { year: 2026, month: 5 }]);
verifica('  range 16 apr - 15 mag', [periodoPrecedente().fromISO, periodoPrecedente().toISO],
  ['2026-04-16', '2026-05-15']);
verifica('  non si sovrappone col corrente',
  periodoPrecedente().toISO < periodoCorrente().fromISO, true);

sezione('separazione dei due periodi nello stesso payload');
// il bootstrap porta i mesi di entrambi: il ritaglio deve tenerli distinti
contesto(2026, 5, 1);
const righe = [
  { data: '2026-03-31', importo: 1, categoria: 'Casa' },
  { data: '2026-04-01', importo: 2, categoria: 'Casa' },
  { data: '2026-04-30', importo: 4, categoria: 'Casa' },
  { data: '2026-05-01', importo: 8, categoria: 'Casa' },
  { data: '2026-05-31', importo: 16, categoria: 'Casa' },
  { data: '2026-06-01', importo: 32, categoria: 'Casa' },
];
verifica('periodo corrente: solo maggio',
  filtraPeriodo(righe, periodoCorrente()).reduce((s, r) => s + r.importo, 0), 24);
verifica('periodo precedente: solo aprile',
  filtraPeriodo(righe, periodoPrecedente()).reduce((s, r) => s + r.importo, 0), 6);

contesto(2026, 5, 16);
verifica('col mese contabile il taglio segue il giorno di inizio',
  filtraPeriodo(righe, periodoCorrente()).reduce((s, r) => s + r.importo, 0), 48);

sezione('totali');
const spese = [
  { categoria: 'Casa',         sottocategoria: 'Bollette',  importo: 300 },
  { categoria: 'Investimenti', sottocategoria: 'Risparmi',  importo: 500 },
];
const entrate = [
  { tipo: 'Stipendio', importo: 2000 },
];
const t = calcolaTotali(spese, entrate);
verifica('spese: senza investimenti', t.spese, 300);
verifica('uscite: investimenti dentro', t.uscite, 800);
verifica('entrate sommate', t.entrate, 2000);
verifica('risparmio = entrate - spese correnti', t.risparmio, 1700);
verifica('nessun movimento -> tutti zero', calcolaTotali([], []),
  { spese: 0, uscite: 0, entrate: 0, risparmio: 0 });

sezione('resa del confronto');
const testo = html => html.replace(/<[^>]+>/g, '').trim();
const classe = html => (html.match(/class="delta ?([^"]*)"/) || [, ''])[1].trim();

verifica('senza periodo precedente il delta e omesso', deltaVsPrecedente(100, null, true), '');
verifica('  anche se non definito', deltaVsPrecedente(100, undefined, true), '');
// zero e' un dato, non un'assenza: il confronto si fa
verifica('precedente a zero: si confronta in valore assoluto',
  testo(deltaVsPrecedente(50, 0, true)), '↑ €50,00 vs periodo prec.');

verifica('valore invariato', testo(deltaVsPrecedente(100, 100, true)), 'invariato');
verifica('  senza colore', classe(deltaVsPrecedente(100, 100, true)), '');
verifica('differenza sotto il centesimo = invariato',
  testo(deltaVsPrecedente(100.001, 100, true)), 'invariato');

sezione('il segno segue il significato, non la direzione');
// entrate e risparmio: crescere e' bene
verifica('entrate in aumento -> verde', classe(deltaVsPrecedente(1200, 1000, true)), 'up');
verifica('  freccia in su', testo(deltaVsPrecedente(1200, 1000, true)).startsWith('↑'), true);
verifica('entrate in calo -> rosso', classe(deltaVsPrecedente(800, 1000, true)), 'dn');
verifica('  freccia in giu', testo(deltaVsPrecedente(800, 1000, true)).startsWith('↓'), true);
// spese e uscite: crescere e' male, ma la freccia punta comunque in su
verifica('spese in aumento -> ROSSO benche salgano', classe(deltaVsPrecedente(1200, 1000, false)), 'dn');
verifica('  freccia comunque in su', testo(deltaVsPrecedente(1200, 1000, false)).startsWith('↑'), true);
verifica('spese in calo -> VERDE benche scendano', classe(deltaVsPrecedente(800, 1000, false)), 'up');
verifica('  freccia comunque in giu', testo(deltaVsPrecedente(800, 1000, false)).startsWith('↓'), true);

sezione('percentuali');
verifica('+20%', testo(deltaVsPrecedente(1200, 1000, true)), '↑ 20% vs periodo prec.');
verifica('-20%', testo(deltaVsPrecedente(800, 1000, true)), '↓ 20% vs periodo prec.');
verifica('arrotondata all intero', testo(deltaVsPrecedente(1234, 1000, true)), '↑ 23% vs periodo prec.');
verifica('risparmio da negativo a positivo',
  classe(deltaVsPrecedente(500, -200, true)), 'up');

sezione('struttura');
const pan = h.estrai(h.src, 'renderPanoramica');
['totEntrate', 'totSpese', 'totUscite', 'risparmio'].forEach(m =>
  verifica(`${m} confrontato col precedente`,
    new RegExp(`deltaVsPrecedente\\(${m},`).test(pan), true));
verifica('entrate e risparmio: crescere e bene',
  (pan.match(/deltaVsPrecedente\((totEntrate|risparmio), prec && prec\.\w+, true\)/g) || []).length, 2);
verifica('spese e uscite: crescere e male',
  (pan.match(/deltaVsPrecedente\((totSpese|totUscite), prec && prec\.\w+, false\)/g) || []).length, 2);
verifica('renderPanoramica usa i totali condivisi', /calcolaTotali\(currentSpese, currentEntrate\)/.test(pan), true);

const lp = h.estrai(h.src, 'loadPeriodo');
verifica('il periodo precedente si carica col corrente', /loadPeriodoPrecedente\(pre, token\)/.test(lp), true);
verifica('  e Panoramica si rirende dopo', /renderPanoramica\(\)/.test(lp), true);
verifica('  solo se il token e ancora attuale', /if \(!periodoScaduto\(token\)\) renderPanoramica\(\)/.test(lp), true);

const lpp = h.estrai(h.src, 'loadPeriodoPrecedente');
verifica('un errore azzera il confronto invece di falsarlo', /totaliPrec = null/.test(lpp), true);
verifica('  rispetta le risposte scadute', /periodoScaduto\(token\)/.test(lpp), true);
// una richiesta fallita darebbe totali parziali, che sembrerebbero un calo reale
verifica('  richiede tutte le risposte, non solo quelle riuscite',
  /every\(r => r && r\.ok\)/.test(lpp), true);
// il backend restituisce liste vuote sia per "mese senza movimenti" sia per
// "foglio inesistente": confrontarsi con zero inventerebbe un +100%
verifica('  un periodo del tutto vuoto non diventa un confronto',
  /t\.entrate === 0 && t\.uscite === 0\) \? null : t/.test(lpp), true);

verifica('il bootstrap chiede i mesi di entrambi i periodi',
  /periodoCorrente\(\), periodoPrecedente\(\)/.test(h.estrai(h.src, 'fetchBootstrap')), true);
verifica('  senza duplicare i mesi in comune',
  /if \(!mesi\.includes\(chiave\)\)/.test(h.estrai(h.src, 'fetchBootstrap')), true);
verifica('schema della cache alzato: un payload vecchio darebbe zeri',
  /const _CACHE_SCHEMA = 2/.test(h.src), true);

h.fine();
