// FIN-1 — Il grafico patrimonio deve riportare in avanti i valori noti.
//
// Uno snapshot e' uno stock, non un flusso: se in un giorno registri una sola
// piattaforma, le altre valgono ancora quanto l'ultima volta. Sommare solo le
// piattaforme presenti in quella data faceva crollare la curva.
const h = require('./helpers');
const { verifica, sezione } = h;

eval([h.estrai(h.src, 'localISO'), h.estrai(h.src, 'snapDateISO'),
      h.estrai(h.src, 'patrimonioDaily'), h.estrai(h.src, 'weekStartISO'),
      h.estrai(h.src, 'groupByWeek')].join('\n'));

sezione('caso segnalato dall utente');
// 1/1: Moneyfarm 1000 + Trade Republic 1000. 1/2: solo Moneyfarm, salito a 1500.
verifica('la curva sale 2000 -> 2500, non scende a 1500',
  patrimonioDaily([
    { data: '2026-01-01', piattaforma: 'Moneyfarm',      valore: 1000 },
    { data: '2026-01-01', piattaforma: 'Trade Republic', valore: 1000 },
    { data: '2026-02-01', piattaforma: 'Moneyfarm',      valore: 1500 },
  ], []),
  [{ x: '2026-01-01', y: 2000 }, { x: '2026-02-01', y: 2500 }]);

sezione('continuita tra anni');
verifica('lo snapshot dell anno prima resta nel totale',
  patrimonioDaily(
    [{ data: '2026-01-15', piattaforma: 'Moneyfarm', valore: 1000 }],
    [{ data: '2025-12-20', piattaforma: 'Moneyfarm',      valore: 900 },
     { data: '2025-12-28', piattaforma: 'Trade Republic', valore: 1100 }]),
  [{ x: '2025-12-28', y: 2000 }, { x: '2026-01-15', y: 2100 }]);

sezione('casi limite');
verifica('piattaforma singola invariata',
  patrimonioDaily([
    { data: '2026-03-01', piattaforma: 'Moneyfarm', valore: 100 },
    { data: '2026-04-01', piattaforma: 'Moneyfarm', valore: 200 },
  ], []),
  [{ x: '2026-03-01', y: 100 }, { x: '2026-04-01', y: 200 }]);

verifica('due snapshot stessa piattaforma stessa data: vince l ultimo',
  patrimonioDaily([
    { data: '2026-05-01', piattaforma: 'Moneyfarm', valore: 100 },
    { data: '2026-05-01', piattaforma: 'Moneyfarm', valore: 150 },
  ], []),
  [{ x: '2026-05-01', y: 150 }]);

verifica('righe non ordinate gestite',
  patrimonioDaily([
    { data: '2026-02-01', piattaforma: 'Moneyfarm',      valore: 1500 },
    { data: '2026-01-01', piattaforma: 'Trade Republic', valore: 1000 },
    { data: '2026-01-01', piattaforma: 'Moneyfarm',      valore: 1000 },
  ], []),
  [{ x: '2026-01-01', y: 2000 }, { x: '2026-02-01', y: 2500 }]);

verifica('date come oggetti Date accettate',
  patrimonioDaily([
    { data: new Date(2026, 0, 1), piattaforma: 'Moneyfarm',      valore: 1000 },
    { data: new Date(2026, 0, 1), piattaforma: 'Trade Republic', valore: 1000 },
    { data: new Date(2026, 1, 1), piattaforma: 'Moneyfarm',      valore: 1500 },
  ], []),
  [{ x: '2026-01-01', y: 2000 }, { x: '2026-02-01', y: 2500 }]);

verifica('valore non numerico trattato come zero',
  patrimonioDaily([{ data: '2026-01-01', piattaforma: 'X', valore: 'boh' }], []),
  [{ x: '2026-01-01', y: 0 }]);

verifica('nessun dato -> nessun punto', patrimonioDaily([], []), []);
verifica('seed omesso non fa esplodere',
  patrimonioDaily([{ data: '2026-01-01', piattaforma: 'X', valore: 5 }], undefined),
  [{ x: '2026-01-01', y: 5 }]);

sezione('aggregazione settimanale a valle');
verifica('tiene l ultimo valore della settimana',
  groupByWeek(patrimonioDaily([
    { data: '2026-01-05', piattaforma: 'Moneyfarm',      valore: 1000 }, // lunedi
    { data: '2026-01-07', piattaforma: 'Trade Republic', valore: 1000 }, // stessa settimana
    { data: '2026-01-12', piattaforma: 'Moneyfarm',      valore: 1500 }, // lunedi dopo
  ], [])),
  [{ x: '2026-01-05', y: 2000 }, { x: '2026-01-12', y: 2500 }]);

sezione('struttura');
const load = h.estrai(h.src, 'loadInvestimenti');
verifica('legge anche l anno precedente', /THIS_YEAR - 1/.test(load), true);
verifica('  ancorato all anno solare, non alla navigazione',
  /year:currentYear/.test(load), false);
verifica('il grafico riceve il seed', /renderPatrimonioChart\(data, prevData\)/.test(load), true);

h.fine();
