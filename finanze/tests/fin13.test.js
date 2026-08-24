// FIN-13 — Avviso quando il movimento finisce in un periodo non mostrato.
//
// Cambiando la data a cavallo del periodo contabile, il movimento veniva salvato
// ma la vista ricaricava il periodo corrente e la riga non compariva: sembrava
// che il salvataggio fosse fallito.
const h = require('./helpers');
const { verifica, sezione } = h;

global.MONTHS_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                      'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
global.MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

let notifiche = [];
global.toast = (testo, o) => { notifiche.push({ testo, azione: o && o.azione, onAzione: o && o.onAzione }); };
global.loadPeriodo = () => { notifiche.push({ ricaricato: true }); };

eval([h.estrai(h.src, 'localISO'), h.estrai(h.src, 'getMonthRange'),
      h.estrai(h.src, 'monthRangeLabel'), h.estrai(h.src, 'shiftMonth'),
      h.estrai(h.src, 'periodoDi'), h.estrai(h.src, 'avvisaSePeriodoDiverso')].join('\n'));

const contesto = (y, m, sd) => { global.currentYear = y; global.currentMonth = m; global.monthStartDay = sd; };

sezione('periodo contabile di una data');
contesto(2026, 5, 1);
verifica('mese solare: la data sta nel proprio mese', periodoDi('2026-05-20'), { year: 2026, month: 5 });
verifica('  primo del mese',  periodoDi('2026-05-01'), { year: 2026, month: 5 });
verifica('  ultimo del mese', periodoDi('2026-05-31'), { year: 2026, month: 5 });

contesto(2026, 5, 16);
verifica('inizio 16: il 20 maggio sta in maggio',        periodoDi('2026-05-20'), { year: 2026, month: 5 });
verifica('  il 16 maggio e il primo giorno del periodo', periodoDi('2026-05-16'), { year: 2026, month: 5 });
verifica('  il 15 maggio sta ancora in aprile',          periodoDi('2026-05-15'), { year: 2026, month: 4 });
verifica('  il 5 giugno sta in maggio',                  periodoDi('2026-06-05'), { year: 2026, month: 5 });

contesto(2026, 1, 16);
verifica('a cavallo dell anno: il 10 gennaio sta in dicembre 2025',
  periodoDi('2026-01-10'), { year: 2025, month: 12 });
verifica('  il 20 gennaio sta in gennaio 2026', periodoDi('2026-01-20'), { year: 2026, month: 1 });

contesto(2026, 5, 1);
verifica('data non valida -> periodo corrente', periodoDi(''), { year: 2026, month: 5 });
verifica('data indefinita -> periodo corrente', periodoDi(undefined), { year: 2026, month: 5 });

sezione('coerenza col filtro delle viste');
// L'avviso non deve poter dissentire dal filtro che decide cosa e' visibile.
contesto(2026, 5, 16);
const rng = getMonthRange(2026, 5, 16);
const incoerenti = [];
for (let g = new Date(2026, 4, 10, 12); g < new Date(2026, 5, 20, 12); g.setDate(g.getDate() + 1)) {
  const iso = localISO(g);
  const dentroFiltro = iso >= rng.fromISO && iso <= rng.toISO;
  const p = periodoDi(iso);
  const dentroPeriodo = p.year === 2026 && p.month === 5;
  if (dentroFiltro !== dentroPeriodo) incoerenti.push(iso);
}
verifica('periodoDi concorda col range su 41 giorni consecutivi', incoerenti, []);

sezione('avviso');
contesto(2026, 5, 1); notifiche = [];
verifica('stesso periodo -> nessun avviso', avvisaSePeriodoDiverso('2026-05-20'), false);
verifica('  nessuna notifica', notifiche.length, 0);

notifiche = [];
verifica('periodo diverso -> avvisa', avvisaSePeriodoDiverso('2026-04-20'), true);
verifica('  indica il periodo di destinazione', notifiche[0].testo, 'Salvato in Aprile 2026');
verifica('  offre di andarci', notifiche[0].azione, 'Vai');

notifiche = [];
avvisaSePeriodoDiverso('2026-04-20');
notifiche[0].onAzione();
verifica('l azione porta al periodo giusto', [currentYear, currentMonth], [2026, 4]);
verifica('  e ricarica', notifiche.some(n => n.ricaricato), true);

contesto(2026, 5, 16); notifiche = [];
verifica('inizio 16: il 15 maggio finisce in aprile', avvisaSePeriodoDiverso('2026-05-15'), true);
verifica('  etichetta col range, non col mese solare', notifiche[0].testo, 'Salvato in 16 Apr – 15 Mag 2026');

notifiche = [];
verifica('inizio 16: il 20 maggio resta nel periodo mostrato', avvisaSePeriodoDiverso('2026-05-20'), false);
verifica('inizio 16: anche il 5 giugno resta nel periodo mostrato', avvisaSePeriodoDiverso('2026-06-05'), false);
verifica('  nessuna notifica', notifiche.length, 0);

contesto(2026, 1, 1); notifiche = [];
verifica('dicembre salvato mentre si guarda gennaio', avvisaSePeriodoDiverso('2025-12-28'), true);
verifica('  anno corretto nell etichetta', notifiche[0].testo, 'Salvato in Dicembre 2025');

sezione('struttura');
const sp = h.estrai(h.src, 'addSpesa'), en = h.estrai(h.src, 'addEntrata');
verifica('addSpesa avvisa dopo il salvataggio', /avvisaSePeriodoDiverso\(data\)/.test(sp), true);
verifica('  solo nel ramo online', sp.indexOf('avvisaSePeriodoDiverso') > sp.indexOf('await loadSpese()'), true);
verifica('addEntrata avvisa', /avvisaSePeriodoDiverso\(data\)/.test(en), true);
verifica('  senza sommare due notifiche',
  /if \(!avvisaSePeriodoDiverso\(data\)\) showMsg\('entrata-ok'\)/.test(en), true);

h.fine();
