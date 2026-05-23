# Finanze Personali — Task List per Claude Code

Leggi prima `CONTEXT.md` per capire l'architettura completa.
Tutti i task riguardano `index.html` (frontend) e/o `FinanzePersonali_AppsScript.js` (backend).

---

## PRIORITÀ ALTA

### ~~TASK 1 — Stabilità JS: audit completo funzioni mancanti~~ ✅ COMPLETATO
**Fix applicati:**
- Tutte le funzioni verificate — nessuna mancante
- Null guard aggiunti: `setStatus`, `renderAccordion`, `renderSubcatFlat`, `renderTxList`, `loadInvestimenti` (inv-list), `addSpesa`/`addInvestimento`/`addEntrata` (btn)
- `loadEntrate()` aggiunta in `reloadAll()` — era mai chiamata al caricamento
- `api-url-display` popolato in `DOMContentLoaded`
- HTML mobile-summary aggiunto in tab Spese (`mobile-tot`, `mobile-count`, `mobile-month-label2`)
- Dead code rimosso: forEach no-op in `buildCatSelects`
- Init date deduplicato; indentazione blocco mobile corretta
- Preview verificata su localhost:8080

---

### TASK 2 — Tab Panoramica: patrimonio totale reale ✅ COMPLETATO
**Fix applicati:**

**Apps Script (`FinanzePersonali_AppsScript.js`):**
- Colonna `Saldo` aggiunta al foglio Conti (COLUMNS, DEFAULT_ACCOUNTS, getConti_, addConto_)
- Funzione `updateSaldoConto_` aggiunta, chiamata da addSpesa_ e addEntrata_ per aggiornare il saldo automaticamente

**Frontend (`index.html`):**
- `currentEntrate` resa variabile globale
- Campo `q-conto` (opzionale) aggiunto al form spese; `addSpesa` lo passa all'API
- `renderPanoramica`: riscritta con 5 metriche (patrimonio totale, investimenti, saldo conti, spese mese, risparmio mese)
- Aggiunta `renderDonutChart` per allocazione piattaforme su `#donutChart`
- `renderContiList`: saldo colorato per conti correnti, badge `inv` per investimenti
- Aggiunta `renderPatrimonioChart` per andamento patrimonio su `#patrimonioChart` (canvas nuovo)

---

### TASK 3 — Import CSV Trade Republic e Moneyfarm
**Cosa fare:**
- Aggiungere sezione "Importa" nella tab Impostazioni (o tab separata)
- **Trade Republic:** parsing CSV con colonne tipiche TR (Data, Tipo, Strumento, Quantità, Prezzo, Importo, Valuta)
  - Mappare automaticamente le transazioni in spese/investimenti
  - Mostrare preview tabellare prima di salvare
  - Bottone "Salva tutto su Sheets"
- **Moneyfarm:** parsing CSV/Excel rendiconto Moneyfarm
  - Estrarre valore portafoglio per data → salvare come snapshot investimenti
  - Mostrare preview prima di salvare
- Gestire encoding UTF-8 e separatori (virgola, punto e virgola)
- Usare `FileReader` API per leggere i file lato client

---

### TASK 4 — Eliminazione movimenti
**Problema:** non c'è modo di cancellare una spesa o entrata inserita per errore.
**Cosa fare:**
- Nella vista Lista (tab Spese) aggiungere bottone elimina su ogni riga
- Conferma prima di eliminare ("Sei sicuro?")
- Chiamare `deleteRow` via POST verso Apps Script
- Fare lo stesso per la lista Entrate
- Lo script ha già `deleteRow_()` implementato

---

## PRIORITÀ MEDIA

### TASK 5 — Modifica movimenti
**Cosa fare:**
- Permettere la modifica di una spesa già inserita (tap sulla riga → form precompilato)
- Aggiungere azione POST `updateRow` in Apps Script
- La riga viene trovata per ID e aggiornata con i nuovi valori

---

### TASK 6 — Budget: sincronizzazione automatica con nuove categorie
**Problema:** quando si aggiunge una nuova categoria da Impostazioni, non viene aggiunta automaticamente al foglio Budget.
**Lo script ha già questa logica in `addCategoria_()` ma va verificata:**
- Testare che aggiungendo una categoria da UI appaia nel form Budget
- Se manca, aggiungere la riga al Budget con valori 0 per tutti i mesi

---

### TASK 7 — Panoramica: grafico andamento mensile spese/entrate
**Cosa fare:**
- Grafico a barre o linee: ultimi 6 mesi, spese vs entrate
- Richiede chiamate multiple a `getSpese` e `getEntrate` per mesi diversi
- Oppure implementare `getSummaryAnno` in Apps Script che restituisce tutti i mesi in una chiamata sola

---

### TASK 8 — Mobile UX miglioramenti
**Cosa fare:**
- Dopo il salvataggio di una spesa, mostrare un feedback visivo più evidente (es. animazione ✓)
- Input importo: su mobile il tastierino numerico deve aprirsi automaticamente (`autofocus` + `inputmode="decimal"`)
- Swipe tra tab (opzionale, se fattibile senza librerie)
- PWA: aggiungere `manifest.json` e `<meta>` tags per installazione come app su home screen iOS/Android

---

## PRIORITÀ BASSA

### TASK 9 — Esportazione dati
**Cosa fare:**
- Bottone "Esporta mese corrente in CSV" nella tab Spese
- Genera CSV lato client da `currentSpese` e lo scarica
- Non richiede modifiche a Apps Script

---

### TASK 10 — Ricerca e filtri spese
**Cosa fare:**
- Campo di ricerca nella vista Lista (filtra per nota/categoria/sottocategoria)
- Filtro per categoria (dropdown)
- Filtro per range di importo
- Tutto lato client su `currentSpese` — no chiamate aggiuntive a Sheets

---

### TASK 11 — Note e documentazione Apps Script
**Cosa fare:**
- Aggiungere JSDoc a tutte le funzioni dello script
- Aggiungere funzione `nuovoAnno(year)` che crea la struttura per un nuovo anno
  duplicando il Budget dell'anno precedente e azzerando Spese/Entrate/Investimenti

---

## Note per Claude Code

### Come testare localmente
Il file HTML può essere aperto direttamente nel browser (`file://`) ma le chiamate
all'API Apps Script falliranno per CORS. Per testare:
1. Usare un server locale (`python3 -m http.server 8080`) — ma CORS blocca ugualmente
2. Testare direttamente su GitHub Pages dopo il push
3. Oppure mockare le risposte API con dati statici durante lo sviluppo

### Stile di sviluppo
- **No framework, no bundler** — vanilla JS puro, tutto in un file
- **No npm, no node** — il file viene servito staticamente
- Mantenere il tema dark con le CSS variables definite in `:root`
- I grafici usano Chart.js — non aggiungere altre librerie di charting
- Ogni `getElementById` deve avere null guard: `const el = document.getElementById('x'); if (!el) return;`
- Le chiamate API verso Apps Script sono fetch standard — non serve proxy

### Workflow consigliato
1. Leggere `CONTEXT.md` integralmente
2. Fare l'audit del TASK 1 prima di tutto il resto
3. Per ogni task: modificare `index.html`, testare su GitHub Pages, verificare console errors
4. Per i task che richiedono modifiche Apps Script: aggiornare `FinanzePersonali_AppsScript.js`,
   incollare in script.google.com, ridistribuire (**Distribuisci → Gestisci distribuzioni → nuova versione**)
