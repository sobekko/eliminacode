#!/usr/bin/env python3
import json
import os
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "turni.json")
DB_FILE = os.path.join(DATA_DIR, "eliminacode.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")

DATA_LOCK = Lock()


def _default_config():
    return {
        "servizio": "vendite",
        "servizi": ["vendite", "ritiro", "prioritario"],
        "priorita": {"vendite": 2, "ritiro": 2, "prioritario": 1},
        "prefissi": {"vendite": "V", "ritiro": "R", "prioritario": "P"},
        "display": {
            "mostra_ultimi": True,
            "numero_ultimi": 5,
            "logo": "",
            "immagini": [],
            "layout": "split",
            "dimensioni": {
                "numero": "5rem",
                "card": "1fr",
                "extra": "1fr",
            },
            "tema": {
                "sfondo": "#0f172a",
                "testo": "#f8fafc",
                "card": "#1e293b",
                "immagine_sfondo": "",
            },
        },
        "kiosk": {
            "tema": {
                "sfondo": "#f4f5f7",
                "testo": "#1b1f24",
                "bottone": "#1f6feb",
                "testo_bottone": "#ffffff",
                "immagine_sfondo": "",
            },
            "dimensioni": {
                "bottone": "1rem",
                "bottone_padding": "8px 14px",
            },
        },
        "operatori": [{"nome": "Operatore 1"}],
    }


def _ensure_data_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "turni": [],
                    "corrente": None,
                    "ultimo": 0,
                    "storico": [],
                    "config": _default_config(),
                },
                handle,
            )


def _init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero INTEGER NOT NULL,
                servizio TEXT NOT NULL,
                prefisso TEXT NOT NULL,
                priorita INTEGER NOT NULL,
                creato_il TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS chiamate (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero INTEGER NOT NULL,
                servizio TEXT NOT NULL,
                prefisso TEXT NOT NULL,
                operatore TEXT NOT NULL,
                chiamato_il TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _db_execute(query, params):
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute(query, params)
        conn.commit()


def _read_state():
    _ensure_data_file()
    with open(DATA_FILE, "r", encoding="utf-8") as handle:
        state = json.load(handle)
    if "config" not in state:
        state["config"] = _default_config()
    if "servizio" not in state["config"]:
        state["config"]["servizio"] = _default_config()["servizio"]
    if "servizi" not in state["config"]:
        state["config"]["servizi"] = _default_config()["servizi"]
    if "priorita" not in state["config"]:
        state["config"]["priorita"] = _default_config()["priorita"]
    if "prefissi" not in state["config"]:
        state["config"]["prefissi"] = _default_config()["prefissi"]
    if "display" not in state["config"]:
        state["config"]["display"] = _default_config()["display"]
    elif "dimensioni" not in state["config"]["display"]:
        state["config"]["display"]["dimensioni"] = _default_config()["display"]["dimensioni"]
    if "kiosk" not in state["config"]:
        state["config"]["kiosk"] = _default_config()["kiosk"]
    elif "dimensioni" not in state["config"]["kiosk"]:
        state["config"]["kiosk"]["dimensioni"] = _default_config()["kiosk"]["dimensioni"]
    if "operatori" not in state["config"]:
        state["config"]["operatori"] = _default_config()["operatori"]
    if "storico" not in state:
        state["storico"] = []
    now_iso = datetime.now(timezone.utc).isoformat()
    for ticket in state.get("turni", []):
        if "creato_il" not in ticket:
            ticket["creato_il"] = now_iso
    return state


def _write_state(state):
    with open(DATA_FILE, "w", encoding="utf-8") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=2)


