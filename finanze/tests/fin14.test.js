// FIN-14 — Notifiche in basso e annullamento al posto di confirm e alert.
//
// Il rischio reale non e' l'eliminazione intenzionale ma quella accidentale, e da
// un dialogo di conferma ci si difende male: si tocca OK per riflesso.
const h = require('./helpers');
const { verifica, sezione } = h;

function creaEl(tag) {
  return {
    tag, className: '', type: '', textContent: '', figli: [], _listener: {},
    appendChild(c) { this.figli.push(c); c._padre = this; },
    remove() { if (this._padre) this._padre.figli = this._padre.figli.filter(f => f !== this); },
    addEventListener(t, fn) { this._listener[t] = fn; },
    click() { if (this._listener.click) this._listener.click(); }
  };
}
const contenitore = creaEl('div');
const msgEl = {};
global.document = {
  createElement: creaEl,
  getElementById: id => (id === 'toast-wrap' ? contenitore : (msgEl[id] || null))
};
const timer = [];
global.setTimeout = (fn, ms) => { const t = { fn, ms, vivo: true }; timer.push(t); return t; };
global.clearTimeout = t => { if (t) t.vivo = false; };
const scadi = () => timer.filter(t => t.vivo).forEach(t => { t.vivo = false; t.fn(); });

eval(h.estrai(h.src, 'toast') + '\n' + h.estrai(h.src, 'showMsg'));

const notifiche = () => contenitore.figli.map(t => ({
  classe: t.className, testo: t.figli[0].textContent,
  azione: t.figli[1] ? t.figli[1].textContent : null
}));

sezione('notifiche');
contenitore.figli = []; timer.length = 0;
toast('Ciao');
verifica('notifica aggiunta', notifiche(), [{ classe: 'toast toast--info', testo: 'Ciao', azione: null }]);
verifica('durata predefinita 4s', timer[timer.length - 1].ms, 4000);
scadi();
verifica('scaduta -> rimossa', contenitore.figli.length, 0);

toast('Errore grave', { tipo: 'err', durata: 8000 });
verifica('tipo err nella classe', notifiche()[0].classe, 'toast toast--err');
verifica('durata personalizzata', timer[timer.length - 1].ms, 8000);
contenitore.figli = [];

let annullato = 0;
toast('Spesa eliminata', { azione: 'Annulla', onAzione: () => annullato++, durata: 6000 });
verifica('pulsante azione presente', notifiche()[0].azione, 'Annulla');
verifica('  durata sufficiente per reagire', timer[timer.length - 1].ms >= 5000, true);
contenitore.figli[0].figli[1].click();
verifica('azione eseguita al click', annullato, 1);
verifica('  notifica chiusa', contenitore.figli.length, 0);
scadi();
verifica('  il timer non riesegue l azione', annullato, 1);

contenitore.figli = [];
toast('una'); toast('due'); toast('tre');
verifica('notifiche impilate', notifiche().map(t => t.testo), ['una', 'due', 'tre']);
scadi();
verifica('  tutte rimosse alla scadenza', contenitore.figli.length, 0);

// i messaggi d'errore possono contenere dati: vanno inseriti come testo
toast('<img src=x onerror=boom>');
verifica('testo inserito come testo, non HTML', notifiche()[0].testo, '<img src=x onerror=boom>');
verifica('  nessun figlio HTML iniettato', contenitore.figli[0].figli.length, 1);
contenitore.figli = [];

const getVero = document.getElementById;
document.getElementById = () => null;
let esploso = false;
try { toast('x').chiudi(); } catch { esploso = true; }
verifica('contenitore assente gestito', esploso, false);
document.getElementById = getVero;

sezione('showMsg delega alle notifiche');
contenitore.figli = [];
msgEl['spesa-ok'] = { textContent: 'Spesa salvata su Google Sheets' };
showMsg('spesa-ok');
verifica('testo preso dall elemento quando omesso', notifiche()[0].testo, 'Spesa salvata su Google Sheets');
verifica('  tipo ok', notifiche()[0].classe, 'toast toast--ok');
contenitore.figli = [];

showMsg('spesa-err', 'Inserisci importo e categoria');
verifica('testo esplicito usato', notifiche()[0].testo, 'Inserisci importo e categoria');
verifica('  suffisso -err mappato su tipo err', notifiche()[0].classe, 'toast toast--err');
contenitore.figli = [];

showMsg('spesa-err', '');
verifica('nessun testo -> nessuna notifica', contenitore.figli.length, 0);
showMsg('inesistente');
verifica('elemento inesistente -> nessuna notifica', contenitore.figli.length, 0);

sezione('struttura');
verifica('nessun confirm() residuo', /\bconfirm\(/.test(h.senzaCommenti(h.src)), false);
verifica('nessun alert() residuo', /(?<!\.)\balert\(/.test(h.senzaCommenti(h.src)), false);
verifica('contenitore nel markup', /<div id="toast-wrap"><\/div>/.test(h.src), true);
verifica('area di tocco dell azione >= 44px', /\.toast-azione[^}]*min-height:\s*44px/.test(h.src), true);
verifica('ancorato in basso, fuori dalle card', /#toast-wrap[^}]*position:\s*fixed/.test(h.src), true);
verifica('rispetta prefers-reduced-motion',
  /prefers-reduced-motion[^}]*\{\s*\.toast\s*\{\s*animation:\s*none/.test(h.src.replace(/\n/g, '')), true);

const del = h.estrai(h.src, 'deleteMovimento');
verifica('elimina subito dalla vista', del.indexOf('splice(idx, 1)') < del.indexOf('apiPost'), true);
verifica('offre annullamento', /azione: 'Annulla'/.test(del), true);
verifica('  per almeno cinque secondi', /durata: 6000/.test(del), true);
verifica('nessuna conferma preventiva', /confirm/.test(del), false);
verifica('fallimento -> la riga torna al suo posto esatto', /splice\(idx, 0, riga\)/.test(del), true);

const rip = h.estrai(h.src, 'ripristinaMovimento');
verifica('il ripristino reinserisce sul foglio', /apiPost\(body\)/.test(rip), true);
verifica('  ricarica invece di indovinare il nuovo ID', /loadPeriodo\(\)/.test(rip), true);
verifica('  gestisce il caso accodato offline', /res\.queued/.test(rip), true);

h.fine();
