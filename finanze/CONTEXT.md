# Finanze Personali — Contesto Progetto

## Panoramica
Dashboard personale per il tracciamento di spese, entrate, investimenti e budget.
Sviluppata in una singola sessione con Claude, ora da completare con Claude Code.

---

## Stack tecnico

| Componente | Tecnologia |
|---|---|
| Frontend | HTML + CSS + Vanilla JS (single file) |
| Backend / Database | Google Apps Script + Google Sheets |
| Hosting | GitHub Pages (`a-pucci.it/finanze/`) |
| Protezione accesso | Cloudflare Worker (HTTP Basic Auth) |
| Grafici | Chart.js 4.4.1 + chartjs-adapter-date-fns |
| Icone | Tabler Icons (webfont CDN) |
| Font | DM Sans + DM Mono (Google Fonts) |

---

## File principali

- `index.html` — tutta l'app (HTML + CSS + JS in un file solo)
- `FinanzePersonali_AppsScript.js` — backend Google Apps Script

---

## Struttura Google Drive

```
Finanza/
├── Categorie.xlsx         ← fonte di verità categorie/sottocategorie
├── Conti.xlsx             ← conti correnti e piattaforme investimento
└── 2026/
    ├── Spese_2026.xlsx
    ├── Entrate_2026.xlsx
    ├── Investimenti_2026.xlsx
    └── Budget_2026.xlsx
```

### Schema colonne Sheets

**Categorie:** `Categoria | Sottocategoria | Colore (hex) | Icona | Attiva (TRUE/FALSE)`

**Conti:** `ID | Nome | Tipo | Piattaforma | IBAN_o_Numero | Valuta | Note | Attivo`

**Spese:** `ID | Data | Importo | Categoria | Sottocategoria | Nota | Conto | Metodo_Pagamento`

**Entrate:** `ID | Data | Importo | Tipo | Nota | Conto`

**Investimenti:** `Data_Snapshot | Piattaforma | Conto | Strumento | Valore_Attuale | Investito | Rendimento_EUR | Rendimento_PCT`

**Budget:** `Categoria | Sottocategoria | Gen | Feb | Mar | Apr | Mag | Giu | Lug | Ago | Set | Ott | Nov | Dic`

---

## Google Apps Script

**URL endpoint:**
```
https://script.google.com/macros/s/AKfycbyDVKON1C98Z5rnIgKVeYRR5w47gQnW8CoorxfXYMwmNedPcG72SCLGpqgfatS7nIo1/exec
```

### Azioni GET disponibili
- `?action=getCategorie` → `{ ok, data: { NomeCategoria: { color, icon, subs: [] } } }`
- `?action=getConti` → `{ ok, data: [{ id, nome, tipo, piattaforma, valuta, note }] }`
- `?action=getSpese&year=2026&month=5` → `{ ok, data: [{ id, data, importo, categoria, sottocategoria, nota, conto, metodo }] }`
- `?action=getEntrate&year=2026&month=5` → `{ ok, data: [{ id, data, importo, tipo, nota, conto }] }`
- `?action=getInvestimenti&year=2026` → `{ ok, data: [{ data, piattaforma, conto, strumento, valore, investito, rendimentoEur, rendimentoPct }] }`
- `?action=getBudget&year=2026` → `{ ok, data: [{ categoria, sottocategoria, mensili: [12 valori] }] }`
- `?action=getSummary&year=2026&month=5` → summary aggregato

### Azioni POST disponibili
Body JSON con campo `action`:
- `addSpesa` → `{ action, importo, categoria, sottocategoria, nota, data, year, conto, metodo }`
- `addEntrata` → `{ action, importo, tipo, conto, nota, data, year }`
- `addInvestimento` → `{ action, piattaforma, strumento, valore, investito, rendimentoEur, rendimentoPct, data, year }`
- `addCategoria` → `{ action, categoria, sottocategoria, colore, icona }`
- `addConto` → `{ action, nome, tipo, piattaforma, iban, valuta, note }`
- `updateBudget` → `{ action, year, righe: [{ categoria, sottocategoria, mensili: [12 valori] }] }`
- `deleteRow` → `{ action, sheetKey, year, id }`
- `updateRow` → `{ action, sheetKey, year, id, fields: {...} }`
- `bulkImportSpese` → `{ action, rows: [{ data, importo, categoria, sottocategoria, nota }] }` — inserisce batch per anno, non sovrascrive dati esistenti
- `bulkImportInvestimenti` → `{ action, rows: [{ data, valore, investito, rendimentoEur?, rendimentoPct? }], piattaforma, conto, strumento? }` — inserisce batch per anno, calcola rendimento se non fornito

