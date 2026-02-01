#!/usr/bin/env python3
import json
import mimetypes
import os
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.parse import parse_qs, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "turni.json")
DB_FILE = os.path.join(DATA_DIR, "eliminacode.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOAD_DIR = os.path.join(BASE_DIR, "upload")
AUDIO_DIR = os.path.join(UPLOAD_DIR, "audio")
IMAGE_DIR = os.path.join(UPLOAD_DIR, "image")

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
            "audio": {
                "abilita": False,
                "url": "",
                "volume": 1.0,
            },
            "tema": {
                "sfondo": "#0f172a",
                "testo": "#f8fafc",
                "card": "#1e293b",
                "immagine_sfondo": "",
            },
        },
        "kiosk": {
            "contenuti": {
                "testo": "Prendi il tuo ticket",
                "logo": "",
                "posizione_testo": "sopra",
            },
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
                    "contatori": {},
                    "storico": [],
                    "config": _default_config(),
                },
                handle,
            )


def _ensure_upload_dirs():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(IMAGE_DIR, exist_ok=True)


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
    if "audio" not in state["config"]["display"]:
        state["config"]["display"]["audio"] = _default_config()["display"]["audio"]
    if "kiosk" not in state["config"]:
        state["config"]["kiosk"] = _default_config()["kiosk"]
    elif "dimensioni" not in state["config"]["kiosk"]:
        state["config"]["kiosk"]["dimensioni"] = _default_config()["kiosk"]["dimensioni"]
    if "contenuti" not in state["config"]["kiosk"]:
        state["config"]["kiosk"]["contenuti"] = _default_config()["kiosk"]["contenuti"]
    if "operatori" not in state["config"]:
        state["config"]["operatori"] = _default_config()["operatori"]
    if "storico" not in state:
        state["storico"] = []
    if "contatori" not in state:
        state["contatori"] = {}
    now_iso = datetime.now(timezone.utc).isoformat()
    for ticket in state.get("turni", []):
        if "creato_il" not in ticket:
            ticket["creato_il"] = now_iso
    return state


def _write_state(state):
    with open(DATA_FILE, "w", encoding="utf-8") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=2)


def _safe_join(root, relative_path):
    root_abs = os.path.abspath(root)
    joined = os.path.abspath(os.path.join(root_abs, relative_path))
    if os.path.commonpath([root_abs, joined]) != root_abs:
        return None
    return joined


