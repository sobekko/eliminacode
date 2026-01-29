#!/usr/bin/env python3
import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATA_FILE = os.path.join(DATA_DIR, "turni.json")
STATIC_DIR = os.path.join(BASE_DIR, "static")

DATA_LOCK = Lock()


def _default_config():
    return {
        "servizio": "vendite",
        "servizi": ["vendite", "ritiro", "prioritario"],
        "operatori": [{"nome": "Operatore 1"}],
    }


def _ensure_data_file():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as handle:
            json.dump(
                {"turni": [], "corrente": None, "ultimo": 0, "config": _default_config()},
                handle,
            )


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
    if "operatori" not in state["config"]:
        state["config"]["operatori"] = _default_config()["operatori"]
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
                state["ultimo"] += 1
                ticket = {"numero": state["ultimo"], "servizio": servizio}
                state["turni"].append(ticket)
                _write_state(state)
            self._send_json({"ok": True, "ticket": ticket}, status=HTTPStatus.CREATED)
            return

        if parsed.path == "/api/turni/next":
            with DATA_LOCK:
                state = _read_state()
                if state["turni"]:
                    state["corrente"] = state["turni"].pop(0)
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
                _write_state(state)
            self._send_json({"ok": True, "state": state})
            return

        if parsed.path == "/api/admin":
            servizio = str(payload.get("servizio", "")).strip()
            servizi = payload.get("servizi", [])
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
                    "operatori": operatori_puliti,
                }
                _write_state(state)
            self._send_json({"ok": True, "config": state["config"]})
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint non trovato")


if __name__ == "__main__":
    _ensure_data_file()
    host = os.environ.get("ELIMINACODE_HOST", "0.0.0.0")
    port = int(os.environ.get("ELIMINACODE_PORT", "8000"))
    server = ThreadingHTTPServer((host, port), EliminacodeHandler)
    print(f"Eliminacode avviato su http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
