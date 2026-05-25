# Finanze Personali — Task List per Claude Code

Leggi prima `CONTEXT.md` per capire l'architettura completa.
Tutti i task riguardano `index.html` (frontend) e/o `FinanzePersonali_AppsScript.js` (backend).

---

## PRIORITÀ ALTA

### ~~TASK — Tab Spese: formato numeri `##,##`~~ ✅ COMPLETATO
**Fix applicati:**
- `fmtDec()` (già esistente, `it-IT` locale, 2 decimali) applicata sistematicamente in tutta la tab Spese
- Sostituiti tutti i `.toFixed(2)` con `fmtDec()`: renderAccordion (totale cat + subcat), renderSubcatFlat, renderTxList
- Metriche `#spese-metrics` (totale e media): da `fmt()` (0 decimali) a `fmtDec()` (2 decimali)
- Totale mobile `#mobile-tot`: da `fmt()` a `fmtDec()`
- Per coerenza: lista entrate in renderEntrate aggiornata allo stesso modo
- Risultato: tutti gli importi mostrano separatore migliaia (punto) e 2 decimali con virgola — es. `1.234,56 €`

---

### ~~TASK — Modalità privata (toggle oscura i numeri)~~ ✅ COMPLETATO
**Fix applicati:**
- Bottone occhio nella status-pill dell'header (icona `ti-eye` / `ti-eye-off` da Tabler Icons)
- `togglePrivate()`: alterna `body.private-mode`, aggiorna icona, salva in `localStorage`
- CSS `body.private-mode`: `filter: blur(6px)` su `.metric .value`, `.metric .delta`, `.row .amt`, `#mobile-tot`, `.prv`
- CSS `body.private-mode`: `filter: blur(8px)` su `#patrimonioChart`, `#trendAnnoChart`, `#invChart`, `#cat-accordion`, `#subcat-flat`, `#tx-list`
- Aggiunta classe `prv` agli span inline di `renderContoRow` (saldi conti/investimenti) e al div rendimento in lista investimenti
- Stato ripristinato da `localStorage` al `DOMContentLoaded`

---

## PRIORITÀ ALTA

### ~~TASK — Tab Spese: separare Investimenti da Spese, aggiungere riquadro Uscite~~ ✅ COMPLETATO
**Fix applicati:**
- Costante `INV_CAT = 'Investimenti'` — filtra le spese della categoria investimenti
- `renderSpeseMetrics()` riscritta: 4 metriche — **Uscite** (accent giallo, tot reg+inv), **Spese** (solo regolari), **Investimenti** (solo categoria), **Media spesa** (media su sole spese regolari)
- Mobile `#mobile-count` aggiornato: conta solo le spese regolari (esclusi investimenti)
- Nessuna chiamata API aggiuntiva: tutto calcolato su `currentSpese` già in memoria

---

### ~~TASK — Tab Spese: grafico Distribuzione full-width con percentuali, rimuovere Trend mensile~~ ✅ COMPLETATO
**Fix applicati:**
- Rimossa card "Trend mensile" (`#trendChart` non aveva nemmeno una funzione di render)
- Card "Distribuzione spese" portata a full-width (rimosso `two-col` e `mobile-hide`)
- Layout `.distribuzione-wrap`: flex row — donut 180×180px fisso a sinistra, legenda a destra
- `renderSpesaChart()` aggiornata: popola `#spesa-legend` con righe categoria (dot, nome, %, importo), ordinato per importo desc
- Importi legenda con classe `prv` per private mode
- Mobile: flex column, donut centrato 160×160px, legenda sotto

---

## VALUTAZIONI / ANALISI

### TASK — Valutazione scalabilità Google Sheets
Valutare la scalabilità dell'approccio attuale che usa un foglio Google Sheets per anno.

**Domande da rispondere:**
- Quante chiamate API servono per visualizzare dati multi-anno (es. grafico trend 3 anni)?
- Esiste un foglio "aggregato" che raccoglie i dati di tutti gli anni in un'unica vista?
- È fattibile creare uno sheet `Riepilogo` che venga aggiornato automaticamente con i totali
  mensili di ogni anno (tramite `IMPORTRANGE` o tramite Apps Script)?
- Limiti delle API di Google Apps Script: quota giornaliera, timeout, dimensioni payload
- Raccomandazione finale: continuare con l'approccio attuale, aggiungere aggregazione, o migrare?

**Output atteso:** sezione di analisi con pro/contro e raccomandazione concreta.

---

### TASK — Valutazione fattibilità riscrittura in Flutter
Valutare se vale la pena riscrivere questa app in Flutter per avere una app nativa multi-piattaforma.

**Domande da rispondere:**
- Pro: UX nativa, offline, installazione vera su iOS/Android, performance
- Contro: complessità setup, distribuzione App Store/Play Store, mantenimento doppio codebase,
  CORS e autenticazione Google Sheets da Flutter
- L'attuale backend Apps Script è riutilizzabile? O serve un backend diverso?
- Alternative: PWA potenziata (già parzialmente implementata), Capacitor/Ionic, React Native
- Stima effort: quanto tempo richiederebbe la riscrittura?
- Raccomandazione finale: quando ha senso farlo (mai, ora, dopo N anni di dati, ecc.)

**Output atteso:** sezione di analisi con pro/contro e raccomandazione concreta.

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
2. Per ogni task: modificare `index.html`, testare su GitHub Pages, verificare console errors
3. Per i task che richiedono modifiche Apps Script: aggiornare `FinanzePersonali_AppsScript.js`,
   incollare in script.google.com, ridistribuire (**Distribuisci → Gestisci distribuzioni → nuova versione**)
