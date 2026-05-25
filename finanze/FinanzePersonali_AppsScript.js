// ============================================================
//  FINANZE PERSONALI — Google Apps Script
//  Copia tutto questo file in:
//  script.google.com → Nuovo progetto → incolla → Salva
//  Poi: Esegui → setupCompleto()   (una volta sola)
//  Poi: Distribuisci → Nuova distribuzione → App web
// ============================================================

// ── Configurazione ──────────────────────────────────────────
const CONFIG = {
  ROOT_FOLDER_NAME: 'Finanza',
  YEAR: new Date().getFullYear(),
};

// ── Struttura colonne ────────────────────────────────────────
const COLUMNS = {
  Categorie: ['Categoria', 'Sottocategoria', 'Colore', 'Icona', 'Attiva'],
  Conti: ['ID', 'Nome', 'Tipo', 'Piattaforma', 'IBAN_o_Numero', 'Valuta', 'Note', 'Attivo', 'Saldo'],
  Spese: ['ID', 'Data', 'Importo', 'Categoria', 'Sottocategoria', 'Nota', 'Conto', 'Metodo_Pagamento'],
  Entrate: ['ID', 'Data', 'Importo', 'Tipo', 'Nota', 'Conto'],
  Investimenti: ['Data_Snapshot', 'Piattaforma', 'Conto', 'Strumento', 'Valore_Attuale', 'Investito', 'Rendimento_EUR', 'Rendimento_PCT'],
  Budget: ['Categoria', 'Sottocategoria', 'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
};

// ── Dati iniziali ────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  ['Auto',         'Carburante',      '#BA7517', 'car',       'TRUE'],
  ['Auto',         'Parcheggio',      '#BA7517', 'car',       'TRUE'],
  ['Auto',         'Manutenzione',    '#BA7517', 'car',       'TRUE'],
  ['Auto',         'Assicurazione',   '#BA7517', 'car',       'TRUE'],
  ['Auto',         'Bollo',           '#BA7517', 'car',       'TRUE'],
  ['Auto',         'Pedaggio',        '#BA7517', 'car',       'TRUE'],
  ['Casa',         'Affitto/Mutuo',   '#378ADD', 'home',      'TRUE'],
  ['Casa',         'Bollette',        '#378ADD', 'home',      'TRUE'],
  ['Casa',         'Internet',        '#378ADD', 'home',      'TRUE'],
  ['Casa',         'Condominio',      '#378ADD', 'home',      'TRUE'],
  ['Casa',         'Pulizie',         '#378ADD', 'home',      'TRUE'],
  ['Casa',         'Arredamento',     '#378ADD', 'home',      'TRUE'],
  ['Cibo',         'Supermercato',    '#1D9E75', 'shopping-cart', 'TRUE'],
  ['Cibo',         'Ristoranti',      '#1D9E75', 'shopping-cart', 'TRUE'],
  ['Cibo',         'Bar & caffè',     '#1D9E75', 'shopping-cart', 'TRUE'],
  ['Cibo',         'Delivery',        '#1D9E75', 'shopping-cart', 'TRUE'],
  ['Cibo',         'Mercato',         '#1D9E75', 'shopping-cart', 'TRUE'],
  ['Salute',       'Farmacia',        '#7F77DD', 'heart',     'TRUE'],
  ['Salute',       'Visite mediche',  '#7F77DD', 'heart',     'TRUE'],
  ['Salute',       'Palestra',        '#7F77DD', 'heart',     'TRUE'],
  ['Salute',       'Integratori',     '#7F77DD', 'heart',     'TRUE'],
  ['Svago',        'Cinema & teatro', '#D4537E', 'confetti',  'TRUE'],
  ['Svago',        'Sport',           '#D4537E', 'confetti',  'TRUE'],
  ['Svago',        'Viaggi',          '#D4537E', 'confetti',  'TRUE'],
  ['Svago',        'Libri & media',   '#D4537E', 'confetti',  'TRUE'],
  ['Svago',        'Concerti',        '#D4537E', 'confetti',  'TRUE'],
  ['Shopping',     'Abbigliamento',   '#D85A30', 'tag',       'TRUE'],
  ['Shopping',     'Elettronica',     '#D85A30', 'tag',       'TRUE'],
  ['Shopping',     'Regali',          '#D85A30', 'tag',       'TRUE'],
  ['Shopping',     'Casa & giardino', '#D85A30', 'tag',       'TRUE'],
  ['Abbonamenti',  'Netflix',         '#534AB7', 'repeat',    'TRUE'],
  ['Abbonamenti',  'Spotify',         '#534AB7', 'repeat',    'TRUE'],
  ['Abbonamenti',  'Software',        '#534AB7', 'repeat',    'TRUE'],
  ['Abbonamenti',  'Altro',           '#534AB7', 'repeat',    'TRUE'],
  ['Trasporti',    'Mezzi pubblici',  '#0F6E56', 'bus',       'TRUE'],
  ['Trasporti',    'Taxi & Uber',     '#0F6E56', 'bus',       'TRUE'],
  ['Trasporti',    'Treno',           '#0F6E56', 'bus',       'TRUE'],
  ['Trasporti',    'Aereo',           '#0F6E56', 'bus',       'TRUE'],
  ['Altro',        'Istruzione',      '#888780', 'dots',      'TRUE'],
  ['Altro',        'Banca & comm.',   '#888780', 'dots',      'TRUE'],
  ['Altro',        'Tasse',           '#888780', 'dots',      'TRUE'],
  ['Altro',        'Non categ.',      '#888780', 'dots',      'TRUE'],
];

