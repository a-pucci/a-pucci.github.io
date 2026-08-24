// FIN-5 — Una sola richiesta di bootstrap, con fallback alle chiamate granulari.
//
// L'avvio faceva otto richieste in tre ondate. Il calcolo del periodo contabile
// resta sul client, che passa al server i mesi solari gia' risolti: duplicare
// getMonthRange in Apps Script avrebbe creato due implementazioni da allineare.
const h = require('./helpers');
const { verifica, sezione } = h;

// ── backend ───────────────────────────────────────────────────────────
sezione('backend');
global.CONFIG = { YEAR: 2026 };
let letture = [];
global.getSpese_ = p => { letture.push(`spese ${p.year}-${p.month}`); return { ok: true, data: [{ id: `s${p.year}-${p.month}` }] }; };
global.getEntrate_ = p => { letture.push(`entrate ${p.year}-${p.month}`); return { ok: true, data: [{ id: `e${p.year}-${p.month}` }] }; };
global.getInvestimenti_ = p => {
  letture.push(`inv ${p.year}`);
  if (String(p.year) === '2024') throw new Error('Foglio non trovato: Investimenti_2024');
  return { ok: true, data: [{ piattaforma: 'MF', data: `${p.year}-06-01`, valore: 10 }] };
};
global.getCategorie_ = () => ({ ok: true, data: { Casa: { subs: ['Bollette'] } } });
global.getCategorieEntrate_ = () => ({ ok: true, data: ['Stipendio'] });
global.getConti_ = () => ({ ok: true, data: [{ nome: 'N26' }] });
global.getSummaryAnno_ = p => ({ ok: true, data: { anno: p.year, spese: [] } });
eval(h.estrai(h.gas, 'safe_') + '\n' + h.estrai(h.gas, 'getBootstrap_'));

letture = [];
let boot = getBootstrap_({ mesi: '2026-5,2026-6', invAnni: '2026,2025', annoTrend: '2026' });
verifica('risposta ok', boot.ok, true);
verifica('legge esattamente i mesi e gli anni richiesti', letture,
  ['spese 2026-5', 'entrate 2026-5', 'spese 2026-6', 'entrate 2026-6', 'inv 2026', 'inv 2025']);
verifica('spese dei due mesi unite',   boot.data.spese.map(r => r.id), ['s2026-5', 's2026-6']);
verifica('entrate dei due mesi unite', boot.data.entrate.map(r => r.id), ['e2026-5', 'e2026-6']);
verifica('investimenti dei due anni uniti', boot.data.investimenti.length, 2);
verifica('categorie presenti',         Object.keys(boot.data.categorie), ['Casa']);
verifica('categorie entrate presenti', boot.data.categorieEntrate, ['Stipendio']);
verifica('conti presenti',             boot.data.conti.length, 1);
verifica('summaryAnno usa annoTrend',  boot.data.summaryAnno.anno, '2026');

boot = getBootstrap_({ mesi: '2026-5', invAnni: '2025,2024', annoTrend: '2026' });
verifica('un foglio mancante non fa cadere l intero bootstrap', boot.ok, true);
verifica('  restano gli anni disponibili', boot.data.investimenti.length, 1);

letture = [];
getBootstrap_({ mesi: '2026-5', invAnni: '2026', annoTrend: '2026' });
verifica('periodo di un solo mese solare', letture, ['spese 2026-5', 'entrate 2026-5', 'inv 2026']);

verifica('azione registrata in doGet',
  /case 'getBootstrap':\s*result = getBootstrap_\(params\)/.test(h.gas), true);

// ── periodo, lato client ──────────────────────────────────────────────
sezione('periodo');
eval([h.estrai(h.src, 'localISO'), h.estrai(h.src, 'getMonthRange'),
      h.estrai(h.src, 'periodoCorrente'), h.estrai(h.src, 'filtraPeriodo')].join('\n'));

const contesto = (y, m, sd) => {
  global.currentYear = y; global.currentMonth = m; global.monthStartDay = sd;
  return periodoCorrente();
};

