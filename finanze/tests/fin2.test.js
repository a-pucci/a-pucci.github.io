// FIN-2 — La navigazione mesi deve attraversare il cambio d'anno.
//
// Il mese era limitato a 1-12 senza mai toccare l'anno: da gennaio non si
// tornava indietro, e a gennaio l'app restava senza storico.
const h = require('./helpers');
const { verifica, sezione } = h;

global.MONTHS_FULL = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                      'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
global.MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

eval([h.estrai(h.src, 'localISO'), h.estrai(h.src, 'shiftMonth'),
      h.estrai(h.src, 'getMonthRange'), h.estrai(h.src, 'monthRangeLabel')].join('\n'));

sezione('attraversamento anno');
verifica('gennaio indietro -> dicembre precedente', shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
verifica('dicembre avanti -> gennaio successivo',   shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
verifica('spostamento nullo',                       shiftMonth(2026, 6, 0),  { year: 2026, month: 6 });
verifica('salto indietro di 14 mesi',               shiftMonth(2026, 3, -14),{ year: 2025, month: 1 });
verifica('salto avanti di 25 mesi',                 shiftMonth(2026, 3, 25), { year: 2028, month: 4 });
verifica('12 indietro = stesso mese anno prima',    shiftMonth(2026, 8, -12),{ year: 2025, month: 8 });

let reversibile = true, sempreValido = true;
for (let y = 2024; y <= 2027; y++) {
  for (let m = 1; m <= 12; m++) {
    for (const d of [-25, -13, -12, -1, 1, 12, 13, 25]) {
      const avanti = shiftMonth(y, m, d);
      const indietro = shiftMonth(avanti.year, avanti.month, -d);
      if (indietro.year !== y || indietro.month !== m) reversibile = false;
      if (avanti.month < 1 || avanti.month > 12) sempreValido = false;
    }
  }
}
verifica('andata e ritorno coerenti su 4 anni x 12 mesi x 8 salti', reversibile, true);
verifica('il mese resta sempre fra 1 e 12', sempreValido, true);

sezione('etichette');
verifica('mese solare', monthRangeLabel(2025, 12, 1), 'Dicembre 2025');
verifica('mese contabile a cavallo dell anno', monthRangeLabel(2025, 12, 16), '16 Dic – 15 Gen 2026');

sezione('range usato dalle viste');
const r = getMonthRange(2025, 12, 16);
verifica('inizio del range', r.fromISO, '2025-12-16');
verifica('fine del range',   r.toISO,   '2026-01-15');
verifica('gli ISO combaciano con le date mostrate',
  [localISO(r.from), localISO(r.to)], [r.fromISO, r.toISO]);

sezione('struttura');
verifica('changeMonth usa shiftMonth',
  /shiftMonth\(currentYear, currentMonth, d\)/.test(h.estrai(h.src, 'changeMonth')), true);
verifica('nessun clamp 1-12 residuo',
  /Math\.max\(1, Math\.min\(12,/.test(h.senzaCommenti(h.src)), false);
verifica('patrimonio e trend ancorati all anno solare',
  /const THIS_YEAR\s*=\s*new Date\(\)\.getFullYear\(\)/.test(h.src), true);
verifica('  loadSummaryAnno non segue la navigazione',
  /year: THIS_YEAR/.test(h.estrai(h.src, 'loadSummaryAnno')), true);

h.fine();
