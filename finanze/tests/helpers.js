// Scaffolding condiviso dalle suite.
//
// Le suite non importano il codice dell'app: lo *estraggono* dai file sorgente e
// lo eseguono. index.html e' un single-file senza moduli, quindi non c'e' nulla da
// require; estrarre per nome tiene i test allineati al codice vero invece che a
// una copia che invecchia.
const fs = require('fs');
const path = require('path');

const RADICE = path.join(__dirname, '..');
const leggi = f => fs.readFileSync(path.join(RADICE, f), 'utf8');

const src = leggi('index.html');                        // frontend
const gas = leggi('FinanzePersonali_AppsScript.js');    // backend Apps Script
const sw  = leggi('sw.js');                             // service worker

/**
 * Estrae il testo di una funzione contando le parentesi graffe.
 * Una regex attraverserebbe i confini di funzione e produrrebbe falsi positivi.
 */
function estrai(testo, nome) {
  let inizio = testo.indexOf('function ' + nome + '(');
  if (inizio === -1) throw new Error('funzione non trovata: ' + nome);
  // include la keyword async, altrimenti l'eval perde il tipo della funzione
  if (testo.slice(Math.max(0, inizio - 6), inizio) === 'async ') inizio -= 6;
  let livello = 0;
  for (let i = testo.indexOf('{', inizio); i < testo.length; i++) {
    if (testo[i] === '{') livello++;
    else if (testo[i] === '}') { livello--; if (livello === 0) return testo.slice(inizio, i + 1); }
  }
  throw new Error('parentesi non bilanciate in: ' + nome);
}

/** Valore letterale di una `const NOME = ...;` */
function costante(testo, nome) {
  const m = testo.match(new RegExp('const ' + nome + "\\s*=\\s*([^;]+?)(?:;|\\s+//)"));
  if (!m) throw new Error('costante non trovata: ' + nome);
  return m[1].trim();
}

/** Dichiarazione completa di una arrow function assegnata a const. */
function arrow(testo, nome) {
  const m = testo.match(new RegExp('const ' + nome + '\\s*=\\s*[^\\n]+;'));
  if (!m) throw new Error('arrow non trovata: ' + nome);
  return m[0];
}

/** Righe di codice, senza commenti di riga: serve alle asserzioni strutturali. */
const senzaCommenti = t => t.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

let falliti = 0, totali = 0;

function verifica(etichetta, attuale, atteso) {
  totali++;
  const a = JSON.stringify(attuale), b = JSON.stringify(atteso);
  const ok = a === b;
  if (!ok) falliti++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${etichetta}`);
  if (!ok) console.log(`      atteso ${b}\n      avuto  ${a}`);
  return ok;
}

const sezione = titolo => console.log(`\n-- ${titolo} --`);

function fine() {
  console.log(falliti === 0
    ? `\n${totali} asserzioni, tutte passate.`
    : `\n${falliti} su ${totali} fallite.`);
  process.exit(falliti === 0 ? 0 : 1);
}

module.exports = { src, gas, sw, estrai, costante, arrow, senzaCommenti, verifica, sezione, fine };
