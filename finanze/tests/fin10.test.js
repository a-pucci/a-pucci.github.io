// FIN-10 — Saldo conti derivato dai movimenti.
//
// Il saldo mutabile era gia' rotto: deleteRow_, updateRow_ e bulkImportSpese_ non
// lo aggiornavano. Ora il saldo di un conto corrente si DERIVA da saldo iniziale +
// entrate - spese + trasferimenti, cosi' modifiche, eliminazioni e import si
// riflettono sempre.
const h = require('./helpers');
const { verifica, sezione } = h;

global.CONFIG = { YEAR: 2026 };
global.parseNum_ = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
global.safe_ = (fn, fb) => { try { return fn(); } catch (e) { return fb; } };
// isoDay_ nel test: gli oggetti Date usano i getter locali (niente Utilities)
global.Session = { getScriptTimeZone: () => 'Europe/Rome' };
global.Utilities = { formatDate: (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` };

// fogli movimenti stubbati: r[1]=data, r[2]=importo, r[6]=conto(spese), r[5]=conto(entrate)
let SPESE = {}, ENTRATE = {}, GIRO = [];
global.readSheetByName_ = nome => {
  const [tipo, anno] = nome.split('_');
  if (tipo === 'Spese')   return (SPESE[anno]   || []).map(m => [null, m.data, m.importo, null, null, null, m.conto, null]);
  if (tipo === 'Entrate') return (ENTRATE[anno] || []).map(m => [null, m.data, m.importo, null, null, m.conto]);
  throw new Error('foglio non trovato: ' + nome);
};
global.getGiroconti_ = () => ({ data: GIRO });

eval([h.estrai(h.gas, 'isoDay_'), h.estrai(h.gas, 'calcolaSaldiConti_')].join('\n'));

const conto = (nome, saldoIniziale, dataSaldoIniziale, tipo) =>
  ({ nome, tipo: tipo || 'Conto corrente', saldoIniziale, dataSaldoIniziale });
const saldoDi = (conti, nome) => conti.find(c => c.nome === nome).saldo;

sezione('formula base');
SPESE = { 2026: [{ data: '2026-04-10', importo: 100, conto: 'Intesa' }] };
ENTRATE = { 2026: [{ data: '2026-04-15', importo: 300, conto: 'Intesa' }] };
GIRO = [];
let conti = [conto('Intesa', 790.99, '2026-03-31')];
calcolaSaldiConti_(conti);
verifica('iniziale + entrate - spese', saldoDi(conti, 'Intesa'), 790.99 + 300 - 100);

sezione('solo movimenti dopo la data del saldo iniziale');
SPESE = { 2026: [
  { data: '2026-03-30', importo: 999, conto: 'Intesa' },   // prima: ignorata
  { data: '2026-03-31', importo: 999, conto: 'Intesa' },   // stesso giorno: ignorata
  { data: '2026-04-01', importo: 50,  conto: 'Intesa' },   // dopo: conta
] };
ENTRATE = {}; GIRO = [];
conti = [conto('Intesa', 1000, '2026-03-31')];
calcolaSaldiConti_(conti);
verifica('movimenti fino alla data del saldo esclusi', saldoDi(conti, 'Intesa'), 950);

sezione('giroconti spostano tra due conti');
SPESE = {}; ENTRATE = {};
GIRO = [{ data: '2026-06-01', importo: 200, contoDa: 'Intesa', contoA: 'Trade Republic' }];
conti = [conto('Intesa', 1000, '2026-01-01'), conto('Trade Republic', 500, '2026-01-01')];
calcolaSaldiConti_(conti);
verifica('esce dal conto di partenza', saldoDi(conti, 'Intesa'), 800);
verifica('entra nel conto di arrivo', saldoDi(conti, 'Trade Republic'), 700);
verifica('  patrimonio totale invariato', saldoDi(conti, 'Intesa') + saldoDi(conti, 'Trade Republic'), 1500);

sezione('date isolate per conto');
SPESE = { 2026: [
  { data: '2026-04-10', importo: 100, conto: 'Intesa' },
  { data: '2026-04-10', importo: 100, conto: 'Trade Republic' },
] };
ENTRATE = {}; GIRO = [];
// TR ha saldo iniziale piu' recente: la sua spesa del 10/4 e' PRIMA, non conta
conti = [conto('Intesa', 0, '2026-03-31'), conto('Trade Republic', 0, '2026-05-31')];
calcolaSaldiConti_(conti);
verifica('la spesa Intesa (dopo il suo saldo) conta', saldoDi(conti, 'Intesa'), -100);
verifica('la spesa TR (prima del suo saldo) non conta', saldoDi(conti, 'Trade Republic'), 0);

sezione('un movimento senza conto non tocca nulla');
SPESE = { 2026: [{ data: '2026-04-10', importo: 100, conto: '' }] };
ENTRATE = {}; GIRO = [];
conti = [conto('Intesa', 500, '2026-03-31')];
calcolaSaldiConti_(conti);
verifica('spesa senza conto ignorata', saldoDi(conti, 'Intesa'), 500);

sezione('gli investimenti riducono il saldo del conto che li paga');
// comprare ETF e' una spesa che esce dal conto: il saldo cala, e' corretto
SPESE = { 2026: [{ data: '2026-04-10', importo: 500, conto: 'Trade Republic' }] };
ENTRATE = {}; GIRO = [];
conti = [conto('Trade Republic', 6274.68, '2026-03-01')];
calcolaSaldiConti_(conti);
verifica('acquisto investimento sottratto dal conto', saldoDi(conti, 'Trade Republic'), 5774.68);

sezione('solo i conti correnti hanno saldo derivato');
SPESE = {}; ENTRATE = {}; GIRO = [];
conti = [conto('Trade Republic', 0, '', 'Investimento'), conto('Intesa', 100, '2026-01-01')];
calcolaSaldiConti_(conti);
verifica('conto corrente derivato', saldoDi(conti, 'Intesa'), 100);
verifica('investimento non riceve saldo derivato', conti.find(c => c.tipo === 'Investimento').saldo, undefined);

sezione('data del saldo assente: conta tutto');
SPESE = { 2026: [{ data: '2026-01-05', importo: 30, conto: 'Intesa' }] };
ENTRATE = {}; GIRO = [];
conti = [conto('Intesa', 100, '')];
calcolaSaldiConti_(conti);
verifica('senza data iniziale tutti i movimenti contano', saldoDi(conti, 'Intesa'), 70);

sezione('foglio anno mancante non fa fallire');
SPESE = {}; ENTRATE = {}; GIRO = [];   // readSheetByName_ lancera'
conti = [conto('Intesa', 42, '2026-03-31')];
let esploso = false;
try { calcolaSaldiConti_(conti); } catch { esploso = true; }
verifica('degradazione pulita', esploso, false);
verifica('  resta il solo saldo iniziale', saldoDi(conti, 'Intesa'), 42);

sezione('isoDay_: Date e stringa ISO');
verifica('oggetto Date -> giorno locale', isoDay_(new Date(2026, 4, 31)), '2026-05-31');
verifica('stringa ISO con orario troncata', isoDay_('2026-05-31T22:00:00.000Z'), '2026-05-31');

sezione('struttura');
verifica('addSpesa_ non aggiorna piu il saldo', /updateSaldoConto_/.test(h.estrai(h.gas, 'addSpesa_')), false);
verifica('addEntrata_ non aggiorna piu il saldo', /updateSaldoConto_/.test(h.estrai(h.gas, 'addEntrata_')), false);
verifica('schema Conti ha Saldo_Iniziale e Data', /Saldo_Iniziale', 'Data_Saldo_Iniziale/.test(h.gas), true);
verifica('getConti_ deriva il saldo', /calcolaSaldiConti_\(conti\)/.test(h.estrai(h.gas, 'getConti_')), true);
verifica('setupSaldiIniziali coi valori utente',
  /Intesa Sanpaolo[\s\S]*790\.99[\s\S]*2026-03-31/.test(h.estrai(h.gas, 'setupSaldiIniziali')) &&
  /Trade Republic[\s\S]*6274\.68[\s\S]*2026-05-31/.test(h.estrai(h.gas, 'setupSaldiIniziali')), true);

h.fine();
