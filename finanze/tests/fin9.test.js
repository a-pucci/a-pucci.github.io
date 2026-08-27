// FIN-9 — Sheet Giroconti, endpoint e modale di inserimento.
//
// Un trasferimento tra conti diventa entita' di primo livello: foglio dedicato,
// riga singola, mai in Spese ne Entrate. Modale dalla card Conti in Panoramica.
const h = require('./helpers');
const { verifica, sezione } = h;

sezione('backend: validazioni di addGiroconto_');
let foglio;
function nuovoFoglio() {
  const righe = [['ID', 'Data', 'Importo', 'Conto_Da', 'Conto_A', 'Nota']];
  return { righe, appendRow: r => righe.push(r),
    getDataRange: () => ({ getValues: () => righe }),
    deleteRow: i => righe.splice(i - 1, 1),
    getLastRow: () => righe.length, getRange: () => ({ setValues: () => {} }), setFrozenRows: () => {} };
}
global.generateId_ = () => 'gid' + (foglio.righe.length);
global.parseNum_ = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
global.getGirocontiSheet_ = () => foglio;
eval([h.estrai(h.gas, 'getGiroconti_'), h.estrai(h.gas, 'addGiroconto_'), h.estrai(h.gas, 'deleteGiroconto_')].join('\n'));

foglio = nuovoFoglio();
verifica('conti mancanti -> errore', !!addGiroconto_({ importo: 10, contoDa: '', contoA: 'B' }).error, true);
verifica('stesso conto -> errore', !!addGiroconto_({ importo: 10, contoDa: 'A', contoA: 'A' }).error, true);
verifica('importo zero -> errore', !!addGiroconto_({ importo: 0, contoDa: 'A', contoA: 'B' }).error, true);
verifica('importo negativo -> errore', !!addGiroconto_({ importo: -5, contoDa: 'A', contoA: 'B' }).error, true);

sezione('backend: aggiunta e lettura');
foglio = nuovoFoglio();
const r1 = addGiroconto_({ importo: 100, contoDa: 'N26', contoA: 'Intesa', data: '2026-08-01', nota: 'giro' });
verifica('aggiunta ok con id', !!(r1.ok && r1.id), true);
verifica('una riga oltre header', foglio.righe.length, 2);
const letti = getGiroconti_().data;
verifica('rilettura mappata', letti.length, 1);
verifica('  campi corretti', [letti[0].contoDa, letti[0].contoA, letti[0].importo, letti[0].nota], ['N26', 'Intesa', 100, 'giro']);
verifica('  importo numerico', typeof letti[0].importo, 'number');

sezione('backend: eliminazione');
const idTogli = r1.id;
addGiroconto_({ importo: 50, contoDa: 'Intesa', contoA: 'N26', data: '2026-08-05' });
verifica('due giroconti', getGiroconti_().data.length, 2);
verifica('elimina per id', deleteGiroconto_({ id: idTogli }).ok, true);
verifica('  ne resta uno', getGiroconti_().data.length, 1);
verifica('  quello giusto', getGiroconti_().data[0].contoDa, 'Intesa');
verifica('id inesistente -> errore', !!deleteGiroconto_({ id: 'boh' }).error, true);

sezione('backend: registrazione e schema');
verifica('getGiroconti in doGet', /case 'getGiroconti':\s*result = getGiroconti_\(\)/.test(h.gas), true);
verifica('addGiroconto in doPost', /case 'addGiroconto':\s*result = addGiroconto_\(body\)/.test(h.gas), true);
verifica('deleteGiroconto in doPost', /case 'deleteGiroconto':\s*result = deleteGiroconto_\(body\)/.test(h.gas), true);
verifica('schema Giroconti', /Giroconti: \['ID', 'Data', 'Importo', 'Conto_Da', 'Conto_A', 'Nota'\]/.test(h.gas), true);
verifica('giroconti nel bootstrap', /giroconti:\s*safe_/.test(h.gas), true);
verifica('foglio auto-creato al primo uso', /getOrCreateSpreadsheet_\(rootIter\.next\(\), 'Giroconti'\)/.test(h.gas), true);

