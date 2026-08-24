# Test

```bash
node finanze/tests/run.js          # tutte le suite
node finanze/tests/run.js fin14    # solo quelle il cui nome contiene "fin14"
```

Nessuna dipendenza: serve solo Node. Il runner esce con codice diverso da zero se
qualcosa fallisce.

## Come sono fatte

`index.html` è un single-file senza moduli, quindi non c'è nulla da `require`. Le
suite **estraggono le funzioni per nome dai file sorgente** (`helpers.js`) e le
eseguono con gli stub minimi che servono: `document`, `fetch`, `localStorage`,
`CacheService`, `navigator`.

Il vantaggio è che i test restano agganciati al codice vero invece che a una copia
che invecchia. Il prezzo è che una funzione rinominata fa fallire l'estrazione con
`funzione non trovata: X` — che è comunque l'informazione giusta.

Ogni suite gira in un processo suo, così gli stub globali di una non contaminano
le altre. `fin20` viene eseguita sotto quattro fusi orari: il bug che copre si
manifestava solo con certi offset da UTC.

## Due tipi di asserzione

- **Comportamentali** — eseguono la funzione e ne controllano il risultato.
- **Strutturali** — controllano che il codice mantenga una certa forma (nessun
  `confirm()`, aree di tocco da 44px, nessuna variabile CSS indefinita). Servono
  per invarianti che non si possono provare eseguendo una funzione sola.

Le strutturali sono fragili per costruzione: un refactor legittimo può romperle.
Quando succede, **riscrivi l'asserzione sull'invariante**, non sulla nuova forma
del codice. È già accaduto più volte, e ogni volta ha intercettato qualcosa.

## Cosa copre

| Suite | Argomento |
|---|---|
| `fin1` | Forward-fill del grafico patrimonio, snapshot fra anni diversi |
| `fin2` | Navigazione mesi attraverso il cambio d'anno |
| `fin3` | Metriche Entrate riferite al periodo mostrato |
| `fin4` | Risposte non-JSON di Apps Script, retry, messaggi d'errore |
| `fin5` | Endpoint `getBootstrap`, periodo contabile, fallback alle granulari |
| `fin6` | Cache locale: validità per periodo, storage negato, quota piena |
| `fin7` | `CacheService` e invalidazione dopo ogni scrittura |
| `fin12` | Combinazioni recenti nel quick add |
| `fin13` | Avviso per movimento salvato fuori dal periodo mostrato |
| `fin14` | Notifiche e annullamento dell'eliminazione |
| `fin16` | Modale accessibile, aree di tocco, variabili CSS definite |
| `fin20` | Date locali che non devono slittare in UTC (4 fusi) |
| `fin21-auth` | Il service worker non deve mettere in cache il form di login |

## Cosa NON coprono

Rendering, layout, Chart.js e il comportamento reale del browser. Quelli vanno
verificati aprendo l'app. Diversi difetti di questa serie — la modale trasparente,
i chip che puntavano a un conto sparito — sono emersi solo guardandola.