const DEFAULT_ACCOUNTS = [
  ['conto_1', 'Intesa Sanpaolo', 'Conto corrente', 'Intesa Sanpaolo', '', 'EUR', '', 'TRUE', 0],
  ['conto_2', 'N26',             'Conto corrente', 'N26',             '', 'EUR', '', 'TRUE', 0],
  ['inv_1',   'Trade Republic',  'Investimento',   'Trade Republic',  '', 'EUR', '', 'TRUE', 0],
  ['inv_2',   'Moneyfarm',       'Investimento',   'Moneyfarm',       '', 'EUR', '', 'TRUE', 0],
];

// ── SETUP PRINCIPALE ─────────────────────────────────────────

/**
 * Setup iniziale completo. Da eseguire una sola volta dopo aver incollato lo script.
 * Crea la struttura cartelle/file su Drive e salva gli ID nei PropertiesService.
 */
function setupCompleto() {
  Logger.log('⏳ Avvio setup struttura Finanza...');

  const rootFolder = getOrCreateFolder_(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME);
  Logger.log('✅ Cartella Finanza: ' + rootFolder.getUrl());

  const catSS   = getOrCreateSpreadsheet_(rootFolder, 'Categorie');
  const contiSS  = getOrCreateSpreadsheet_(rootFolder, 'Conti');
  setupCategorie_(catSS);
  setupConti_(contiSS);
  Logger.log('✅ File master creati');

  const yearFolder = getOrCreateFolder_(rootFolder, String(CONFIG.YEAR));

  const speseSS  = getOrCreateSpreadsheet_(yearFolder, 'Spese_' + CONFIG.YEAR);
  const entrSS   = getOrCreateSpreadsheet_(yearFolder, 'Entrate_' + CONFIG.YEAR);
  const invSS    = getOrCreateSpreadsheet_(yearFolder, 'Investimenti_' + CONFIG.YEAR);
  const budgSS   = getOrCreateSpreadsheet_(yearFolder, 'Budget_' + CONFIG.YEAR);

  setupSheet_(speseSS,  'Spese_' + CONFIG.YEAR,        COLUMNS.Spese);
  setupSheet_(entrSS,   'Entrate_' + CONFIG.YEAR,       COLUMNS.Entrate);
  setupSheet_(invSS,    'Investimenti_' + CONFIG.YEAR,  COLUMNS.Investimenti);
  setupBudget_(budgSS);
  Logger.log('✅ File annuali ' + CONFIG.YEAR + ' creati');

  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    'ID_CATEGORIE':    catSS.getId(),
    'ID_CONTI':        contiSS.getId(),
    'ID_SPESE':        speseSS.getId(),
    'ID_ENTRATE':      entrSS.getId(),
    'ID_INVESTIMENTI': invSS.getId(),
    'ID_BUDGET':       budgSS.getId(),
    'YEAR':            String(CONFIG.YEAR),
  });

  Logger.log('');
  Logger.log('🎉 Setup completato!');
  Logger.log('📁 Cartella: ' + rootFolder.getUrl());
  Logger.log('');
  Logger.log('Prossimo passo:');
  Logger.log('  Distribuisci → Nuova distribuzione → App web');
  Logger.log('  Esegui come: Me');
  Logger.log('  Chi ha accesso: Chiunque');
  Logger.log('  → copia l\'URL e incollalo nella dashboard');
}

/**
 * Crea la struttura Sheets per un nuovo anno (Spese, Entrate, Investimenti).
 * Da eseguire manualmente a inizio anno da script.google.com → Esegui.
 * Non sovrascrive file già esistenti per l'anno indicato.
 * @param {number} year - Anno da creare (es. 2027). Default: anno corrente + 1.
 */
function nuovoAnno(year) {
  const targetYear = String(year || CONFIG.YEAR + 1);
  Logger.log('⏳ Creazione struttura per anno ' + targetYear + '...');

  const rootIter = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (!rootIter.hasNext()) throw new Error('Cartella "' + CONFIG.ROOT_FOLDER_NAME + '" non trovata su Drive. Esegui setupCompleto() prima.');
  const root = rootIter.next();

  const yearFolder = getOrCreateFolder_(root, targetYear);

  const speseSS = getOrCreateSpreadsheet_(yearFolder, 'Spese_' + targetYear);
  const entrSS  = getOrCreateSpreadsheet_(yearFolder, 'Entrate_' + targetYear);
  const invSS   = getOrCreateSpreadsheet_(yearFolder, 'Investimenti_' + targetYear);

  setupSheet_(speseSS, 'Spese_' + targetYear,        COLUMNS.Spese);
  setupSheet_(entrSS,  'Entrate_' + targetYear,       COLUMNS.Entrate);
  setupSheet_(invSS,   'Investimenti_' + targetYear,  COLUMNS.Investimenti);

  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    'ID_SPESE':        speseSS.getId(),
    'ID_ENTRATE':      entrSS.getId(),
    'ID_INVESTIMENTI': invSS.getId(),
    'YEAR':            targetYear,
  });

  Logger.log('✅ Anno ' + targetYear + ' creato:');
  Logger.log('   Spese_' + targetYear + ': ' + speseSS.getUrl());
  Logger.log('   Entrate_' + targetYear + ': ' + entrSS.getUrl());
  Logger.log('   Investimenti_' + targetYear + ': ' + invSS.getUrl());
  Logger.log('');
  Logger.log('Ridistribuisci lo script (Distribuisci → Gestisci distribuzioni → nuova versione) per applicare il cambio anno.');
}

