# Design: Grafico andamento mensile spese/entrate (TASK 7)

**Data:** 2026-05-24
**Scope:** Tab Panoramica — nuovo grafico a linee spese vs entrate per l'anno corrente

---

## Obiettivo

Aggiungere un grafico a linee nella tab Panoramica che mostri l'andamento mensile di spese ed entrate per i 12 mesi dell'anno corrente, con una singola chiamata API al backend Apps Script.

---

## API — Apps Script

### Nuovo endpoint `getSummaryAnno`

Aggiunto come case in `doGet`:

```
GET ?action=getSummaryAnno&year=2026
```

**Implementazione `getSummaryAnno_(params)`:**
1. Legge `Spese_{year}` con `readSheetByName_`
2. Legge `Entrate_{year}` con `readSheetByName_`
3. Raggruppa per mese (1–12), somma gli importi
4. Ritorna array di 12 valori per spese e 12 per entrate (indice 0 = Gennaio)

**Response:**
```json
{
  "ok": true,
  "data": {
    "spese":   [120.5, 340.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "entrate": [2000.0, 2000.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
}
```

---

## Frontend — index.html

### Caricamento dati

`loadSummaryAnno()` aggiunta al primo `Promise.all` in `reloadAll()`:

```js
await Promise.all([loadCategorie(), loadConti(), loadSummaryAnno()]);
```

Variabile globale: `let summaryAnno = null;`

### UI — nuovo card in Panoramica

Posizione: sotto il card "Andamento investimenti", full-width.

```html
<div class="card">
  <div class="card-title">Spese vs Entrate — anno corrente</div>
  <div style="position:relative;height:180px">
    <canvas id="trendAnnoChart" role="img" aria-label="Andamento spese ed entrate">Caricamento</canvas>
  </div>
</div>
```

### Grafico `renderTrendAnnoChart()`

- Tipo: `line`
- Dataset 1 — **Entrate**: colore `var(--green)`, fill leggero sotto la curva
- Dataset 2 — **Spese**: colore `var(--red)`, fill leggero sotto la curva
- Linee smooth (`tension: 0.3`)
- Etichette asse X: `['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']`
- Istanza Chart salvata in `trendAnnoInst` (destroy prima di ricreare)

### Error handling

- Se `getSummaryAnno` fallisce: `summaryAnno = null`, il canvas mostra testo "Dati non disponibili"
- Il fallimento non blocca il resto della Panoramica
- Mesi senza transazioni: valore 0 (nessun dato inventato)

---

## Cosa NON è in scope

- Selezione anno diverso dall'anno corrente
- Confronto con anno precedente
- Grafico a barre (scelta utente: linee)

---

## File modificati

| File | Modifica |
|------|----------|
| `finanze/FinanzePersonali_AppsScript.js` | Aggiunta `getSummaryAnno_()` + case in `doGet` |
| `finanze/index.html` | Nuovo card HTML, `loadSummaryAnno()`, `renderTrendAnnoChart()`, aggiornamento `reloadAll()` |