sezione('frontend: validazioni prima dell invio');
const els = {};
const creaEl = id => ({ id, value: '', style: {}, innerHTML: '', disabled: false, focus() {}, classList: { add() {}, remove() {} } });
global.document = { getElementById: id => (els[id] = els[id] || creaEl(id)), querySelectorAll: () => [], activeElement: null, addEventListener() {}, removeEventListener() {} };
global.todayISO = '2026-08-25';
let toasts = [], posted = [];
global.toast = (t, o) => toasts.push({ t, tipo: o && o.tipo });
global.showMsg = (id, txt) => { els[id] = els[id] || creaEl(id); els[id]._msg = txt; };
global.apiPost = async b => { posted.push(b); return { ok: true, id: 'new1' }; };
global.renderContiList = () => {};
global.fmtDec = n => String(n);
global.CONTI = [{ nome: 'N26', tipo: 'Conto corrente' }, { nome: 'Intesa', tipo: 'Conto corrente' }];
global.GIROCONTI = [];
eval([h.estrai(h.src, 'loadGiroconti'), h.estrai(h.src, 'salvaGiroconto'), h.estrai(h.src, 'deleteGiroconto'), h.estrai(h.src, 'renderGirocontiList')].join('\n'));

function campo(id, v) { els[id] = els[id] || creaEl(id); els[id].value = v; }
async function provaSalva(imp, da, a) {
  posted = []; toasts = [];
  campo('giro-importo', imp); campo('giro-da', da); campo('giro-a', a);
  campo('giro-data', '2026-08-01'); campo('giro-nota', '');
  await salvaGiroconto();
  return { inviato: posted.length };
}

(async () => {
  let out = await provaSalva('', 'N26', 'Intesa');
  verifica('importo vuoto: non invia', out.inviato, 0);
  out = await provaSalva('10', 'N26', 'N26');
  verifica('stesso conto: non invia', out.inviato, 0);
  out = await provaSalva('10', '', 'Intesa');
  verifica('conto mancante: non invia', out.inviato, 0);
  out = await provaSalva('10', 'N26', 'Intesa');
  verifica('valido: invia', out.inviato, 1);
  verifica('  action addGiroconto', posted[0].action, 'addGiroconto');
  verifica('  payload completo', [posted[0].contoDa, posted[0].contoA, posted[0].importo], ['N26', 'Intesa', 10]);
  verifica('  toast di conferma', toasts.some(t => t.tipo === 'ok'), true);

  sezione('frontend: eliminazione ottimistica con ripristino');
  GIROCONTI.length = 0;
  GIROCONTI.push({ id: 'g1', data: '2026-08-01', importo: 100, contoDa: 'N26', contoA: 'Intesa', nota: '' },
                 { id: 'g2', data: '2026-08-05', importo: 50, contoDa: 'Intesa', contoA: 'N26', nota: '' });
  global.apiPost = async () => ({ ok: true });
  await deleteGiroconto('g1');
  verifica('eliminato dalla lista', GIROCONTI.map(g => g.id), ['g2']);
  GIROCONTI.length = 0;
  GIROCONTI.push({ id: 'g1', data: '2026-08-01', importo: 100, contoDa: 'N26', contoA: 'Intesa', nota: '' });
  global.apiPost = async () => { throw new Error('rete'); };
  await deleteGiroconto('g1');
  verifica('fallimento: la riga torna', GIROCONTI.map(g => g.id), ['g1']);

  sezione('frontend: caricamento dal bootstrap');
  await loadGiroconti({ giroconti: [{ id: 'x', importo: 5 }] });
  verifica('idratato dal payload', GIROCONTI.length, 1);

  sezione('struttura');
  verifica('loadGiroconti in idrata', /loadGiroconti\(pre\)/.test(h.estrai(h.src, 'idrata')), true);
  verifica('pulsante nella card conti', /onclick="apriGiroconto\(\)"/.test(h.src), true);
  verifica('modale nel markup', /id="giro-modal"/.test(h.src), true);
  verifica('modale dialog', /aria-labelledby="giro-modal-title"/.test(h.src), true);
  verifica('i due select escludono lo stesso conto', /filter\(c => c\.nome !== escludi\)/.test(h.estrai(h.src, '_popolaSelectConti')), true);

  sezione('sistema modale generalizzato');
  verifica('apriModale registra la modale attiva', /_modaleAttivaId = modal\.id/.test(h.estrai(h.src, 'apriModale')), true);
  verifica('chiusura usa la modale attiva', /_modaleAttivaId && document\.getElementById\(_modaleAttivaId\)/.test(h.estrai(h.src, 'chiudiModaleAttiva')), true);
  verifica('closeEditModal resta alias', /function closeEditModal\(daHistory\) \{ chiudiModaleAttiva\(daHistory\); \}/.test(h.src), true);
  verifica('Esc chiude la modale attiva', /chiudiModaleAttiva\(\)/.test(h.estrai(h.src, '_modaleKeydown')), true);
  verifica('apriGiroconto usa il sistema condiviso', /apriModale\(modal\)/.test(h.estrai(h.src, 'apriGiroconto')), true);

  h.fine();
})();
