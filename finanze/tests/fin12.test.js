// FIN-12 — Scorciatoie "usati di recente" nel quick add spesa.
//
// Inserire una spesa richiedeva cinque interazioni. Un chip ne precompila tre.
// Il punto delicato: un chip che punta a un conto non piu' esistente lascerebbe
// selezionato il conto precedente, mandando la spesa sul conto sbagliato senza
// alcun segnale.
const h = require('./helpers');
const { verifica, sezione } = h;

let deposito = {}, quotaPiena = false;
global.localStorage = {
  getItem: k => (k in deposito ? deposito[k] : null),
  setItem: (k, v) => { if (quotaPiena) throw new Error('quota'); deposito[k] = String(v); },
  removeItem: k => { delete deposito[k]; }
};
const elementi = {};
const creaEl = id => ({ id, value: '', style: {}, innerHTML: '', focused: false,
                        focus() { this.focused = true; } });
global.document = {
  getElementById: id => (elementi[id] = elementi[id] || creaEl(id)),
  querySelectorAll: () => []
};
global.CATS = {};
global.CONTI = [{ nome: 'N26', tipo: 'Conto corrente' },
                { nome: 'Trade Republic', tipo: 'Conto corrente' },
                { nome: 'Intesa Sanpaolo', tipo: 'Conto corrente' }];
global.updateSubcats = () => {};
global.selectQConto = () => {};

eval([`const _RECENTI_KEY = ${h.costante(h.src, '_RECENTI_KEY')};`,
      `const _RECENTI_MAX = ${h.costante(h.src, '_RECENTI_MAX')};`,
      'let _recentiVisibili = [];',
      h.arrow(h.src, '_escAttr'), h.arrow(h.src, '_chiaveCombo'),
      h.estrai(h.src, 'leggiRecenti'), h.estrai(h.src, 'registraRecente'),
      h.estrai(h.src, 'renderRecenti'), h.estrai(h.src, 'applicaRecente')].join('\n'));

const CHIAVE = eval(h.costante(h.src, '_RECENTI_KEY'));
const salvate = () => JSON.parse(deposito[CHIAVE] || '[]').map(c => [c.cat, c.sub, c.conto].join('|'));
const contenitore = () => document.getElementById('q-recenti');

sezione('registrazione');
deposito = {};
registraRecente('Casa', 'Bollette', 'N26');
verifica('prima combinazione salvata', salvate(), ['Casa|Bollette|N26']);

registraRecente('Cibo', 'Generale', 'Trade Republic');
verifica('la piu recente va in testa', salvate(), ['Cibo|Generale|Trade Republic', 'Casa|Bollette|N26']);

registraRecente('Casa', 'Bollette', 'N26');
verifica('un doppione risale invece di duplicarsi',
  salvate(), ['Casa|Bollette|N26', 'Cibo|Generale|Trade Republic']);

registraRecente('Casa', 'Bollette', 'Intesa Sanpaolo');
verifica('conto diverso = combinazione diversa', salvate().length, 3);

deposito = {};
for (let i = 1; i <= 8; i++) registraRecente('Cat' + i, 'Sub', 'N26');
verifica('tenute al massimo cinque', salvate().length, 5);
verifica('  la piu recente in testa', salvate()[0], 'Cat8|Sub|N26');
verifica('  la piu vecchia e caduta', salvate().includes('Cat1|Sub|N26'), false);

deposito = {};
registraRecente('', 'Bollette', 'N26');
verifica('categoria vuota non registrata', salvate(), []);
registraRecente('Altro', '', '');
verifica('sottocategoria e conto opzionali', salvate(), ['Altro||']);

deposito = {}; quotaPiena = true;
let esploso = false;
try { registraRecente('Casa', 'Bollette', 'N26'); } catch { esploso = true; }
verifica('quota piena non fa fallire il salvataggio della spesa', esploso, false);
quotaPiena = false;

deposito[CHIAVE] = '{rotto';
verifica('storage corrotto -> lista vuota', leggiRecenti(), []);
deposito[CHIAVE] = '{"non":"un array"}';
verifica('storage non-array -> lista vuota', leggiRecenti(), []);
deposito[CHIAVE] = '[{"sub":"x"},{"cat":"Casa","sub":"y","conto":"N26"}]';
verifica('voci senza categoria scartate', leggiRecenti().length, 1);