let p = contesto(2026, 5, 1);
verifica('mese solare: un mese, nessun ritaglio', [p.mesi, p.fromISO], [[{ year: 2026, month: 5 }], null]);

p = contesto(2026, 5, 16);
verifica('mese contabile: due mesi solari', p.mesi, [{ year: 2026, month: 5 }, { year: 2026, month: 6 }]);
verifica('  range corretto', [p.fromISO, p.toISO], ['2026-05-16', '2026-06-15']);

p = contesto(2025, 12, 16);
verifica('a cavallo dell anno', p.mesi, [{ year: 2025, month: 12 }, { year: 2026, month: 1 }]);
verifica('  range corretto', [p.fromISO, p.toISO], ['2025-12-16', '2026-01-15']);

const righe = [
  { data: '2026-05-15', id: 'prima' }, { data: '2026-05-16', id: 'inizio' },
  { data: '2026-06-15', id: 'fine' },  { data: '2026-06-16', id: 'dopo' },
];
verifica('filtraPeriodo include gli estremi',
  filtraPeriodo(righe, contesto(2026, 5, 16)).map(r => r.id), ['inizio', 'fine']);
verifica('senza ritaglio passa tutto', filtraPeriodo(righe, contesto(2026, 5, 1)).length, 4);

// ── query costruita dal client ────────────────────────────────────────
sezione('query');
global.THIS_YEAR = 2026;
let query = null;
global.apiGet = async q => { query = q; return { ok: true, data: { spese: [] } }; };
eval(h.estrai(h.src, 'fetchBootstrap'));

(async () => {
  contesto(2026, 5, 16);
  await fetchBootstrap();
  verifica('mesi risolti dal client',            query.mesi, '2026-5,2026-6');
  verifica('anni investimenti: corrente e prima', query.invAnni, '2026,2025');
  verifica('trend ancorato a oggi',              query.annoTrend, 2026);
  verifica('azione corretta',                    query.action, 'getBootstrap');

  contesto(2026, 5, 1);
  await fetchBootstrap();
  verifica('mese solare: un mese nella query', query.mesi, '2026-5');

  global.apiGet = async () => ({ error: 'Azione non riconosciuta: getBootstrap' });
  verifica('backend non aggiornato -> null, si ricade sulle granulari',
    await fetchBootstrap(), null);
  global.apiGet = async () => ({ ok: true, data: { conti: [] } });
  verifica('backend aggiornato -> dati', (await fetchBootstrap()).conti, []);

  sezione('struttura');
  const reload = h.estrai(h.src, 'reloadAll');
  verifica('reloadAll tenta il bootstrap', /fetchBootstrap\(\)/.test(reload), true);
  verifica('  e idrata col payload', /idrata\(pre\)/.test(reload), true);
  verifica('  il fallback non blocca', /catch\(e\) \{ console\.warn\('bootstrap:'/.test(reload), true);
  verifica('idrata passa i dati a tutti i loader',
    /loadCategorie\(pre\)[\s\S]*loadPeriodo\(pre\)[\s\S]*loadInvestimenti\(pre\)/.test(h.estrai(h.src, 'idrata')), true);
  verifica('changeMonth resta mirato', /fetchBootstrap/.test(h.estrai(h.src, 'changeMonth')), false);
  // `pre` primo parametro: gli altri argomenti (es. il token di FIN-15) non contano
  ['loadSpese', 'loadEntrate', 'loadInvestimenti'].forEach(f =>
    verifica(`${f} accetta dati preesistenti`, new RegExp(`function ${f}\\(pre[,)]`).test(h.src), true));
  // prima del refactor il calcolo del range era ripetuto in loadSpese e loadEntrate
  verifica('il calcolo del periodo vive in un solo punto',
    (h.src.match(/getMonthRange\(currentYear, currentMonth, monthStartDay\)/g) || []).length, 1);

  h.fine();
})();