// ── Utility: cartelle e spreadsheet ─────────────────────────

/**
 * Restituisce una cartella esistente o la crea se non esiste.
 * @param {Folder} parent - Cartella padre su Drive
 * @param {string} name - Nome della cartella
 * @returns {Folder}
 */
function getOrCreateFolder_(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

/**
 * Restituisce uno Spreadsheet esistente nella cartella o lo crea se non esiste.
 * @param {Folder} folder - Cartella Drive in cui cercare/creare il file
 * @param {string} name - Nome del file Spreadsheet
 * @returns {Spreadsheet}
 */
function getOrCreateSpreadsheet_(folder, name) {
  const iter = folder.getFilesByName(name);
  if (iter.hasNext()) {
    return SpreadsheetApp.open(iter.next());
  }
  const ss = SpreadsheetApp.create(name);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

// ── Setup fogli specifici ────────────────────────────────────

/**
 * Inizializza il foglio Categorie con header e dati di default.
 * @param {Spreadsheet} ss
 */
function setupCategorie_(ss) {
  const sheet = ss.getSheets()[0];
  sheet.setName('Categorie');
  sheet.clearContents();

  const header = COLUMNS.Categorie;
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  formatHeader_(sheet, header.length);

  if (DEFAULT_CATEGORIES.length > 0) {
    sheet.getRange(2, 1, DEFAULT_CATEGORIES.length, header.length)
      .setValues(DEFAULT_CATEGORIES);
  }
  sheet.setFrozenRows(1);
  autoResizeAll_(sheet, header.length);
}

/**
 * Inizializza il foglio Conti con header e conti di default.
 * @param {Spreadsheet} ss
 */
function setupConti_(ss) {
  const sheet = ss.getSheets()[0];
  sheet.setName('Conti');
  sheet.clearContents();

  const header = COLUMNS.Conti;
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  formatHeader_(sheet, header.length);

  if (DEFAULT_ACCOUNTS.length > 0) {
    sheet.getRange(2, 1, DEFAULT_ACCOUNTS.length, header.length)
      .setValues(DEFAULT_ACCOUNTS);
  }
  sheet.setFrozenRows(1);
  autoResizeAll_(sheet, header.length);
}

/**
 * Inizializza un foglio generico con header e riga intestazione congelata.
 * @param {Spreadsheet} ss
 * @param {string} sheetName - Nome da assegnare al foglio
 * @param {string[]} columns - Array di nomi colonne
 */
function setupSheet_(ss, sheetName, columns) {
  const sheet = ss.getSheets()[0];
  sheet.setName(sheetName);
  sheet.clearContents();

  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
  formatHeader_(sheet, columns.length);
  sheet.setFrozenRows(1);
  autoResizeAll_(sheet, columns.length);
}

/**
 * Inizializza il foglio Budget con header, colonne congelate e
 * pre-popolamento dalle categorie attive.
 * @param {Spreadsheet} ss
 */
function setupBudget_(ss) {
  const sheet = ss.getSheets()[0];
  sheet.setName('Budget_' + CONFIG.YEAR);
  sheet.clearContents();

  const header = COLUMNS.Budget;
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  formatHeader_(sheet, header.length);

  const props = PropertiesService.getScriptProperties();
  const catId = props.getProperty('ID_CATEGORIE');
  if (catId) {
    try {
      const catSS = SpreadsheetApp.openById(catId);
      const catSheet = catSS.getSheets()[0];
      const data = catSheet.getDataRange().getValues().slice(1)
        .filter(r => r[4] === 'TRUE' || r[4] === true);
      if (data.length > 0) {
        const budgetRows = data.map(r => [r[0], r[1], 0,0,0,0,0,0,0,0,0,0,0,0]);
        sheet.getRange(2, 1, budgetRows.length, header.length).setValues(budgetRows);
      }
    } catch(e) {
      Logger.log('Info: categorie non ancora disponibili per Budget, popolamento saltato.');
    }
  }

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  autoResizeAll_(sheet, header.length);
}

// ── Formattazione ────────────────────────────────────────────

/**
 * Applica stile scuro alla riga di intestazione del foglio.
 * @param {Sheet} sheet
 * @param {number} numCols - Numero di colonne da formattare
 */
function formatHeader_(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#2C2C2A');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
}

/**
 * Ridimensiona automaticamente tutte le colonne in base al contenuto.
 * @param {Sheet} sheet
 * @param {number} numCols - Numero di colonne da ridimensionare
 */
function autoResizeAll_(sheet, numCols) {
  for (let i = 1; i <= numCols; i++) sheet.autoResizeColumn(i);
}

// ── ID generatore ────────────────────────────────────────────

/**
 * Genera un ID univoco breve (8 caratteri esadecimali).
 * @returns {string}
 */
function generateId_() {
  return Utilities.getUuid().split('-')[0];
}

// ── doGet: lettura dati per la dashboard ─────────────────────

/**
 * Handler HTTP GET. Smista le richieste di lettura dati in base al parametro `action`.
 * @param {Object} e - Evento Apps Script con e.parameter
 * @returns {TextOutput} Risposta JSON
 */
function doGet(e) {
  const params = e.parameter;
  const action = params.action || '';

  try {
    let result;
    switch(action) {
      case 'getCategorie':    result = getCategorie_();    break;
      case 'getConti':        result = getConti_();        break;
      case 'getSpese':        result = getSpese_(params);  break;
      case 'getEntrate':      result = getEntrate_(params);break;
      case 'getInvestimenti': result = getInvestimenti_(params); break;
      case 'getBudget':       result = getBudget_(params); break;
      case 'getSummary':      result = getSummary_(params);break;
      case 'getSummaryAnno':  result = getSummaryAnno_(params); break;
      default:
        result = { error: 'Azione non riconosciuta: ' + action };
    }
    return jsonResponse_(result);
  } catch(err) {
    return jsonResponse_({ error: err.message });
  }
}

// ── doPost: scrittura dati ───────────────────────────────────

/**
 * Handler HTTP POST. Smista le richieste di scrittura dati in base al campo `action` del body.
 * @param {Object} e - Evento Apps Script con e.postData.contents (JSON)
 * @returns {TextOutput} Risposta JSON
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';
    let result;

    switch(action) {
      case 'addSpesa':        result = addSpesa_(body);        break;
      case 'addEntrata':      result = addEntrata_(body);      break;
      case 'addInvestimento': result = addInvestimento_(body); break;
      case 'updateBudget':    result = updateBudget_(body);    break;
      case 'addCategoria':    result = addCategoria_(body);    break;
      case 'addConto':        result = addConto_(body);        break;
      case 'deleteRow':            result = deleteRow_(body);            break;
      case 'updateRow':            result = updateRow_(body);            break;
      case 'bulkImportSpese':      result = bulkImportSpese_(body);      break;
      case 'bulkImportInvestimenti': result = bulkImportInvestimenti_(body); break;
      default:
        result = { error: 'Azione non riconosciuta: ' + action };
    }
    return jsonResponse_(result);
  } catch(err) {
    return jsonResponse_({ error: err.message });
  }
}

// ── Letture ──────────────────────────────────────────────────

/**
 * Legge tutte le categorie attive e le restituisce raggruppate per categoria padre.
 * @returns {{ ok: boolean, data: Object.<string, {color: string, icon: string, subs: string[]}> }}
 */
function getCategorie_() {
  const data = readSheet_('ID_CATEGORIE');
  const cats = {};
  data.forEach(row => {
    const [cat, sub, color, icon, active] = row;
    if (active !== 'TRUE' && active !== true) return;
    if (!cats[cat]) cats[cat] = { color, icon, subs: [] };
    if (sub) cats[cat].subs.push(sub);
  });
  return { ok: true, data: cats };
}

/**
 * Legge tutti i conti attivi con saldo corrente.
 * @returns {{ ok: boolean, data: Array }}
 */
function getConti_() {
  const data = readSheet_('ID_CONTI');
  const conti = data
    .filter(r => r[7] === 'TRUE' || r[7] === true)
    .map(r => ({
      id: r[0], nome: r[1], tipo: r[2],
      piattaforma: r[3], valuta: r[5], note: r[6],
      saldo: parseFloat(r[8]) || 0
    }));
  return { ok: true, data: conti };
}

/**
 * Legge le spese filtrate per anno, mese e/o categoria.
 * @param {{ year?: number|string, month?: number|string, cat?: string }} params
 * @returns {{ ok: boolean, data: Array }}
 */
function getSpese_(params) {
  const year  = params.year  || CONFIG.YEAR;
  const month = params.month || null;
  const cat   = params.cat   || null;

  const data = readSheetByName_('Spese_' + year);
  let rows = data.map(r => ({
    id: r[0], data: r[1], importo: parseFloat(r[2]) || 0,
    categoria: r[3], sottocategoria: r[4], nota: r[5],
    conto: r[6], metodo: r[7]
  }));

  if (month) {
    rows = rows.filter(r => {
      const d = new Date(r.data);
      return d.getMonth() + 1 === parseInt(month);
    });
  }
  if (cat) rows = rows.filter(r => r.categoria === cat);

  return { ok: true, data: rows };
}

/**
 * Legge le entrate filtrate per anno e mese.
 * @param {{ year?: number|string, month?: number|string }} params
 * @returns {{ ok: boolean, data: Array }}
 */
function getEntrate_(params) {
  const year  = params.year  || CONFIG.YEAR;
  const month = params.month || null;
  const data  = readSheetByName_('Entrate_' + year);
  let rows = data.map(r => ({
    id: r[0], data: r[1], importo: parseFloat(r[2]) || 0,
    tipo: r[3], nota: r[4], conto: r[5]
  }));
  if (month) {
    rows = rows.filter(r => {
      const d = new Date(r.data);
      return d.getMonth() + 1 === parseInt(month);
    });
  }
  return { ok: true, data: rows };
}

/**
 * Legge tutti gli snapshot investimenti per l'anno specificato.
 * @param {{ year?: number|string }} params
 * @returns {{ ok: boolean, data: Array }}
 */
function getInvestimenti_(params) {
  const year = params.year || CONFIG.YEAR;
  const data = readSheetByName_('Investimenti_' + year);
  const rows = data.map(r => ({
    data: r[0], piattaforma: r[1], conto: r[2], strumento: r[3],
    valore: parseFloat(r[4]) || 0, investito: parseFloat(r[5]) || 0,
    rendimentoEur: parseFloat(r[6]) || 0, rendimentoPct: parseFloat(r[7]) || 0
  }));
  return { ok: true, data: rows };
}

/**
 * Legge le righe del foglio Budget per l'anno specificato.
 * @param {{ year?: number|string }} params
 * @returns {{ ok: boolean, data: Array }}
 */
function getBudget_(params) {
  const year = params.year || CONFIG.YEAR;
  const data = readSheetByName_('Budget_' + year);
  const rows = data.map(r => ({
    categoria: r[0], sottocategoria: r[1],
    mensili: r.slice(2).map(v => parseFloat(v) || 0)
  }));
  return { ok: true, data: rows };
}

/**
 * Calcola il riepilogo finanziario per un mese: totali spese/entrate,
 * risparmio, investimenti per piattaforma e spese per categoria.
 * @param {{ year?: number|string, month?: number|string }} params
 * @returns {{ ok: boolean, data: Object }}
 */
function getSummary_(params) {
  const year  = params.year  || CONFIG.YEAR;
  const month = params.month || (new Date().getMonth() + 1);

  const spese    = getSpese_({ year, month }).data;
  const entrate  = getEntrate_({ year, month }).data;
  const investim = getInvestimenti_({ year }).data;

  const totSpese   = spese.reduce((s, r) => s + r.importo, 0);
  const totEntrate = entrate.reduce((s, r) => s + r.importo, 0);

  // Ultimo snapshot per piattaforma
  const invByPiattaforma = {};
  investim.forEach(r => {
    if (!invByPiattaforma[r.piattaforma] ||
        new Date(r.data) > new Date(invByPiattaforma[r.piattaforma].data)) {
      invByPiattaforma[r.piattaforma] = r;
    }
  });
  const totInvestimenti = Object.values(invByPiattaforma)
    .reduce((s, r) => s + r.valore, 0);

  const perCat = {};
  spese.forEach(r => {
    if (!perCat[r.categoria]) perCat[r.categoria] = { totale: 0, subs: {} };
    perCat[r.categoria].totale += r.importo;
    const sub = r.sottocategoria || 'Altro';
    perCat[r.categoria].subs[sub] = (perCat[r.categoria].subs[sub] || 0) + r.importo;
  });

  return {
    ok: true,
    data: {
      mese: month, anno: year,
      totSpese, totEntrate,
      risparmio: totEntrate - totSpese,
      totInvestimenti,
      patrimonioLiquido: totEntrate,
      speseByCat: perCat,
      investimentiByPiattaforma: invByPiattaforma
    }
  };
}

/**
 * Calcola i totali mensili di spese ed entrate per l'intero anno (12 mesi).
 * Usato dal grafico andamento annuale nella dashboard.
 * @param {{ year?: number|string }} params
 * @returns {{ ok: boolean, data: { spese: number[], entrate: number[] } }}
 */
function getSummaryAnno_(params) {
  const year = params.year || CONFIG.YEAR;
  const speseMensili   = new Array(12).fill(0);
  const entrateMensili = new Array(12).fill(0);

  try {
    const spese = readSheetByName_('Spese_' + year);
    spese.forEach(r => {
      const m = new Date(r[1]).getMonth();
      speseMensili[m] += parseFloat(r[2]) || 0;
    });
  } catch(e) {}

  try {
    const entrate = readSheetByName_('Entrate_' + year);
    entrate.forEach(r => {
      const m = new Date(r[1]).getMonth();
      entrateMensili[m] += parseFloat(r[2]) || 0;
    });
  } catch(e) {}

  return { ok: true, data: { spese: speseMensili, entrate: entrateMensili } };
}

// ── Scritture ────────────────────────────────────────────────

/**
 * Aggiunge una spesa al foglio dell'anno e aggiorna il saldo del conto associato.
 * @param {{ importo: number, categoria: string, sottocategoria?: string, nota?: string, data?: string, year?: string, conto?: string, metodo?: string }} body
 * @returns {{ ok: boolean, id: string }}
 */
function addSpesa_(body) {
  const year = body.year || CONFIG.YEAR;
  const row = [
    generateId_(),
    body.data       || new Date().toISOString().slice(0,10),
    body.importo,
    body.categoria,
    body.sottocategoria || '',
    body.nota           || '',
    body.conto          || '',
    body.metodo         || '',
  ];
  appendRow_('Spese_' + year, row);
  if (body.conto) updateSaldoConto_(body.conto, -(parseFloat(body.importo) || 0));
  return { ok: true, id: row[0] };
}

/**
 * Aggiunge un'entrata al foglio dell'anno e aggiorna il saldo del conto associato.
 * @param {{ importo: number, tipo?: string, nota?: string, data?: string, year?: string, conto?: string }} body
 * @returns {{ ok: boolean, id: string }}
 */
function addEntrata_(body) {
  const year = body.year || CONFIG.YEAR;
  const row = [
    generateId_(),
    body.data  || new Date().toISOString().slice(0,10),
    body.importo,
    body.tipo  || '',
    body.nota  || '',
    body.conto || '',
  ];
  appendRow_('Entrate_' + year, row);
  if (body.conto) updateSaldoConto_(body.conto, parseFloat(body.importo) || 0);
  return { ok: true, id: row[0] };
}

/**
 * Aggiunge uno snapshot investimento al foglio dell'anno.
 * @param {{ piattaforma: string, valore: number, data?: string, year?: string, conto?: string, strumento?: string, investito?: number, rendimentoEur?: number, rendimentoPct?: number }} body
 * @returns {{ ok: boolean }}
 */
function addInvestimento_(body) {
  const year = body.year || CONFIG.YEAR;
  const row = [
    body.data             || new Date().toISOString().slice(0,10),
    body.piattaforma,
    body.conto            || '',
    body.strumento        || '',
    body.valore,
    body.investito        || '',
    body.rendimentoEur    || '',
    body.rendimentoPct    || '',
  ];
  appendRow_('Investimenti_' + year, row);
  return { ok: true };
}

/**
 * Aggiunge una nuova categoria (e relativa sottocategoria) al foglio Categorie
 * e alla riga corrispondente nel Budget corrente.
 * @param {{ categoria: string, sottocategoria?: string, colore?: string, icona?: string }} body
 * @returns {{ ok: boolean }}
 */
function addCategoria_(body) {
  const props = PropertiesService.getScriptProperties();
  const ss    = SpreadsheetApp.openById(props.getProperty('ID_CATEGORIE'));
  const sheet = ss.getSheets()[0];
  sheet.appendRow([
    body.categoria, body.sottocategoria || '',
    body.colore || '#888780', body.icona || 'dots', 'TRUE'
  ]);

  try {
    const budgSS    = SpreadsheetApp.openById(props.getProperty('ID_BUDGET'));
    const budgSheet = budgSS.getSheets()[0];
    budgSheet.appendRow([body.categoria, body.sottocategoria || '', 0,0,0,0,0,0,0,0,0,0,0,0]);
  } catch(e) {}

  return { ok: true };
}

/**
 * Aggiunge un nuovo conto al foglio Conti con saldo iniziale zero.
 * @param {{ nome: string, tipo: string, piattaforma?: string, iban?: string, valuta?: string, note?: string }} body
 * @returns {{ ok: boolean }}
 */
function addConto_(body) {
  const props = PropertiesService.getScriptProperties();
  const ss    = SpreadsheetApp.openById(props.getProperty('ID_CONTI'));
  const sheet = ss.getSheets()[0];
  sheet.appendRow([
    generateId_(), body.nome, body.tipo,
    body.piattaforma || '', body.iban || '',
    body.valuta || 'EUR', body.note || '', 'TRUE', 0
  ]);
  return { ok: true };
}

/**
 * Aggiorna i valori mensili del Budget per le righe indicate.
 * @param {{ year?: string, righe: Array<{ categoria: string, sottocategoria: string, mensili: number[] }> }} body
 * @returns {{ ok: boolean }}
 */
function updateBudget_(body) {
  const props = PropertiesService.getScriptProperties();
  const ss    = SpreadsheetApp.openById(props.getProperty('ID_BUDGET'));
  const sheet = ss.getSheets()[0];
  const data  = sheet.getDataRange().getValues();

  body.righe.forEach(riga => {
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === riga.categoria && data[i][1] === riga.sottocategoria) {
        sheet.getRange(i+1, 3, 1, 12).setValues([riga.mensili]);
        break;
      }
    }
  });
  return { ok: true };
}

