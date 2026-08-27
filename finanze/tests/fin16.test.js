// FIN-16 — Modale accessibile e aree di tocco adeguate.
//
// I pulsanti misuravano 24x24px con i centri a 30px: sotto la dimensione del
// polpastrello e abbastanza vicini da far sbagliare bersaglio.
const h = require('./helpers');
const { verifica, sezione } = h;

const regola = sel => {
  const m = h.src.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}'));
  return m ? m[1] : '';
};

sezione('focus e tastiera');
const creaEl = id => ({ id, disabled: false, offsetParent: {}, focused: false,
                        focus() { stato.attivo = this; this.focused = true; } });
const campi = ['a', 'b', 'c'].map(creaEl);
const stato = { attivo: null, display: 'flex', listener: {}, indietro: 0, push: 0 };
const modale = {
  id: 'edit-modal',
  style: { get display() { return stato.display; }, set display(v) { stato.display = v; } },
  querySelectorAll: () => campi
};
global.document = {
  getElementById: id => (id === 'edit-modal' ? modale : null),
  get activeElement() { return stato.attivo; },
  addEventListener: (t, fn) => { stato.listener[t] = fn; },
  removeEventListener: t => { delete stato.listener[t]; }
};
global.history = { pushState: () => stato.push++, back: () => stato.indietro++ };
global.window = { addEventListener: (t, fn) => { stato.listener['w:' + t] = fn; } };

eval(['let _modaleOrigine = null;', 'let _modaleInHistory = false;', 'let _modaleAttivaId = null;',
      h.src.match(/const _FOCUSABILI = [^;]+;/)[0],
      h.estrai(h.src, '_elementiFocusabili'), h.estrai(h.src, 'apriModale'),
      h.estrai(h.src, 'chiudiModaleAttiva'), h.estrai(h.src, 'closeEditModal'), h.estrai(h.src, '_modaleKeydown')].join('\n'));

const origine = creaEl('origine');
stato.attivo = origine; stato.display = 'flex';
apriModale(modale);
verifica('focus portato sul primo campo', stato.attivo.id, 'a');
verifica('voce di history aggiunta', stato.push, 1);

const tab = shift => _modaleKeydown({ key: 'Tab', shiftKey: !!shift, preventDefault() {} });
campi[2].focus(); tab();
verifica('Tab dall ultimo torna al primo', stato.attivo.id, 'a');
campi[0].focus(); tab(true);
verifica('Shift+Tab dal primo va all ultimo', stato.attivo.id, 'c');
campi[1].focus(); tab();
verifica('Tab in mezzo non viene intercettato', stato.attivo.id, 'b');

campi[1].disabled = true;
verifica('campo disabilitato escluso', _elementiFocusabili(modale).map(e => e.id), ['a', 'c']);
campi[1].disabled = false; campi[1].offsetParent = null;
verifica('campo nascosto escluso', _elementiFocusabili(modale).map(e => e.id), ['a', 'c']);
campi[1].offsetParent = {};

_modaleKeydown({ key: 'Escape', preventDefault() {} });
verifica('Esc chiude', stato.display, 'none');
verifica('  focus restituito a chi ha aperto', stato.attivo.id, 'origine');
verifica('  voce di history consumata', stato.indietro, 1);

stato.attivo = origine; stato.display = 'flex'; stato.indietro = 0;
apriModale(modale);
closeEditModal(true);
verifica('chiusura dal tasto indietro non torna indietro due volte', stato.indietro, 0);
verifica('  modale comunque chiusa', stato.display, 'none');

stato.indietro = 0;
closeEditModal();
verifica('chiudere due volte non fa nulla', stato.indietro, 0);

let esploso = false;
try { _modaleKeydown({ key: 'Tab', preventDefault() {} }); } catch { esploso = true; }
verifica('Tab a modale chiusa ignorato', esploso, false);

sezione('aree di tocco');
const bottoniRiga = regola('.row .del-btn, .row .edit-btn');
verifica('bottoni di riga: 44px di lato',
  [/min-width:\s*44px/.test(bottoniRiga), /min-height:\s*44px/.test(bottoniRiga)], [true, true]);
verifica('  icona centrata', /display:\s*inline-flex/.test(bottoniRiga), true);
verifica('  margine negativo per non far crescere la riga', /margin-top:\s*-8px/.test(bottoniRiga), true);
verifica('  indicatore di focus da tastiera', /focus-visible/.test(h.src), true);
const chiudi = regola('.modal-header .del-btn');
verifica('bottone chiudi: 44px di lato',
  [/min-width:\s*44px/.test(chiudi), /min-height:\s*44px/.test(chiudi)], [true, true]);

sezione('semantica');
verifica('modale dichiarata come dialog', /role="dialog"/.test(h.src), true);
verifica('  esclusiva', /aria-modal="true"/.test(h.src), true);
verifica('  etichettata dal proprio titolo', /aria-labelledby="edit-modal-title"/.test(h.src), true);
verifica('bottone chiudi etichettato', /aria-label="Chiudi"/.test(h.src), true);
verifica('bottoni di riga etichettati',
  [/aria-label="Modifica movimento"/.test(h.src), /aria-label="Elimina movimento"/.test(h.src)], [true, true]);

sezione('resa');
const card = regola('.modal-card');
verifica('sfondo opaco (era var(--card), mai definita)', /background:\s*var\(--surface\)/.test(card), true);
verifica('  scrollabile se piu alta dello schermo',
  [/max-height:\s*90vh/.test(card), /overflow-y:\s*auto/.test(card)], [true, true]);

// Il bug era una variabile inesistente che degradava a trasparente senza rumore:
// vale la pena verificare che non ce ne siano altre.
const radice = h.src.match(/:root\s*\{([\s\S]*?)\}/)[1];
const css = [...h.src.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const definite = new Set([...radice.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const conFallback = new Set([...css.matchAll(/var\((--[\w-]+)\s*,/g)].map(m => m[1]));
const indefinite = [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]))]
  .filter(v => !definite.has(v) && !conFallback.has(v)).sort();
verifica('nessuna variabile CSS usata senza definizione', indefinite, []);
verifica('--surface e definita in :root', /--surface:/.test(radice), true);

h.fine();
