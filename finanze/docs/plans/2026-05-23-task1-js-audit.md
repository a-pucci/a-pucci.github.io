# Task 1 — Stabilità JS: Audit e Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere tutti i bug di stabilità JS nel file `index.html`: aggiungere la funzione `addSpesa()` mancante e blindare tutti gli accessi DOM senza null guard.

**Architecture:** Single-file app (HTML + CSS + JS inline). Nessun framework, nessun bundler. Tutte le modifiche sono nel `<script>` in fondo a `index.html`. Nessuna modifica al backend Apps Script necessaria per questo task.

**Tech Stack:** Vanilla JS, HTML, Google Apps Script (non toccato in questo task)

---

## Problemi identificati

| Priorità | Problema | Dove |
|----------|---------|------|
| 🔴 CRITICO | `addSpesa()` mancante — il form spese non funziona | onclick HTML |
| 🟡 ALTO | `document.getElementById('inv-data')` senza null guard | riga ~628 |
| 🟡 ALTO | `renderContiList()` accede a `el.innerHTML` senza guard | funzione |
| 🟡 ALTO | `updateMonthLabel()` accede a `.textContent` senza guard | funzione |
| 🟡 MEDIO | `showMsg()` accede a `el` senza null guard | funzione |
| 🟡 MEDIO | `buildCatSelects()` accede a `qc`/`nc` senza guard | funzione |
| 🟡 MEDIO | `setStatus()` accede a `dot` senza guard | funzione |

---

## Task 1: Aggiungere `addSpesa()`

**File:** Modify: `finanze/index.html` (sezione `<script>`, dopo `addConto()`)

- [ ] **Step 1: Trovare il punto di inserimento**

  Individuare la riga con `async function addConto()` nel file. La funzione `addSpesa()` va inserita subito dopo la chiusura di `addConto()`, prima della sezione `// ── UI HELPERS`.

- [ ] **Step 2: Inserire la funzione `addSpesa()`**

  Aggiungere questo blocco esatto (lo stesso pattern di `addEntrata()`):

  ```javascript
  async function addSpesa() {
    const amt  = parseFloat(document.getElementById('q-amount').value);
    const cat  = document.getElementById('q-cat').value;
    const sub  = document.getElementById('q-subcat').value;
    const nota = document.getElementById('q-note').value;
    const data = document.getElementById('q-date').value || todayISO;
    const year = data.slice(0,4);

    if (!amt || !cat) { showMsg('spesa-err','Inserisci importo e categoria'); return; }

    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Salvataggio...';

    try {
      const res = await apiPost({
        action: 'addSpesa',
        importo: amt,
        categoria: cat,
        sottocategoria: sub,
        nota, data, year,
        conto: '',
        metodo: ''
      });
      if (res.ok) {
        document.getElementById('q-amount').value = '';
        document.getElementById('q-note').value = '';
        showMsg('spesa-ok');
        await loadSpese();
      } else { showMsg('spesa-err', res.error || 'Errore'); }
    } catch(err) { showMsg('spesa-err', err.message); }

    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-check"></i> Salva spesa';
  }
  ```

- [ ] **Step 3: Verificare manualmente**

  Aprire `index.html` su GitHub Pages (o aprire il file e mockare le API con DevTools).
  - Tab Spese → inserire importo + categoria → cliccare "Salva spesa"
  - Atteso: spinner → messaggio verde "Spesa salvata su Google Sheets" → lista aggiornata
  - Controllare console: nessun `ReferenceError: addSpesa is not defined`

---

## Task 2: Null guard per `inv-data` (riga ~628)

**File:** Modify: `finanze/index.html` (subito dopo la riga con `if (qDateEl)`)

- [ ] **Step 1: Trovare e correggere la riga**

  Trovare:
  ```javascript
  document.getElementById('inv-data').value = new Date().toISOString().slice(0,10);
  ```

  Sostituire con:
  ```javascript
  const invDataEl = document.getElementById('inv-data');
  if (invDataEl) invDataEl.value = new Date().toISOString().slice(0,10);
  ```

---

## Task 3: Null guard in `renderContiList()`

**File:** Modify: `finanze/index.html` (funzione `renderContiList`)

- [ ] **Step 1: Aggiungere guard su `el`**

  Trovare in `renderContiList()`:
  ```javascript
  function renderContiList() {
    const el = document.getElementById('conti-list');
    // Populate e-conto select
  ```

  Aggiungere il guard subito dopo:
  ```javascript
  function renderContiList() {
    const el = document.getElementById('conti-list');
    if (!el) return;
    // Populate e-conto select
  ```

---

## Task 4: Null guard in `updateMonthLabel()`