/**
 * Aggiorna i campi di una riga esistente in Spese o Entrate, identificata dall'ID.
 * @param {{ sheetKey: 'spese'|'entrate', year?: string, id: string, fields: Array }} body
 * @returns {{ ok: boolean }|{ error: string }}
 */
function updateRow_(body) {
  // fields per spese:   [Data, Importo, Categoria, Sottocategoria, Nota, Conto, Metodo_Pagamento]
  // fields per entrate: [Data, Importo, Tipo, Nota, Conto]
  const year = body.year || CONFIG.YEAR;
  const keyMap = { spese: 'Spese_' + year, entrate: 'Entrate_' + year };
  const sheetName = keyMap[body.sheetKey];
  if (!sheetName) return { error: 'Sheet non trovato' };

  const props = PropertiesService.getScriptProperties();
  const keyProp = 'ID_' + body.sheetKey.toUpperCase();
  const ss    = SpreadsheetApp.openById(props.getProperty(keyProp));
  const sheet = ss.getSheetByName(sheetName);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      sheet.getRange(i + 1, 2, 1, body.fields.length).setValues([body.fields]);
      return { ok: true };
    }
  }
  return { error: 'Riga non trovata' };
}

/**
 * Elimina una riga da Spese o Entrate identificata dall'ID.
 * @param {{ sheetKey: 'spese'|'entrate', year?: string, id: string }} body
 * @returns {{ ok: boolean }|{ error: string }}
 */
