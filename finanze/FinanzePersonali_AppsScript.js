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
function setupCompleto() {
  Logger.log('⏳ Avvio setup struttura Finanza...');

  // 1. Crea/trova cartella root
  const rootFolder = getOrCreateFolder_(DriveApp.getRootFolder(), CONFIG.ROOT_FOLDER_NAME);
  Logger.log('✅ Cartella Finanza: ' + rootFolder.getUrl());

  // 2. Crea file master (Categorie, Conti) nella root
  const catSS   = getOrCreateSpreadsheet_(rootFolder, 'Categorie');
  const contiSS  = getOrCreateSpreadsheet_(rootFolder, 'Conti');
  setupCategorie_(catSS);
  setupConti_(contiSS);
  Logger.log('✅ File master creati');

  // 3. Crea cartella anno
  const yearFolder = getOrCreateFolder_(rootFolder, String(CONFIG.YEAR));

  // 4. Crea file annuali
  const speseSS  = getOrCreateSpreadsheet_(yearFolder, 'Spese_' + CONFIG.YEAR);
  const entrSS   = getOrCreateSpreadsheet_(yearFolder, 'Entrate_' + CONFIG.YEAR);
  const invSS    = getOrCreateSpreadsheet_(yearFolder, 'Investimenti_' + CONFIG.YEAR);
  const budgSS   = getOrCreateSpreadsheet_(yearFolder, 'Budget_' + CONFIG.YEAR);

  setupSheet_(speseSS,  'Spese_' + CONFIG.YEAR,        COLUMNS.Spese);
  setupSheet_(entrSS,   'Entrate_' + CONFIG.YEAR,       COLUMNS.Entrate);
  setupSheet_(invSS,    'Investimenti_' + CONFIG.YEAR,  COLUMNS.Investimenti);
  setupBudget_(budgSS);
  Logger.log('✅ File annuali ' + CONFIG.YEAR + ' creati');

  // 5. Salva gli ID nei PropertiesService per uso futuro dello script
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

// ── Utility: cartelle e spreadsheet ─────────────────────────
function getOrCreateFolder_(parent, name) {
  const iter = parent.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : parent.createFolder(name);
}

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

function setupSheet_(ss, sheetName, columns) {
  const sheet = ss.getSheets()[0];
  sheet.setName(sheetName);
  sheet.clearContents();

  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
  formatHeader_(sheet, columns.length);
  sheet.setFrozenRows(1);
  autoResizeAll_(sheet, columns.length);
}

function setupBudget_(ss) {
  const sheet = ss.getSheets()[0];
  sheet.setName('Budget_' + CONFIG.YEAR);
  sheet.clearContents();

  const header = COLUMNS.Budget;
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  formatHeader_(sheet, header.length);

  // Pre-popola con le categorie esistenti
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
function formatHeader_(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#2C2C2A');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
}

function autoResizeAll_(sheet, numCols) {
  for (let i = 1; i <= numCols; i++) sheet.autoResizeColumn(i);
}

// ── ID generatore ────────────────────────────────────────────
function generateId_() {
  return Utilities.getUuid().split('-')[0];
}

// ── doGet: lettura dati per la dashboard ─────────────────────
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
      default:
        result = { error: 'Azione non riconosciuta: ' + action };
    }
    return jsonResponse_(result);
  } catch(err) {
    return jsonResponse_({ error: err.message });
  }
}

// ── doPost: scrittura dati ───────────────────────────────────
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
      case 'deleteRow':       result = deleteRow_(body);       break;
      case 'updateRow':       result = updateRow_(body);       break;
      default:
        result = { error: 'Azione non riconosciuta: ' + action };
    }
    return jsonResponse_(result);
  } catch(err) {
    return jsonResponse_({ error: err.message });
  }
}

// ── Letture ──────────────────────────────────────────────────
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

function getBudget_(params) {
  const year = params.year || CONFIG.YEAR;
  const data = readSheetByName_('Budget_' + year);
  const rows = data.map(r => ({
    categoria: r[0], sottocategoria: r[1],
    mensili: r.slice(2).map(v => parseFloat(v) || 0)
  }));
  return { ok: true, data: rows };
}