**File:** Modify: `finanze/index.html` (funzione `updateMonthLabel`)

- [ ] **Step 1: Aggiungere guards**

  Trovare:
  ```javascript
  function updateMonthLabel() {
    const lbl = MONTHS_FULL[currentMonth-1] + ' ' + currentYear;
    document.getElementById('month-label').textContent = lbl;
    document.getElementById('view-cat-month').textContent = lbl;
  }
  ```

  Sostituire con:
  ```javascript
  function updateMonthLabel() {
    const lbl = MONTHS_FULL[currentMonth-1] + ' ' + currentYear;
    const mlEl = document.getElementById('month-label');
    const vcEl = document.getElementById('view-cat-month');
    if (mlEl) mlEl.textContent = lbl;
    if (vcEl) vcEl.textContent = lbl;
  }
  ```

---

## Task 5: Null guard in `showMsg()`

**File:** Modify: `finanze/index.html` (funzione `showMsg`)

- [ ] **Step 1: Aggiungere guard**

  Trovare:
  ```javascript
  function showMsg(id, txt) {
    const el = document.getElementById(id);
    if (txt) el.textContent = txt;
    el.style.display='block';
    setTimeout(()=>el.style.display='none', 4000);
  }
  ```

  Sostituire con:
  ```javascript
  function showMsg(id, txt) {
    const el = document.getElementById(id);
    if (!el) return;
    if (txt) el.textContent = txt;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 4000);
  }
  ```

---

## Task 6: Null guard in `buildCatSelects()`

**File:** Modify: `finanze/index.html` (funzione `buildCatSelects`)

- [ ] **Step 1: Aggiungere guards su `qc` e `nc`**

  Trovare il blocco `// q-cat` e `// new-cat-sel` dentro `buildCatSelects()`:
  ```javascript
  // q-cat
  const qc = document.getElementById('q-cat');
  const prev = qc.value;
  qc.innerHTML = '<option value="">Categoria...</option>';
  Object.keys(CATS).forEach(c => qc.innerHTML += `<option value="${c}">${c}</option>`);
  if (prev) qc.value = prev;

  // new-cat-sel
  const nc = document.getElementById('new-cat-sel');
  nc.innerHTML = '<option value="__new__">+ Nuova categoria</option>';
  Object.keys(CATS).forEach(c => nc.innerHTML += `<option value="${c}">${c}</option>`);
  ```

  Sostituire con:
  ```javascript
  // q-cat
  const qc = document.getElementById('q-cat');
  if (qc) {
    const prev = qc.value;
    qc.innerHTML = '<option value="">Categoria...</option>';
    Object.keys(CATS).forEach(c => qc.innerHTML += `<option value="${c}">${c}</option>`);
    if (prev) qc.value = prev;
  }

  // new-cat-sel
  const nc = document.getElementById('new-cat-sel');
  if (nc) {
    nc.innerHTML = '<option value="__new__">+ Nuova categoria</option>';
    Object.keys(CATS).forEach(c => nc.innerHTML += `<option value="${c}">${c}</option>`);
  }
  ```

---

## Task 7: Null guard in `setStatus()`

**File:** Modify: `finanze/index.html` (funzione `setStatus`)

- [ ] **Step 1: Aggiungere guard**

  Trovare:
  ```javascript
  function setStatus(state, text) {
    const dot = document.getElementById('sdot');
    dot.className = 'dot ' + (state==='ok'?'':'loading');
  ```

  Sostituire con:
  ```javascript
  function setStatus(state, text) {
    const dot = document.getElementById('sdot');
    if (!dot) return;
    dot.className = 'dot ' + (state==='ok'?'':'loading');
  ```

---

## Task 8: Verifica finale e commit

- [ ] **Step 1: Aprire la pagina su GitHub Pages e testare il flusso completo**

  Sequenza da testare:
  1. Apertura pagina → dot verde "sincronizzato" → nessun errore in console
  2. Tab Spese → nav mese → inserire spesa → salva → aggiornamento lista
  3. Tab Investimenti → selezionare piattaforma → inserire snapshot → salva
  4. Tab Budget → navigare mese → salvare un valore
  5. Tab Entrate → inserire entrata → salva → lista aggiornata
  6. Tab Impostazioni → aggiungere categoria → aggiungere conto

- [ ] **Step 2: Controllare la console per errori**

  Non devono apparire:
  - `ReferenceError: addSpesa is not defined`
  - `Cannot set properties of null`
  - `Cannot read properties of null`

- [ ] **Step 3: Commit**

  ```bash
  git add finanze/index.html
  git commit -m "fix: aggiungi addSpesa() mancante e null guard su tutti gli accessi DOM"
  ```