function deleteRow_(body) {
  const year  = body.year || CONFIG.YEAR;
  const keyMap = {
    spese:  'Spese_' + year,
    entrate: 'Entrate_' + year,
  };
  const sheetName = keyMap[body.sheetKey];
  if (!sheetName) return { error: 'Sheet non trovato' };

  const props = PropertiesService.getScriptProperties();
  const keyProp = 'ID_' + body.sheetKey.toUpperCase();
  const ss    = SpreadsheetApp.openById(props.getProperty(keyProp));
  const sheet = ss.getSheetByName(sheetName);
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'Riga non trovata' };
}

/**
 * Aggiorna il saldo del conto specificato sommando il delta indicato.
 * Usato internamente da addSpesa_ (delta negativo) e addEntrata_ (delta positivo).
 * @param {string} nomeConto - Nome del conto (colonna Nome nel foglio Conti)
 * @param {number} delta - Importo da sommare al saldo corrente (negativo per spese)
 */
function updateSaldoConto_(nomeConto, delta) {
  if (!nomeConto || delta == null || isNaN(delta)) return;
  const props = PropertiesService.getScriptProperties();
  const id    = props.getProperty('ID_CONTI');
  if (!id) return;
  const ss    = SpreadsheetApp.openById(id);
  const sheet = ss.getSheets()[0];
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === nomeConto) {
      const current = parseFloat(data[i][8]) || 0;
      sheet.getRange(i + 1, 9).setValue(current + delta);
      return;
    }
  }
}

