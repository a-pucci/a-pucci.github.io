// FIN-20 — Le date locali non devono slittare passando per UTC.
//
// toISOString() converte in UTC: in Italia (UTC+1/+2) la mezzanotte locale
// diventa il giorno precedente. Il mese contabile risultava sfasato di un giorno
// rispetto alla propria etichetta, e una spesa inserita dopo mezzanotte si
// datava a ieri.
//
// Il runner esegue questa suite anche sotto UTC, America/New_York e
// Pacific/Auckland: il bug si vedeva solo con certi offset.
const h = require('./helpers');
const { verifica, sezione } = h;

global.MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

eval([h.estrai(h.src, 'localISO'), h.estrai(h.src, 'getMonthRange'),
      h.estrai(h.src, 'snapDateISO'), h.estrai(h.src, 'weekStartISO')].join('\n'));

console.log('fuso in prova:', Intl.DateTimeFormat().resolvedOptions().timeZone);

sezione('localISO');
verifica('mezzanotte locale resta lo stesso giorno',
  localISO(new Date(2025, 11, 16, 0, 0, 0)), '2025-12-16');
verifica('un minuto dopo mezzanotte',
  localISO(new Date(2025, 11, 16, 0, 1, 0)), '2025-12-16');
verifica('un minuto prima di mezzanotte',
  localISO(new Date(2025, 11, 16, 23, 59, 0)), '2025-12-16');
verifica('mese e giorno a una cifra con zero davanti',
  localISO(new Date(2026, 0, 5)), '2026-01-05');

let disallineato = null;
for (let t = new Date(2025, 0, 1); t < new Date(2027, 0, 1); t.setDate(t.getDate() + 1)) {
  const atteso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  if (localISO(t) !== atteso) { disallineato = `${localISO(t)} != ${atteso}`; break; }
}
verifica('730 giorni consecutivi, cambi di ora legale inclusi', disallineato, null);

sezione('range del mese contabile');
[
  [2025, 12, 16, '2025-12-16', '2026-01-15'],   // a cavallo dell'anno
  [2026,  1, 16, '2026-01-16', '2026-02-15'],
  [2026,  6,  1, '2026-06-01', '2026-06-30'],   // mese solare
  [2026,  2, 28, '2026-02-28', '2026-03-27'],
  [2026,  7, 16, '2026-07-16', '2026-08-15'],   // piena ora legale
].forEach(([y, m, sd, da, a]) => {
  const r = getMonthRange(y, m, sd);
  verifica(`getMonthRange(${y}, ${m}, ${sd})`, [r.fromISO, r.toISO], [da, a]);
  verifica(`  etichetta e filtro coerenti`, [localISO(r.from), localISO(r.to)], [r.fromISO, r.toISO]);
});

sezione('altre conversioni');
verifica('snapDateISO su stringa', snapDateISO('2026-01-01'), '2026-01-01');
verifica('snapDateISO su Date locale', snapDateISO(new Date(2026, 0, 1)), '2026-01-01');
// weekStartISO lavora interamente in UTC ed e' internamente coerente: va lasciata cosi'
verifica('weekStartISO: lunedi resta se stesso', weekStartISO('2026-01-05'), '2026-01-05');
verifica('weekStartISO: domenica torna al lunedi prima', weekStartISO('2026-01-11'), '2026-01-05');

sezione('struttura');
verifica('todayISO calcolato in locale', /const todayISO = localISO\(new Date\(\)\)/.test(h.src), true);
verifica('nessun toISOString residuo fuori da weekStartISO',
  (h.senzaCommenti(h.src).match(/toISOString\(\)/g) || []).length, 1);

h.fine();
