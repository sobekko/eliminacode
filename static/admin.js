const form = document.getElementById("form-admin");
const servizioInput = document.getElementById("servizio");
const serviziInput = document.getElementById("servizi");
const prioritaContainer = document.getElementById("priorita-container");
const prefissiContainer = document.getElementById("prefissi-container");
const numeroOperatoriSelect = document.getElementById("numero-operatori");
const operatoriContainer = document.getElementById("operatori-container");
const esitoAdmin = document.getElementById("esito-admin");
let configData = null;

function creaOperatoriInputs(numero, valori = []) {
  operatoriContainer.innerHTML = "";
  for (let i = 0; i < numero; i += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "row";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Operatore ${i + 1}`;
    input.value = valori[i]?.nome || "";
    input.required = true;

    wrapper.appendChild(input);
    operatoriContainer.appendChild(wrapper);
  }
}

function creaPrioritaRow(servizio, valore) {
  const row = document.createElement("div");
  row.className = "priorita-row";

  const label = document.createElement("span");
  label.textContent = servizio;

  const select = document.createElement("select");
  select.dataset.servizio = servizio;
  [1, 2, 3].forEach((numero) => {
    const option = document.createElement("option");
    option.value = String(numero);
    option.textContent = String(numero);
    if (numero === valore) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  row.appendChild(label);
  row.appendChild(select);
  return row;
}

function renderPriorita(servizi, priorita) {
  prioritaContainer.innerHTML = "";
  servizi.forEach((servizio) => {
    const valore = priorita[servizio] ?? 3;
    prioritaContainer.appendChild(creaPrioritaRow(servizio, valore));
  });
}

function creaPrefissoRow(servizio, valore) {
  const row = document.createElement("div");
  row.className = "priorita-row";

  const label = document.createElement("span");
  label.textContent = servizio;

  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 1;
  input.dataset.servizio = servizio;
  input.value = valore || "";
  input.placeholder = "-";

  row.appendChild(label);
  row.appendChild(input);
  return row;
}

function renderPrefissi(servizi, prefissi) {
  prefissiContainer.innerHTML = "";
  servizi.forEach((servizio) => {
    const valore = prefissi[servizio] || "";
    prefissiContainer.appendChild(creaPrefissoRow(servizio, valore));
  });
}

function parseServizi() {
  return serviziInput.value
    .split(",")
    .map((voce) => voce.trim())
    .filter(Boolean);
}

function ensureDisplayDefaults(display = {}) {
  return {
    mostra_ultimi: display.mostra_ultimi ?? true,
    numero_ultimi: display.numero_ultimi ?? 5,
    layout: display.layout || "split",
    logo: display.logo || "",
    immagini: display.immagini || [],
    dimensioni: {
      numero: display.dimensioni?.numero || "5rem",
      card: display.dimensioni?.card || "1fr",
      extra: display.dimensioni?.extra || "1fr",
    },
    audio: {
      abilita: display.audio?.abilita ?? false,
      url: display.audio?.url || "",
      volume: display.audio?.volume ?? 1,
    },
    tema: {
      sfondo: display.tema?.sfondo || "#0f172a",
      testo: display.tema?.testo || "#f8fafc",
      card: display.tema?.card || "#1e293b",
      immagine_sfondo: display.tema?.immagine_sfondo || "",
    },
  };
}

function ensureKioskDefaults(kiosk = {}) {
  return {
    contenuti: {
      testo: kiosk.contenuti?.testo || "Prendi il tuo ticket",
      logo: kiosk.contenuti?.logo || "",
      posizione_testo: kiosk.contenuti?.posizione_testo || "sopra",
    },
    tema: {
      sfondo: kiosk.tema?.sfondo || "#f4f5f7",
      testo: kiosk.tema?.testo || "#1b1f24",
      bottone: kiosk.tema?.bottone || "#1f6feb",
      testo_bottone: kiosk.tema?.testo_bottone || "#ffffff",
      immagine_sfondo: kiosk.tema?.immagine_sfondo || "",
    },
    dimensioni: {
      bottone: kiosk.dimensioni?.bottone || "1rem",
      bottone_padding: kiosk.dimensioni?.bottone_padding || "8px 14px",
    },
  };
}

async function caricaConfig() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  configData = config;
  servizioInput.value = config.servizio || "";
  serviziInput.value = (config.servizi || []).join(", ");
  const operatori = config.operatori || [];
  numeroOperatoriSelect.value = String(operatori.length || 1);
  creaOperatoriInputs(operatori.length || 1, operatori);
  renderPriorita(config.servizi || [], config.priorita || {});
  renderPrefissi(config.servizi || [], config.prefissi || {});
}

numeroOperatoriSelect.addEventListener("change", () => {
  const numero = Number(numeroOperatoriSelect.value);
  creaOperatoriInputs(numero);
});

serviziInput.addEventListener("input", () => {
  const servizi = parseServizi();
  const priorita = {};
  prioritaContainer.querySelectorAll("select").forEach((select) => {
    priorita[select.dataset.servizio] = Number(select.value);
  });
  renderPriorita(servizi, priorita);
  const prefissi = {};
  prefissiContainer.querySelectorAll("input").forEach((input) => {
    prefissi[input.dataset.servizio] = input.value.trim();
  });
  renderPrefissi(servizi, prefissi);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const servizio = servizioInput.value.trim();
  const servizi = parseServizi();
  const priorita = {};
  prioritaContainer.querySelectorAll("select").forEach((select) => {
    priorita[select.dataset.servizio] = Number(select.value);
  });
  const prefissi = {};
  prefissiContainer.querySelectorAll("input").forEach((input) => {
    prefissi[input.dataset.servizio] = input.value.trim();
  });
  const display = ensureDisplayDefaults(configData?.display || {});
  const kiosk = ensureKioskDefaults(configData?.kiosk || {});
  const operatori = Array.from(operatoriContainer.querySelectorAll("input")).map((input) => ({
    nome: input.value.trim(),
  }));

  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ servizio, servizi, priorita, prefissi, display, kiosk, operatori }),
  });

  if (response.ok) {
    const data = await response.json();
    esitoAdmin.textContent = "Configurazione salvata.";
    esitoAdmin.className = "esito ok";
    configData = data.config;
  } else {
    esitoAdmin.textContent = "Errore nel salvataggio.";
    esitoAdmin.className = "esito error";
  }
});

caricaConfig();