// ── Helpers lettura ──────────────────────────────────────────

/**
 * Legge tutte le righe non vuote di uno Spreadsheet tramite la chiave Properties (es. 'ID_CATEGORIE').
 * @param {string} propKey - Chiave in PropertiesService che contiene l'ID dello Spreadsheet
 * @returns {Array[]} Righe dati (senza header)
 */
function readSheet_(propKey) {
  const props = PropertiesService.getScriptProperties();
  const id    = props.getProperty(propKey);
  if (!id) throw new Error('ID non trovato per: ' + propKey);
  const ss    = SpreadsheetApp.openById(id);
  const sheet = ss.getSheets()[0];
  const data  = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r.some(c => c !== ''));
}

/**
 * Legge tutte le righe non vuote di un foglio specifico dentro uno Spreadsheet annuale.
 * Il nome del foglio determina quale Spreadsheet aprire (es. 'Spese_2025' → ID_SPESE).
 * @param {string} sheetName - Nome del foglio (es. 'Spese_2025')
 * @returns {Array[]} Righe dati (senza header)
 */
function readSheetByName_(sheetName) {
  const yearKey  = 'ID_' + sheetName.split('_')[0].toUpperCase();
  const props    = PropertiesService.getScriptProperties();
  const id       = props.getProperty(yearKey);
  if (!id) throw new Error('ID non trovato per: ' + yearKey);
  const ss       = SpreadsheetApp.openById(id);
  const sheet    = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Foglio non trovato: ' + sheetName);
  const data     = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r.some(c => c !== ''));
}