function getSummary_(params) {
  const year  = params.year  || CONFIG.YEAR;
  const month = params.month || (new Date().getMonth() + 1);

  const spese    = getSpese_({ year, month }).data;
  const entrate  = getEntrate_({ year, month }).data;
  const investim = getInvestimenti_({ year }).data;

  const totSpese   = spese.reduce((s, r) => s + r.importo, 0);
  const totEntrate = entrate.reduce((s, r) => s + r.importo, 0);

  // Ultimo snapshot investimenti per piattaforma
  const invByPiattaforma = {};
  investim.forEach(r => {
    if (!invByPiattaforma[r.piattaforma] ||
        new Date(r.data) > new Date(invByPiattaforma[r.piattaforma].data)) {
      invByPiattaforma[r.piattaforma] = r;
    }
  });
  const totInvestimenti = Object.values(invByPiattaforma)
    .reduce((s, r) => s + r.valore, 0);

  // Spese per categoria
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

// ── Scritture ────────────────────────────────────────────────
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

function addCategoria_(body) {
  const props = PropertiesService.getScriptProperties();
  const ss    = SpreadsheetApp.openById(props.getProperty('ID_CATEGORIE'));
  const sheet = ss.getSheets()[0];
  sheet.appendRow([
    body.categoria, body.sottocategoria || '',
    body.colore || '#888780', body.icona || 'dots', 'TRUE'
  ]);

  // Aggiunge anche al Budget corrente
  try {
    const budgSS    = SpreadsheetApp.openById(props.getProperty('ID_BUDGET'));
    const budgSheet = budgSS.getSheets()[0];
    budgSheet.appendRow([body.categoria, body.sottocategoria || '', 0,0,0,0,0,0,0,0,0,0,0,0]);
  } catch(e) {}

  return { ok: true };
}

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

function updateBudget_(body) {
  const year  = body.year || CONFIG.YEAR;
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

function updateRow_(body) {
  // body: { sheetKey, year, id, fields[] }
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
      // Aggiorna le colonne a partire dalla 2 (indice 1), mantenendo l'ID in colonna 1
      sheet.getRange(i + 1, 2, 1, body.fields.length).setValues([body.fields]);
      return { ok: true };
    }
  }
  return { error: 'Riga non trovata' };
}

function deleteRow_(body) {
  // body: { sheetKey, year, id }
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

function updateSaldoConto_(nomeConto, delta) {
  if (!nomeConto || delta == null || isNaN(delta)) return;
  const props = PropertiesService.getScriptProperties();
  const id    = props.getProperty('ID_CONTI');
  if (!id) return;
  const ss    = SpreadsheetApp.openById(id);
  const sheet = ss.getSheets()[0];
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === nomeConto) {                        // colonna Nome = indice 1
      const current = parseFloat(data[i][8]) || 0;         // colonna Saldo = indice 8
      sheet.getRange(i + 1, 9).setValue(current + delta);  // colonna 9 = Saldo
      return;
    }
  }
}

// ── Helpers lettura ──────────────────────────────────────────
function readSheet_(propKey) {
  const props = PropertiesService.getScriptProperties();
  const id    = props.getProperty(propKey);
  if (!id) throw new Error('ID non trovato per: ' + propKey);
  const ss    = SpreadsheetApp.openById(id);
  const sheet = ss.getSheets()[0];
  const data  = sheet.getDataRange().getValues();
  return data.slice(1).filter(r => r.some(c => c !== ''));
}

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

function appendRow_(sheetName, row) {
  const type     = sheetName.split('_')[0];   // es. "Spese"
  const year     = sheetName.split('_')[1];   // es. "2026"
  const yearKey  = 'ID_' + type.toUpperCase();
  const props    = PropertiesService.getScriptProperties();
  const id       = props.getProperty(yearKey);

  if (!id) {
    // Il file per questo anno non esiste ancora — crealo
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

  // Il file esiste ma il foglio per questo anno potrebbe mancare
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

// ── Response helper ──────────────────────────────────────────
function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
