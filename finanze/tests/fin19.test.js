// FIN-19 — Ricerca spese su piu' mesi.
//
// I filtri agivano solo sul mese caricato: cercare una spesa di cui non si ricorda
// il mese era impossibile senza navigare a mano. La ricerca globale scarica gli
// anni interi e filtra li', ma solo su click esplicito per non toccare l'avvio.
const h = require('./helpers');
const { verifica, sezione } = h;

global.MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
global.THIS_YEAR = 2026;
global.CATS = { Casa: { color: '#111' }, Cibo: { color: '#222' } };
global.currentYear = 2026; global.currentMonth = 8; global.monthStartDay = 1;
global.fmtDec = n => Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function creaEl(id) {
  const cls = new Set();
  return { id, disabled: false, _html: '', style: {}, textContent: '',
    classList: { add: c => cls.add(c), remove: c => cls.delete(c),
                 toggle: (c, on) => { on ? cls.add(c) : cls.delete(c); }, contains: c => cls.has(c) },
    get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; } };
}
const els = {};
global.document = { getElementById: id => (els[id] = els[id] || creaEl(id)) };
let toasts = [];
global.toast = (t, o) => toasts.push({ t, o });

global.activeFilters = { q: '', cat: '', minAmt: null, maxAmt: null };
// stato della ricerca come globali: le funzioni vi assegnano, il test le legge
global._ricercaCache = {}; global._ricercaPool = []; global.ricercaAttiva = false;
eval([h.estrai(h.src, 'localISO'), h.estrai(h.src, 'snapDateISO'), h.estrai(h.src, 'shiftMonth'), h.estrai(h.src, 'periodoDi'),
      h.estrai(h.src, 'filtraSpese'), h.estrai(h.src, 'getFilteredSpese'),
      h.arrow(h.src, '_RICERCA_ANNI'),
      h.estrai(h.src, 'aggiornaPulsanteRicerca'), h.estrai(h.src, 'cercaGlobale'),
      h.estrai(h.src, 'mostraRisultatiRicerca'), h.estrai(h.src, 'chiudiRicerca'),
      h.estrai(h.src, 'invalidaRicerca')].join('\n'));

let chiamate = [];
const DATI = {
  2026: [
    { id: 'a', data: '2026-03-10', importo: 12, categoria: 'Casa', sottocategoria: 'Bollette', nota: 'enel marzo' },
    { id: 'b', data: '2026-08-01', importo: 30, categoria: 'Cibo', sottocategoria: 'Spesa',    nota: 'coop' },
  ],
  2025: [
    { id: 'c', data: '2025-11-20', importo: 99, categoria: 'Casa', sottocategoria: 'Bollette', nota: 'enel novembre' },
  ],
};
global.apiGet = async q => {
  chiamate.push(q.action + ' ' + q.year + (q.month ? '-' + q.month : ''));
  if (q.action === 'getSpese' && !q.month) return { ok: true, data: DATI[q.year] || [] };
  return { ok: true, data: [] };
};

const filtro = (q, cat, min, max) => { global.activeFilters = { q: q||'', cat: cat||'', minAmt: min==null?null:min, maxAmt: max==null?null:max }; };
const btn = () => document.getElementById('search-global-btn');
const pannello = () => document.getElementById('search-results-list').innerHTML;
const tabRicercaOn = () => document.getElementById('tab-spese').classList.contains('ricerca-on');

(async () => {
  sezione('pulsante di ricerca');
  filtro(''); aggiornaPulsanteRicerca();
  verifica('senza testo il pulsante e nascosto', btn().style.display, 'none');
  filtro('', 'Casa', 5); aggiornaPulsanteRicerca();
  verifica('categoria o importo da soli non lo mostrano', btn().style.display, 'none');
  filtro('enel'); aggiornaPulsanteRicerca();
  verifica('con testo compare', btn().style.display, '');
  verifica('  copre corrente e precedente', /2025.2026/.test(btn().textContent), true);

  sezione('esecuzione della ricerca');
  chiamate = [];
  filtro('enel'); await cercaGlobale();
  verifica('un anno intero per volta, senza mese', chiamate.sort(), ['getSpese 2025', 'getSpese 2026']);
  verifica('ricerca attiva', ricercaAttiva, true);
  verifica('  le viste del mese sono nascoste', tabRicercaOn(), true);
  verifica('trova le spese di mesi diversi', (pannello().match(/class="row"/g) || []).length, 2);
  verifica('  marzo 2026 tra i risultati', /Mar 2026/.test(pannello()), true);
  verifica('  novembre 2025 tra i risultati', /Nov 2025/.test(pannello()), true);
  verifica('  la coop di agosto e esclusa dal testo', /coop/.test(pannello()), false);

  sezione('lazy: nessuna richiesta finche non si clicca');
  chiamate = [];
  filtro('coop'); aggiornaPulsanteRicerca();
  verifica('digitare non scarica nulla', chiamate.length, 0);

  sezione('cache tra ricerche');
  chiamate = [];
  filtro('enel'); await cercaGlobale();
  verifica('gli anni gia scaricati non si rileggono', chiamate.length, 0);

  sezione('i filtri si combinano col testo');
  filtro('enel', 'Casa', 50);
  mostraRisultatiRicerca();
  verifica('categoria + importo minimo applicati al pool', (pannello().match(/class="row"/g) || []).length, 1);
  verifica('  resta la riga da 99', /99,00/.test(pannello()), true);

  filtro('inesistente-xyz'); await cercaGlobale();
  verifica('nessun risultato -> messaggio vuoto', /Nessun movimento trovato/.test(pannello()), true);

  sezione('apertura della modifica da un altro mese');
  filtro('enel'); await cercaGlobale();
  const trovato = _ricercaPool.find(r => String(r.id) === 'c');
  verifica('il movimento di novembre 2025 e nel pool', !!trovato, true);

  sezione('chiusura');
  chiudiRicerca();
  verifica('la classe ricerca-on viene rimossa', tabRicercaOn(), false);
  verifica('  ricerca non piu attiva', ricercaAttiva, false);

  sezione('svuotare il testo chiude la ricerca');
  filtro('enel'); await cercaGlobale();
  verifica('attiva prima', ricercaAttiva, true);
  filtro(''); aggiornaPulsanteRicerca();
  verifica('svuotando il campo la ricerca si chiude', ricercaAttiva, false);
  verifica('  e la classe sparisce', tabRicercaOn(), false);

  sezione('invalidazione dopo mutazione');
  filtro('enel'); await cercaGlobale();
  chiamate = [];
  invalidaRicerca();
  await new Promise(r => setTimeout(r, 10));
  verifica('la cache viene svuotata e la ricerca aperta rilegge', chiamate.length > 0, true);

  sezione('struttura');
  verifica('getSpese senza month ritorna l anno intero (backend)',
    /if \(month\)/.test(h.estrai(h.gas, 'getSpese_')), true);
  verifica('openEditMovimento pesca anche dal pool di ricerca',
    /_ricercaPool\.find/.test(h.estrai(h.src, 'openEditMovimento')), true);
  verifica('le mutazioni su spese invalidano la ricerca',
    /invalidaRicerca\(\)/.test(h.estrai(h.src, '_renderDopoMutazione')), true);
  verifica('applyFilters aggiorna il pulsante e rifiltra dal vivo',
    /aggiornaPulsanteRicerca\(\)[\s\S]*if \(ricercaAttiva\) mostraRisultatiRicerca\(\)/.test(h.estrai(h.src, 'applyFilters')), true);

  h.fine();
})();