/**
 * Aggiunge una riga al foglio specificato. Se il file per l'anno non esiste ancora,
 * lo crea automaticamente con la struttura corretta.
 * @param {string} sheetName - Nome del foglio (es. 'Spese_2025')
 * @param {Array} row - Valori della riga da aggiungere
 */
function appendRow_(sheetName, row) {
  const type     = sheetName.split('_')[0];
  const year     = sheetName.split('_')[1];
  const yearKey  = 'ID_' + type.toUpperCase();
  const props    = PropertiesService.getScriptProperties();
  const id       = props.getProperty(yearKey);

  if (!id) {
    Logger.log('Creo file per anno: ' + year);
    const rootIter = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
    if (!rootIter.hasNext()) throw new Error('Cartella Finanza non trovata');
    const root = rootIter.next();
    const yearFolder = getOrCreateFolder_(root, year);
    const ss = getOrCreateSpreadsheet_(yearFolder, sheetName);
    const columns = COLUMNS[type] || COLUMNS.Spese;
    setupSheet_(ss, sheetName, columns);
    props.setProperty(yearKey, ss.getId());
    const sheet = ss.getSheetByName(sheetName);
    sheet.appendRow(row);
    return;
  }

  const ss    = SpreadsheetApp.openById(id);
  let sheet   = ss.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log('Creo foglio: ' + sheetName);
    const rootIter = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
    const root = rootIter.next();
    const yearFolder = getOrCreateFolder_(root, year);
    const newSS = getOrCreateSpreadsheet_(yearFolder, sheetName);
    const columns = COLUMNS[type] || COLUMNS.Spese;
    setupSheet_(newSS, sheetName, columns);
    props.setProperty(yearKey, newSS.getId());
    sheet = newSS.getSheetByName(sheetName);
  }

  sheet.appendRow(row);
}

// ── Bulk import ──────────────────────────────────────────────