### Note importanti sullo script
- Gli ID dei file Sheets sono salvati in `PropertiesService.getScriptProperties()`
- `appendRow_()` crea automaticamente il foglio dell'anno se non esiste
- Se il setup iniziale fallisce, eseguire `diagnostica()` per verificare le properties

---

## Frontend — struttura JS principale

### Stato globale
```javascript
const API_URL = 'https://script.google.com/macros/s/.../exec';
let CATS = {};           // categorie da Sheets { NomeCat: { color, icon, subs: [] } }
let CONTI = [];          // conti da Sheets
let currentSpese = [];   // spese del mese corrente
let currentMonth = ...;  // mese corrente (1-12)
let currentYear = ...;   // anno corrente
let budgetData = [];     // dati budget anno corrente
let budgetMonth = ...;
let selectedPiatt = '';  // piattaforma selezionata nel form investimenti
```

### Funzioni principali
- `reloadAll()` — carica categorie, conti, spese, investimenti
- `loadCategorie()` / `loadConti()` / `loadSpese()` / `loadEntrate()` / `loadInvestimenti()`
- `renderBudgetTab()` — carica e renderizza budget (chiamata anche da loadSpese)
- `renderPanoramica(totInv)` — aggiorna tab panoramica
- `renderAccordion()` — vista spese per categoria con accordion sottocategorie
- `renderSubcatFlat()` — vista spese per sottocategoria
- `renderTxList()` — lista movimenti
- `renderSpesaChart()` — donut chart spese
- `renderInvChart(data)` — line chart investimenti per piattaforma, punti aggregati per settimana
- `renderPatrimonioChart(data)` — line chart andamento patrimonio totale (tab Panoramica), punti aggregati per settimana
- `renderTrendAnnoChart()` — line chart entrate vs spese mensili (tab Panoramica)
- `renderDonutChart()` — donut allocazione piattaforme (tab Panoramica)
- `buildPiattButtons()` — bottoni selezione piattaforma nel form snapshot
- `addSpesa()` / `addEntrata()` / `addInvestimento()` / `saveBudget()`
- `addCategoria()` / `addConto()`
- `openEditMovimento()` / `saveEditMovimento()` — modal modifica spese/entrate
- `deleteMovimento()` — elimina riga con conferma
- `applyFilters()` — aggiorna tutte le viste spese con filtri attivi (testo, categoria, min/max importo)
- `weekStartISO(dateStr)` / `groupByWeek(points)` — helper aggregazione settimanale per grafici investimenti
- `loadSpeseCsv()` / `importSpeseCsv()` — importer CSV spese (tab Impostazioni)
- `loadMfCsv()` / `importMfCsv()` — importer CSV Moneyfarm Risparmi (tab Impostazioni)

### Tab presenti (nav)
1. **Panoramica** — metriche aggregate (patrimonio, investimenti, saldo conti, spese mese, risparmio), donut allocazione piattaforme, grafico andamento patrimonio (settimanale), grafico trend mensile entrate/spese, lista conti
2. **Spese** — quick add + filtri (testo, categoria, min/max) + accordion/flat/lista + grafico donut; filtri persistenti al cambio mese
3. **Investimenti** — snapshot rapido per piattaforma + grafico andamento per piattaforma (settimanale)
4. **Budget** — budget vs reale per mese + form modifica budget
5. **Entrate** — form aggiunta entrata + lista movimenti
6. **Impostazioni** — aggiungi categoria/sottocategoria/conto, URL script, importa Moneyfarm Risparmi da CSV