class EliminacodeHandler(BaseHTTPRequestHandler):
    server_version = "Eliminacode/0.1"

    def _send_json(self, payload, status=HTTPStatus.OK):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_file(self, path):
        if not os.path.isfile(path):
            self.send_error(HTTPStatus.NOT_FOUND, "File non trovato")
            return
        with open(path, "rb") as handle:
            content = handle.read()
        if path.endswith(".html"):
            content_type = "text/html; charset=utf-8"
        elif path.endswith(".css"):
            content_type = "text/css; charset=utf-8"
        elif path.endswith(".js"):
            content_type = "application/javascript; charset=utf-8"
        else:
            content_type = "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if parsed.path == "/api/turni":
                with DATA_LOCK:
                    state = _read_state()
                self._send_json(state)
                return
            if parsed.path == "/api/admin":
                with DATA_LOCK:
                    state = _read_state()
                self._send_json(state["config"])
                return
            if parsed.path == "/api/display":
                with DATA_LOCK:
                    state = _read_state()
                self._send_json(
                    {
                        "corrente": state.get("corrente"),
                        "storico": state.get("storico", []),
                        "display": state["config"].get("display", {}),
                    }
                )
                return
            if parsed.path == "/api/stats":
                with sqlite3.connect(DB_FILE) as conn:
                    conn.row_factory = sqlite3.Row
                    totale_ticket = conn.execute("SELECT COUNT(*) AS count FROM tickets").fetchone()[
                        "count"
                    ]
                    totale_chiamate = conn.execute("SELECT COUNT(*) AS count FROM chiamate").fetchone()[
                        "count"
                    ]
                    attesa_media = conn.execute(
                        """
                        SELECT AVG((julianday(c.chiamato_il) - julianday(t.creato_il)) * 86400.0) AS media
                        FROM chiamate c
                        JOIN tickets t
                          ON t.numero = c.numero
                         AND t.servizio = c.servizio
                         AND t.prefisso = c.prefisso
                        """
                    ).fetchone()["media"]
                    per_servizio = conn.execute(
                        """
                        SELECT servizio, COUNT(*) AS count
                        FROM tickets
                        GROUP BY servizio
                        ORDER BY servizio
                        """
                    ).fetchall()
                    chiamate_per_operatore = conn.execute(
                        """
                        SELECT operatore, COUNT(*) AS count
                        FROM chiamate
                        GROUP BY operatore
                        ORDER BY count DESC
                        """
                    ).fetchall()
                    ultimi = conn.execute(
                        """
                        SELECT numero, servizio, prefisso, operatore, chiamato_il
                        FROM chiamate
                        ORDER BY id DESC
                        LIMIT 10
                        """
                    ).fetchall()
                    per_giorno = conn.execute(
                        """
                        SELECT date(creato_il) AS periodo, COUNT(*) AS count
                        FROM tickets
                        GROUP BY date(creato_il)
                        ORDER BY periodo DESC
                        LIMIT 30
                        """
                    ).fetchall()
                    per_settimana = conn.execute(
                        """
                        SELECT strftime('%Y-W%W', creato_il) AS periodo, COUNT(*) AS count
                        FROM tickets
                        GROUP BY strftime('%Y-W%W', creato_il)
                        ORDER BY periodo DESC
                        LIMIT 20
                        """
                    ).fetchall()
                    per_mese = conn.execute(
                        """
                        SELECT strftime('%Y-%m', creato_il) AS periodo, COUNT(*) AS count
                        FROM tickets
                        GROUP BY strftime('%Y-%m', creato_il)
                        ORDER BY periodo DESC
                        LIMIT 12
                        """
                    ).fetchall()
                self._send_json(
                    {
                        "totale_ticket": totale_ticket,
                        "totale_chiamate": totale_chiamate,
                        "attesa_media_secondi": attesa_media,
                        "per_servizio": [
                            {"servizio": row["servizio"], "count": row["count"]}
                            for row in per_servizio
                        ],
                        "chiamate_per_operatore": [
                            {"operatore": row["operatore"], "count": row["count"]}
                            for row in chiamate_per_operatore
                        ],
                        "ultime_chiamate": [
                            {
                                "numero": row["numero"],
                                "servizio": row["servizio"],
                                "prefisso": row["prefisso"],
                                "operatore": row["operatore"],
                                "chiamato_il": row["chiamato_il"],
                            }
                            for row in ultimi
                        ],
                        "per_giorno": [
                            {"periodo": row["periodo"], "count": row["count"]}
                            for row in per_giorno
                        ],
                        "per_settimana": [
                            {"periodo": row["periodo"], "count": row["count"]}
                            for row in per_settimana
                        ],
                        "per_mese": [
                            {"periodo": row["periodo"], "count": row["count"]}
                            for row in per_mese
                        ],
                    }
                )
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint non trovato")
            return
        if parsed.path == "/" or parsed.path == "":
            self._send_file(os.path.join(STATIC_DIR, "index.html"))
            return
        if parsed.path == "/cliente":
            self._send_file(os.path.join(STATIC_DIR, "client.html"))
            return
        if parsed.path == "/operatore":
            self._send_file(os.path.join(STATIC_DIR, "operatore.html"))
            return
        if parsed.path == "/display":
            self._send_file(os.path.join(STATIC_DIR, "display.html"))
            return
        if parsed.path == "/stat":
            self._send_file(os.path.join(STATIC_DIR, "stat.html"))
            return
        if parsed.path == "/admin":
            self._send_file(os.path.join(STATIC_DIR, "admin.html"))
            return
        safe_path = os.path.normpath(parsed.path.lstrip("/"))
        file_path = os.path.join(STATIC_DIR, safe_path)
        if not file_path.startswith(STATIC_DIR):
            self.send_error(HTTPStatus.BAD_REQUEST, "Percorso non valido")
            return
        self._send_file(file_path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint non trovato")
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "JSON non valido")
            return

        if parsed.path == "/api/turni":
            with DATA_LOCK:
                state = _read_state()
                servizi = state["config"].get("servizi", [])
                servizio = str(payload.get("servizio", "")).strip()
                if not servizio and servizi:
                    servizio = servizi[0]
                if servizi and servizio not in servizi:
                    self.send_error(HTTPStatus.BAD_REQUEST, "Servizio non valido")
                    return
                priorita_config = state["config"].get("priorita", {})
                prefissi = state["config"].get("prefissi", {})
                priorita = int(priorita_config.get(servizio, 3))
                creato_il = datetime.now(timezone.utc).isoformat()
                state["ultimo"] += 1
                ticket = {
                    "numero": state["ultimo"],
                    "servizio": servizio,
                    "priorita": priorita,
                    "prefisso": prefissi.get(servizio, ""),
                    "creato_il": creato_il,
                }
                state["turni"].append(ticket)
                _write_state(state)
            _db_execute(
                "INSERT INTO tickets (numero, servizio, prefisso, priorita, creato_il) VALUES (?, ?, ?, ?, datetime('now'))",
                (ticket["numero"], ticket["servizio"], ticket["prefisso"], ticket["priorita"]),
            )
            self._send_json({"ok": True, "ticket": ticket}, status=HTTPStatus.CREATED)
            return

        if parsed.path == "/api/turni/next":
            with DATA_LOCK:
                state = _read_state()
                operatore = str(payload.get("operatore", "")).strip()
                if state["turni"]:
                    priorita_min = min(ticket.get("priorita", 3) for ticket in state["turni"])
                    indice = next(
                        (
                            i
                            for i, ticket in enumerate(state["turni"])
                            if ticket.get("priorita", 3) == priorita_min
                        ),
                        0,
                    )
                    state["corrente"] = state["turni"].pop(indice)
                    if operatore:
                        state["corrente"]["operatore"] = operatore
                    storico = state.get("storico", [])
                    storico.append(
                        {
                            "numero": state["corrente"]["numero"],
                            "servizio": state["corrente"].get("servizio", ""),
                            "prefisso": state["corrente"].get("prefisso", ""),
                            "operatore": state["corrente"].get("operatore", ""),
                        }
                    )
                    state["storico"] = storico[-20:]
                    _db_execute(
                        "INSERT INTO chiamate (numero, servizio, prefisso, operatore, chiamato_il) VALUES (?, ?, ?, ?, datetime('now'))",
                        (
                            state["corrente"]["numero"],
                            state["corrente"].get("servizio", ""),
                            state["corrente"].get("prefisso", ""),
                            state["corrente"].get("operatore", ""),
                        ),
                    )
                else:
                    state["corrente"] = None
                _write_state(state)
            self._send_json({"ok": True, "corrente": state["corrente"], "attesa": state["turni"]})
            return

        if parsed.path == "/api/turni/reset":
            with DATA_LOCK:
                state = _read_state()
                state["turni"] = []
                state["corrente"] = None
                state["ultimo"] = 0
                state["storico"] = []
                _write_state(state)
            self._send_json({"ok": True, "state": state})
            return

        if parsed.path == "/api/admin":
            servizio = str(payload.get("servizio", "")).strip()
            servizi = payload.get("servizi", [])
            priorita = payload.get("priorita", {})
            prefissi = payload.get("prefissi", {})
            display = payload.get("display", {})
            kiosk = payload.get("kiosk", {})
            operatori = payload.get("operatori", [])
            if not servizio:
                self.send_error(HTTPStatus.BAD_REQUEST, "Servizio richiesto")
                return
            if not isinstance(servizi, list) or not servizi:
                self.send_error(HTTPStatus.BAD_REQUEST, "Servizi non validi")
                return
            servizi_puliti = [str(voce).strip() for voce in servizi if str(voce).strip()]
            if not servizi_puliti:
                self.send_error(HTTPStatus.BAD_REQUEST, "Servizi non validi")
                return
            if servizio not in servizi_puliti:
                servizi_puliti.insert(0, servizio)
            if not isinstance(priorita, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Priorità non valide")
                return
            priorita_pulita = {}
            for voce in servizi_puliti:
                valore = int(priorita.get(voce, 3))
                if valore < 1 or valore > 3:
                    self.send_error(HTTPStatus.BAD_REQUEST, "Priorità non valide")
                    return
                priorita_pulita[voce] = valore
            if not isinstance(prefissi, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Prefissi non validi")
                return
            prefissi_puliti = {}
            for voce in servizi_puliti:
                valore = str(prefissi.get(voce, "")).strip().upper()
                if len(valore) > 1:
                    self.send_error(HTTPStatus.BAD_REQUEST, "Prefissi non validi")
                    return
                prefissi_puliti[voce] = valore
            if not isinstance(display, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            mostra_ultimi = bool(display.get("mostra_ultimi", True))
            numero_ultimi = int(display.get("numero_ultimi", 5))
            if numero_ultimi < 1 or numero_ultimi > 10:
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            logo = str(display.get("logo", "")).strip()
            immagini = display.get("immagini", [])
            if not isinstance(immagini, list):
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            immagini_pulite = [str(url).strip() for url in immagini if str(url).strip()]
            layout = str(display.get("layout", "split")).strip()
            if layout not in {"split", "stacked"}:
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            dimensioni_display = display.get("dimensioni", {})
            if not isinstance(dimensioni_display, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            display_dimensioni = {
                "numero": str(dimensioni_display.get("numero", "5rem")).strip(),
                "card": str(dimensioni_display.get("card", "1fr")).strip(),
                "extra": str(dimensioni_display.get("extra", "1fr")).strip(),
            }
            tema_display = display.get("tema", {})
            if not isinstance(tema_display, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            display_tema = {
                "sfondo": str(tema_display.get("sfondo", "#0f172a")).strip(),
                "testo": str(tema_display.get("testo", "#f8fafc")).strip(),
                "card": str(tema_display.get("card", "#1e293b")).strip(),
                "immagine_sfondo": str(tema_display.get("immagine_sfondo", "")).strip(),
            }
            if not isinstance(kiosk, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Kiosk non valido")
                return
            tema_kiosk = kiosk.get("tema", {})
            if not isinstance(tema_kiosk, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Kiosk non valido")
                return
            kiosk_tema = {
                "sfondo": str(tema_kiosk.get("sfondo", "#f4f5f7")).strip(),
                "testo": str(tema_kiosk.get("testo", "#1b1f24")).strip(),
                "bottone": str(tema_kiosk.get("bottone", "#1f6feb")).strip(),
                "testo_bottone": str(tema_kiosk.get("testo_bottone", "#ffffff")).strip(),
                "immagine_sfondo": str(tema_kiosk.get("immagine_sfondo", "")).strip(),
            }
            kiosk_dimensioni = kiosk.get("dimensioni", {})
            if not isinstance(kiosk_dimensioni, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Kiosk non valido")
                return
            kiosk_dim = {
                "bottone": str(kiosk_dimensioni.get("bottone", "1rem")).strip(),
                "bottone_padding": str(kiosk_dimensioni.get("bottone_padding", "8px 14px")).strip(),
            }
            if not isinstance(operatori, list) or not operatori:
                self.send_error(HTTPStatus.BAD_REQUEST, "Operatori non validi")
                return
            operatori_puliti = []
            for operatore in operatori:
                nome = str(operatore.get("nome", "")).strip()
                if nome:
                    operatori_puliti.append({"nome": nome})
            if not operatori_puliti:
                self.send_error(HTTPStatus.BAD_REQUEST, "Operatori non validi")
                return
            with DATA_LOCK:
                state = _read_state()
                state["config"] = {
                    "servizio": servizio,
                    "servizi": servizi_puliti,
                    "priorita": priorita_pulita,
                    "prefissi": prefissi_puliti,
                    "display": {
                        "mostra_ultimi": mostra_ultimi,
                        "numero_ultimi": numero_ultimi,
                        "logo": logo,
                        "immagini": immagini_pulite,
                        "layout": layout,
                        "dimensioni": display_dimensioni,
                        "tema": display_tema,
                    },
                    "kiosk": {"tema": kiosk_tema, "dimensioni": kiosk_dim},
                    "operatori": operatori_puliti,
                }
                _write_state(state)
            self._send_json({"ok": True, "config": state["config"]})
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint non trovato")


if __name__ == "__main__":
    _ensure_data_file()
    _init_db()
    host = os.environ.get("ELIMINACODE_HOST", "0.0.0.0")
    port = int(os.environ.get("ELIMINACODE_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), EliminacodeHandler)
    print(f"Eliminacode avviato su http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