/**
 * Apre o crea il foglio per lo sheetName indicato (es. "Spese_2024")
 * cercando per nome su Drive invece di usare le properties, per non
 * sovrascrivere il puntatore all'anno corrente.
 * Se il foglio è vuoto aggiunge l'header, altrimenti appende soltanto.
 * @param {Folder} root - Cartella radice "Finanza" su Drive
 * @param {string} sheetName - Nome file e tab (es. "Spese_2024")
 * @param {string[]} columns - Array di colonne per l'header
 * @returns {Sheet}
 */
function getOrOpenImportSheet_(root, sheetName, columns) {
  const year = sheetName.split('_')[1];
  const yearFolder = getOrCreateFolder_(root, year);
  const ss = getOrCreateSpreadsheet_(yearFolder, sheetName);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    formatHeader_(sheet, columns.length);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Importa in bulk un array di spese raggruppandole per anno.
 * Non sovrascrive i dati esistenti — appende sempre in coda.
 * Ripristina ID_SPESE all'anno corrente dopo l'import.
 * @param {{ rows: Array<{data,importo,categoria,sottocategoria,nota}> }} body
 * @returns {{ ok: boolean, imported: number }}
 */
function bulkImportSpese_(body) {
  const rows = body.rows || [];
  if (!rows.length) return { ok: true, imported: 0 };

  const byYear = {};
  rows.forEach(r => {
    const year = String((r.data || '').slice(0, 4));
    if (!/^\d{4}$/.test(year)) return;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push([
      generateId_(),
      r.data || '',
      parseFloat(r.importo) || 0,
      r.categoria || '',
      r.sottocategoria || '',
      r.nota || '',
      '',
      '',
    ]);
  });

  const rootIter = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (!rootIter.hasNext()) throw new Error('Cartella Finanza non trovata');
  const root = rootIter.next();
  let total = 0;

  for (const year of Object.keys(byYear).sort()) {
    const sheet = getOrOpenImportSheet_(root, 'Spese_' + year, COLUMNS.Spese);
    const yearRows = byYear[year];
    sheet.getRange(sheet.getLastRow() + 1, 1, yearRows.length, yearRows[0].length).setValues(yearRows);
    total += yearRows.length;
  }

  // Ripristina ID_SPESE all'anno corrente
  const props = PropertiesService.getScriptProperties();
  const curFolder = getOrCreateFolder_(root, String(CONFIG.YEAR));
  const curSS = getOrCreateSpreadsheet_(curFolder, 'Spese_' + CONFIG.YEAR);
  props.setProperty('ID_SPESE', curSS.getId());

  return { ok: true, imported: total };
}

/**
 * Importa in bulk snapshot investimento (es. da CSV Moneyfarm) per anno.
 * Calcola rendimentoEur e rendimentoPct se non forniti.
 * @param {{ rows: Array<{data,valore,investito,rendimentoEur?,rendimentoPct?}>, piattaforma: string, conto: string, strumento?: string }} body
 * @returns {{ ok: boolean, imported: number }}
 */
function bulkImportInvestimenti_(body) {
  const rows = body.rows || [];
  const piattaforma = body.piattaforma || 'Moneyfarm';
  const conto       = body.conto       || '';
  const strumento   = body.strumento   || '';
  if (!rows.length) return { ok: true, imported: 0 };

  const byYear = {};
  rows.forEach(r => {
    const year = String((r.data || '').slice(0, 4));
    if (!/^\d{4}$/.test(year)) return;
    if (!byYear[year]) byYear[year] = [];
    const valore    = parseFloat(r.valore)    || 0;
    const investito = parseFloat(r.investito) || 0;
    const rendEur   = r.rendimentoEur != null ? parseFloat(r.rendimentoEur) : parseFloat((valore - investito).toFixed(2));
    const rendPct   = r.rendimentoPct != null ? parseFloat(r.rendimentoPct) : (investito > 0 ? parseFloat(((valore - investito) / investito * 100).toFixed(2)) : 0);
    byYear[year].push([r.data || '', piattaforma, conto, strumento, valore, investito, rendEur, rendPct]);
  });

  const rootIter = DriveApp.getFoldersByName(CONFIG.ROOT_FOLDER_NAME);
  if (!rootIter.hasNext()) throw new Error('Cartella Finanza non trovata');
  const root = rootIter.next();
  let total = 0;

  for (const year of Object.keys(byYear).sort()) {
    const sheet = getOrOpenImportSheet_(root, 'Investimenti_' + year, COLUMNS.Investimenti);
    const yearRows = byYear[year];
    sheet.getRange(sheet.getLastRow() + 1, 1, yearRows.length, yearRows[0].length).setValues(yearRows);
    total += yearRows.length;
  }

  const props = PropertiesService.getScriptProperties();
  const curFolder = getOrCreateFolder_(root, String(CONFIG.YEAR));
  const curSS = getOrCreateSpreadsheet_(curFolder, 'Investimenti_' + CONFIG.YEAR);
  props.setProperty('ID_INVESTIMENTI', curSS.getId());

  return { ok: true, imported: total };
}

// ── Response helper ──────────────────────────────────────────

/**
 * Serializza un oggetto JS in una risposta HTTP JSON per Apps Script.
 * @param {Object} data
 * @returns {TextOutput}
 */
function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