### CSS Variables (tema dark)
```css
--bg: #0f0f0f
--surface: #181818
--surface2: #222222
--border: rgba(255,255,255,0.08)
--border2: rgba(255,255,255,0.14)
--text: #f0ede8
--muted: #888680
--hint: #504e4b
--accent: #c9f542        ← verde lime, colore primario azioni
--red: #ff6b6b
--green: #6bcb8b
--blue: #6ba8ff
--amber: #ffb347
```

### Helper functions
```javascript
fmt(n)         // formatta numero come stringa italiana (es. 1.234)
showMsg(id, txt)  // mostra messaggio ok/err per 4 secondi
apiGet(params) // fetch GET verso Apps Script
apiPost(body)  // fetch POST verso Apps Script
```

---

## Infrastruttura hosting

### GitHub Pages
- Repo: `a-pucci.github.io` (o repo del sito a-pucci.it)
- File: `finanze/index.html`
- URL: `a-pucci.it/finanze/`

### Cloudflare
- Dominio `a-pucci.it` gestito da Cloudflare (nameserver: lars + tess)
- Worker `finanze-auth`: HTTP Basic Auth su route `a-pucci.it/finanze*`
- Username: `ale`
- Password: definita nel Worker (non nel codice frontend)

### Sicurezza
- Il PIN era stato considerato ma rimosso — falsa sicurezza lato client
- La protezione reale è il Cloudflare Worker (server-side)
- L'URL Apps Script è pubblico ma non indicizzato

---

## Piattaforme investimento dell'utente
- **Trade Republic** — ETF (MSCI World, S&P 500), bond, azioni singole (snapshot manuali)
- **Moneyfarm** — portafoglio Risparmi (PAC mensile €500) + portafoglio Pensione (manuale)

## Conti correnti dell'utente
- Intesa Sanpaolo
- N26

## File accessori (non nel repo)
- `finanze/spese_import.csv` — 2249 righe generate da `Money Manager backup.xlsx` (2023-02-01 → 2026-05-24), pronte per l'import bulk tramite `bulkImportSpese`
- `finanze/convert_backup.js` — script Node.js che ha generato il CSV dal backup; richiede `node_modules/xlsx`

## Note sulle categorie
Le categorie nel Sheets `Finanza/Categorie` differiscono dai `DEFAULT_CATEGORIES` dello script (che sono i default di setup). Le categorie reali dell'utente sono:
Auto (Carburante/Parcheggio/Manutenzione/Assicurazione/Bollo/Pedaggio), Casa (Bollette/Internet/Spesa/Telefono), Cibo (Generale/Pausa pranzo), Salute (Farmacia/Visite mediche), Svago (Cinema & teatro/Giochi/Sport/Viaggi/Libri & media/Concerti), Shopping (Abbigliamento/Elettronica/Regali/Casa & giardino/Cura corpo), Abbonamenti (Netflix/Spotify/Crunchyroll/Amazon Prime/Software), Trasporti (Mezzi pubblici/Treno), Investimenti (Risparmi/Pensione), Altro (Istruzione/Banca & comm./Tasse/Regali/Non categ.)

## Problemi noti / Fix applicati
- `getUi()` rimosso da `setupCompleto()` — non disponibile fuori da Sheets
- `buildCatSelects()` non deve cercare `#inv-piatt` (elemento rimosso, sostituito da pulsanti)
- Varie funzioni JS andate perse durante refactoring iterativo — reinserite manualmente
- `appendRow_()` aggiornato per creare automaticamente foglio anno se mancante
- Elementi DOM cercati con `getElementById` prima che la tab fosse visibile → aggiunto `if (el)` guard ovunque
- `bulkImportSpese_` / `bulkImportInvestimenti_` usano `getOrOpenImportSheet_` (ricerca per nome su Drive) invece di `appendRow_` per evitare sovrascrittura del puntatore `ID_SPESE`/`ID_INVESTIMENTI` — ripristinano la property all'anno corrente dopo l'import
- Il file HTML è un single-file app, tutto inline (no moduli, no bundler)
