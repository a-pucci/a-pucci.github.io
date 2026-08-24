// Esegue tutte le suite e riassume. Uso: node finanze/tests/run.js [filtro]
//
// Ogni suite gira in un processo suo: cosi' gli stub globali (document, fetch,
// localStorage, navigator) di una suite non contaminano le altre.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Il fuso conta: alcune conversioni di data sbagliavano solo con offset positivo.
const FUSO_BASE = 'Europe/Rome';
const FUSI_EXTRA = { 'fin20.test.js': ['UTC', 'America/New_York', 'Pacific/Auckland'] };

const filtro = process.argv[2];
const suite = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.test.js'))
  .filter(f => !filtro || f.includes(filtro))
  .sort((a, b) => {
    const n = s => parseInt((s.match(/\d+/) || [999])[0], 10);
    return n(a) - n(b) || a.localeCompare(b);
  });

if (!suite.length) {
  console.error(filtro ? `nessuna suite corrisponde a "${filtro}"` : 'nessuna suite trovata');
  process.exit(1);
}

let falliteTot = 0, eseguite = 0;

for (const file of suite) {
  for (const tz of [FUSO_BASE, ...(FUSI_EXTRA[file] || [])]) {
    eseguite++;
    const etichetta = file.replace('.test.js', '') + (tz === FUSO_BASE ? '' : `  [${tz}]`);
    try {
      const out = execFileSync(process.execPath, [path.join(__dirname, file)], {
        encoding: 'utf8', env: { ...process.env, TZ: tz }
      });
      const riepilogo = (out.trim().split('\n').pop() || '').trim();
      console.log(`ok    ${etichetta.padEnd(26)} ${riepilogo}`);
    } catch (e) {
      falliteTot++;
      console.log(`FALLITA  ${etichetta}`);
      const testo = (e.stdout || '') + (e.stderr || '');
      testo.split('\n').filter(l => /^FAIL|atteso|avuto|Error/.test(l.trim()))
           .forEach(l => console.log('   ' + l.trim()));
    }
  }
}

console.log(falliteTot === 0
  ? `\n${eseguite} esecuzioni, tutte verdi.`
  : `\n${falliteTot} su ${eseguite} fallite.`);
process.exit(falliteTot === 0 ? 0 : 1);
