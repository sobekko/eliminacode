# Eliminacode locale

Sistema eliminacode per rete locale, senza dipendenze esterne o accesso a internet.

## Requisiti

- Python 3.9+ (solo librerie standard)

## Avvio

```bash
python3 server.py
```

Variabili opzionali:

- `ELIMINACODE_HOST` (default `0.0.0.0`)
- `ELIMINACODE_PORT` (default `8009`)
- `ELIMINACODE_HTTPS` (`1/true/on` per abilitare HTTPS)
- `ELIMINACODE_TLS_CERT` (default `certs/localhost.pem`)
- `ELIMINACODE_TLS_KEY` (default `certs/localhost-key.pem`)

Apri il browser su `http://<ip-locale>:8009`.
Pagina clienti (tablet) su `http://<ip-locale>:8009/cliente`.
Pagina operatori su `http://<ip-locale>:8009/operatore`.
Display chiamata su `http://<ip-locale>:8009/display`.
Statistiche su `http://<ip-locale>:8009/stat`.
L'interfaccia di amministrazione è su `http://<ip-locale>:8009/admin`.

### HTTPS locale (per Chromecast)

Genera certificato e chiave (sostituisci `192.168.1.50` con l'IP del tuo server):

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
  -keyout certs/localhost-key.pem \
  -out certs/localhost.pem \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:192.168.1.50"
```

Avvio HTTPS:

```bash
ELIMINACODE_HTTPS=1 python3 server.py
```

Poi apri: `https://<ip-locale>:8009/multioperatore`

## Funzioni

- Creazione ticket cliente dalla pagina dedicata
- Selezione del servizio richiesto (vendite, ritiro, prioritario)
- Priorità per servizio (1 = alta, 3 = bassa) configurabile in admin
- Prefisso per servizio (0-1 caratteri) per differenziare la coda
- Numerazione separata per servizio (es. V1, P1, R1)
- Personalizzazione display e kiosk (layout, colori, sfondo, logo, immagini e dimensioni) da admin
- Stampa del ticket cliente
- Chiamata prossimo turno
- Reset completo coda
- Configurazione operatori e servizio tramite pagina admin
- Statistiche con attesa media e riepiloghi per giorno/settimana/mese

## Note rete locale

- Non vengono effettuate chiamate a servizi esterni.
- Per visibilità solo LAN, limita l'accesso con firewall o bind su IP specifico.
- Lo storico ticket/chiamate viene salvato nel database SQLite `data/eliminacode.db`.
