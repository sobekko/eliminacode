# Eliminacode locale

Sistema eliminacode tipo "ezturns" per rete locale, senza dipendenze esterne o accesso a internet.

## Requisiti

- Python 3.9+ (solo librerie standard)

## Avvio

```bash
python3 server.py
```

Variabili opzionali:

- `ELIMINACODE_HOST` (default `0.0.0.0`)
- `ELIMINACODE_PORT` (default `8000`)

Apri il browser su `http://<ip-locale>:8000`.
Pagina clienti (tablet) su `http://<ip-locale>:8000/cliente`.
Pagina operatori su `http://<ip-locale>:8000/operatore`.
L'interfaccia di amministrazione è su `http://<ip-locale>:8000/admin`.

## Funzioni

- Creazione ticket cliente dalla pagina dedicata
- Selezione del servizio richiesto (vendite, ritiro, prioritario)
- Stampa del ticket cliente
- Chiamata prossimo turno
- Reset completo coda
- Configurazione operatori e servizio tramite pagina admin

## Note rete locale

- Non vengono effettuate chiamate a servizi esterni.
- Per visibilità solo LAN, limita l'accesso con firewall o bind su IP specifico.