sezione('render');
deposito = {};
global.CATS = { Casa: { icon: '🏠', subs: ['Bollette'] }, Cibo: { icon: '🍽', subs: ['Generale'] } };
registraRecente('Casa', 'Bollette', 'N26');
registraRecente('Cibo', 'Generale', 'N26');
verifica('due chip mostrati', (contenitore().innerHTML.match(/<button/g) || []).length, 2);
verifica('  etichetta = sottocategoria', contenitore().innerHTML.includes('Generale'), true);
verifica('  icona della categoria inclusa', contenitore().innerHTML.includes('🍽'), true);
verifica('  contenitore visibile', contenitore().style.display, 'flex');

global.CATS = { Cibo: { icon: '🍽', subs: ['Generale'] } };
renderRecenti();
verifica('combo con categoria disattivata non mostrata',
  (contenitore().innerHTML.match(/<button/g) || []).length, 1);
verifica('  ma resta in memoria per quando torna', salvate().length, 2);

global.CATS = {};
renderRecenti();
verifica('nessuna combo valida -> nessuno spazio occupato',
  [contenitore().innerHTML, contenitore().style.display], ['', 'none']);

deposito = {}; global.CATS = { Casa: { icon: '', subs: [] } };
renderRecenti();
verifica('nessuno storico -> contenitore nascosto', contenitore().style.display, 'none');

// il caso trovato provando nel browser
deposito = {};
registraRecente('Casa', 'Spesa', 'ContoChiuso');
registraRecente('Casa', 'Bollette', 'N26');
registraRecente('Casa', 'Varie', '');
renderRecenti();
const etichette = [...contenitore().innerHTML.matchAll(/>([^<>]+)<\/button>/g)].map(m => m[1].trim()).sort();
verifica('combo con conto non piu esistente nascosta', etichette, ['Bollette', 'Varie']);
verifica('  combo senza conto resta valida', contenitore().innerHTML.includes('Varie'), true);

deposito = {};
global.CATS = { 'Casa "bella"': { icon: '', subs: [] } };
registraRecente('Casa "bella"', 'Sub & co', 'N26');
verifica('virgolette e ampersand non rompono gli attributi',
  contenitore().innerHTML.includes('&quot;') && contenitore().innerHTML.includes('&amp;'), true);

sezione('applicazione');
deposito = {};
global.CATS = { Casa: { icon: '', subs: ['Bollette'] } };
registraRecente('Casa', 'Bollette', 'N26');
let ordine = [];
global.updateSubcats = () => { ordine.push('updateSubcats'); };
applicaRecente(0);
verifica('categoria impostata', document.getElementById('q-cat').value, 'Casa');
verifica('updateSubcats chiamata prima della sottocategoria', ordine, ['updateSubcats']);
verifica('sottocategoria impostata', document.getElementById('q-subcat').value, 'Bollette');
verifica('focus spostato sull importo', document.getElementById('q-amount').focused, true);

let esplosoIdx = false;
try { applicaRecente(99); } catch { esplosoIdx = true; }
verifica('indice inesistente ignorato', esplosoIdx, false);

sezione('struttura');
const add = h.estrai(h.src, 'addSpesa');
verifica('addSpesa registra la combinazione', /registraRecente\(cat, sub, conto\)/.test(add), true);
verifica('  anche quando accodata offline',
  add.indexOf('registraRecente') < add.indexOf('res.queued'), true);
verifica('buildCatSelects rirende i chip', /renderRecenti\(\)/.test(h.estrai(h.src, 'buildCatSelects')), true);
verifica('contenitore nel markup', /id="q-recenti"/.test(h.src), true);
verifica('Invio salva la spesa', /\['q-amount', addSpesa\]/.test(h.src), true);
verifica('Invio salva anche l entrata', /\['e-amount', addEntrata\]/.test(h.src), true);
verifica('Invio non invia due volte', /e\.preventDefault\(\); azione\(\)/.test(h.src), true);
verifica('focus su tab Spese solo da desktop',
  /id === 'spese' && window\.innerWidth > 600/.test(h.estrai(h.src, 'showTab')), true);

h.fine();