def _parse_multipart_file(content_type, body):
    if "boundary=" not in content_type:
        return None, None
    boundary = content_type.split("boundary=", 1)[1].strip().strip('"')
    if not boundary:
        return None, None
    delimiter = f"--{boundary}".encode("utf-8")
    parts = body.split(delimiter)
    for part in parts:
        if not part or part in (b"--\r\n", b"--"):
            continue
        if part.startswith(b"\r\n"):
            part = part[2:]
        if part.endswith(b"\r\n"):
            part = part[:-2]
        if part.endswith(b"--"):
            part = part[:-2]
        if b"\r\n\r\n" not in part:
            continue
        header_bytes, content = part.split(b"\r\n\r\n", 1)
        headers = {}
        for line in header_bytes.split(b"\r\n"):
            if b":" not in line:
                continue
            key, value = line.split(b":", 1)
            headers[key.decode("utf-8").lower()] = value.decode("utf-8").strip()
        disposition = headers.get("content-disposition", "")
        if "name=" not in disposition:
            continue
        name = ""
        filename = ""
        for chunk in disposition.split(";"):
            chunk = chunk.strip()
            if chunk.startswith("name="):
                name = chunk.split("=", 1)[1].strip().strip('"')
            elif chunk.startswith("filename="):
                filename = chunk.split("=", 1)[1].strip().strip('"')
        if name == "file" and filename:
            if content.endswith(b"\r\n"):
                content = content[:-2]
            return filename, content
    return None, None


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
        guessed_type, _ = mimetypes.guess_type(path)
        if guessed_type:
            content_type = guessed_type
            if guessed_type.startswith("text/") and "charset" not in guessed_type:
                content_type = f"{guessed_type}; charset=utf-8"
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
            if parsed.path == "/api/uploads":
                query = parse_qs(parsed.query)
                tipo = (query.get("type") or [""])[0]
                if tipo == "audio":
                    base_dir = AUDIO_DIR
                    base_url = "/upload/audio"
                elif tipo == "image":
                    base_dir = IMAGE_DIR
                    base_url = "/upload/image"
                else:
                    self.send_error(HTTPStatus.BAD_REQUEST, "Tipo non valido")
                    return
                _ensure_upload_dirs()
                files = []
                for name in sorted(os.listdir(base_dir)):
                    file_path = os.path.join(base_dir, name)
                    if os.path.isfile(file_path):
                        files.append({"name": name, "url": f"{base_url}/{name}"})
                self._send_json({"files": files})
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
        if parsed.path == "/admin_display":
            self._send_file(os.path.join(STATIC_DIR, "admin_display.html"))
            return
        if parsed.path == "/admin_kiosk":
            self._send_file(os.path.join(STATIC_DIR, "admin_kiosk.html"))
            return
        if parsed.path.startswith("/upload/"):
            _ensure_upload_dirs()
            safe_path = os.path.normpath(parsed.path.lstrip("/"))
            file_path = _safe_join(BASE_DIR, safe_path)
            if not file_path:
                self.send_error(HTTPStatus.BAD_REQUEST, "Percorso non valido")
                return
            self._send_file(file_path)
            return
        safe_path = os.path.normpath(parsed.path.lstrip("/"))
        static_root = os.path.abspath(STATIC_DIR)
        file_path = os.path.abspath(os.path.join(static_root, safe_path))
        if os.path.commonpath([static_root, file_path]) != static_root:
            self.send_error(HTTPStatus.BAD_REQUEST, "Percorso non valido")
            return
        self._send_file(file_path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint non trovato")
            return
        length = int(self.headers.get("Content-Length", "0"))
        body_bytes = self.rfile.read(length) if length else b""
        content_type = self.headers.get("Content-Type", "")
        payload = {}
        if content_type.startswith("multipart/form-data"):
            payload = None
        else:
            body = body_bytes.decode("utf-8") if body_bytes else "{}"
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
                contatori = state.get("contatori", {})
                contatori[servizio] = contatori.get(servizio, 0) + 1
                state["contatori"] = contatori
                ticket = {
                    "numero": contatori[servizio],
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
                    chiamato_il = datetime.now(timezone.utc).isoformat()
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
                            "chiamato_il": chiamato_il,
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

        if parsed.path == "/api/turni/recall":
            numero = payload.get("numero")
            servizio = str(payload.get("servizio", "")).strip()
            prefisso = str(payload.get("prefisso", "")).strip()
            operatore = str(payload.get("operatore", "")).strip()
            if not isinstance(numero, int) or numero < 1:
                self.send_error(HTTPStatus.BAD_REQUEST, "Numero non valido")
                return
            if not servizio:
                self.send_error(HTTPStatus.BAD_REQUEST, "Servizio non valido")
                return
            with DATA_LOCK:
                state = _read_state()
                chiamato_il = datetime.now(timezone.utc).isoformat()
                state["corrente"] = {
                    "numero": numero,
                    "servizio": servizio,
                    "prefisso": prefisso,
                    "operatore": operatore,
                }
                storico = state.get("storico", [])
                storico.append(
                    {
                        "numero": numero,
                        "servizio": servizio,
                        "prefisso": prefisso,
                        "operatore": operatore,
                        "chiamato_il": chiamato_il,
                    }
                )
                state["storico"] = storico[-20:]
                _write_state(state)
            _db_execute(
                "INSERT INTO chiamate (numero, servizio, prefisso, operatore, chiamato_il) VALUES (?, ?, ?, ?, datetime('now'))",
                (numero, servizio, prefisso, operatore),
            )
            self._send_json({"ok": True, "corrente": state["corrente"]})
            return

        if parsed.path == "/api/turni/reset":
            with DATA_LOCK:
                state = _read_state()
                state["turni"] = []
                state["corrente"] = None
                state["ultimo"] = 0
                state["contatori"] = {}
                state["storico"] = []
                _write_state(state)
            self._send_json({"ok": True, "state": state})
            return

        if parsed.path == "/api/upload":
            query = parse_qs(parsed.query)
            tipo = (query.get("type") or [""])[0]
            if tipo == "audio":
                base_dir = AUDIO_DIR
                base_url = "/upload/audio"
            elif tipo == "image":
                base_dir = IMAGE_DIR
                base_url = "/upload/image"
            else:
                self.send_error(HTTPStatus.BAD_REQUEST, "Tipo non valido")
                return
            if not content_type.startswith("multipart/form-data"):
                self.send_error(HTTPStatus.BAD_REQUEST, "Formato non valido")
                return
            filename, content = _parse_multipart_file(content_type, body_bytes)
            if not filename or content is None:
                self.send_error(HTTPStatus.BAD_REQUEST, "File mancante")
                return
            filename = os.path.basename(filename)
            if not filename:
                self.send_error(HTTPStatus.BAD_REQUEST, "Nome file non valido")
                return
            _ensure_upload_dirs()
            destination = _safe_join(base_dir, filename)
            if not destination:
                self.send_error(HTTPStatus.BAD_REQUEST, "Nome file non valido")
                return
            with open(destination, "wb") as handle:
                handle.write(content)
            self._send_json({"ok": True, "name": filename, "url": f"{base_url}/{filename}"})
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
            display_audio = display.get("audio", {})
            if not isinstance(display_audio, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            audio_abilita = bool(display_audio.get("abilita", False))
            audio_url = str(display_audio.get("url", "")).strip()
            try:
                audio_volume = float(display_audio.get("volume", 1.0))
            except (TypeError, ValueError):
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
            if audio_volume < 0 or audio_volume > 1:
                self.send_error(HTTPStatus.BAD_REQUEST, "Display non valido")
                return
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
            contenuti_kiosk = kiosk.get("contenuti", {})
            if contenuti_kiosk is None:
                contenuti_kiosk = {}
            if not isinstance(contenuti_kiosk, dict):
                self.send_error(HTTPStatus.BAD_REQUEST, "Kiosk non valido")
                return
            posizione_testo = str(contenuti_kiosk.get("posizione_testo", "sopra")).strip().lower()
            if posizione_testo not in {"sopra", "sotto", "entrambi"}:
                self.send_error(HTTPStatus.BAD_REQUEST, "Kiosk non valido")
                return
            kiosk_contenuti = {
                "testo": str(contenuti_kiosk.get("testo", "")).strip(),
                "logo": str(contenuti_kiosk.get("logo", "")).strip(),
                "posizione_testo": posizione_testo,
            }
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
                    "audio": {
                        "abilita": audio_abilita,
                        "url": audio_url,
                        "volume": audio_volume,
                    },
                    "tema": display_tema,
                },
                    "kiosk": {"contenuti": kiosk_contenuti, "tema": kiosk_tema, "dimensioni": kiosk_dim},
                    "operatori": operatori_puliti,
                }
                _write_state(state)
            self._send_json({"ok": True, "config": state["config"]})
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint non trovato")


if __name__ == "__main__":
    _ensure_data_file()
    _ensure_upload_dirs()
    _init_db()
    host = os.environ.get("ELIMINACODE_HOST", "0.0.0.0")
    port = int(os.environ.get("ELIMINACODE_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), EliminacodeHandler)
    print(f"Eliminacode avviato su http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
