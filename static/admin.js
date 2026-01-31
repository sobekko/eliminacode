const form = document.getElementById("form-admin");
const servizioInput = document.getElementById("servizio");
const serviziInput = document.getElementById("servizi");
const prioritaContainer = document.getElementById("priorita-container");
const prefissiContainer = document.getElementById("prefissi-container");
const displayUltimi = document.getElementById("display-ultimi");
const displayNumeroUltimi = document.getElementById("display-numero-ultimi");
const displayLayout = document.getElementById("display-layout");
const displayNumeroSize = document.getElementById("display-numero-size");
const displayCardSize = document.getElementById("display-card-size");
const displayExtraSize = document.getElementById("display-extra-size");
const displaySfondo = document.getElementById("display-sfondo");
const displayTesto = document.getElementById("display-testo");
const displayCard = document.getElementById("display-card");
const displayLogo = document.getElementById("display-logo");
const displayLogoFile = document.getElementById("display-logo-file");
const displaySfondoImg = document.getElementById("display-sfondo-img");
const displaySfondoFile = document.getElementById("display-sfondo-file");
const displayImmagini = document.getElementById("display-immagini");
const displayImmaginiFile = document.getElementById("display-immagini-file");
const kioskSfondo = document.getElementById("kiosk-sfondo");
const kioskTesto = document.getElementById("kiosk-testo");
const kioskBottone = document.getElementById("kiosk-bottone");
const kioskTestoBottone = document.getElementById("kiosk-testo-bottone");
const kioskBottoneSize = document.getElementById("kiosk-bottone-size");
const kioskBottonePadding = document.getElementById("kiosk-bottone-padding");
const kioskSfondoImg = document.getElementById("kiosk-sfondo-img");
const kioskSfondoFile = document.getElementById("kiosk-sfondo-file");
const numeroOperatoriSelect = document.getElementById("numero-operatori");
const operatoriContainer = document.getElementById("operatori-container");
const esitoAdmin = document.getElementById("esito-admin");

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

function readFileAsDataUrl(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

displayLogoFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  readFileAsDataUrl(file, (dataUrl) => {
    displayLogo.value = dataUrl;
  });
});

displaySfondoFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  readFileAsDataUrl(file, (dataUrl) => {
    displaySfondoImg.value = dataUrl;
  });
});

displayImmaginiFile.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);
  if (!files.length) {
    return;
  }
  const results = [];
  files.forEach((file) => {
    readFileAsDataUrl(file, (dataUrl) => {
      results.push(dataUrl);
      if (results.length === files.length) {
        displayImmagini.value = results.join(", ");
      }
    });
  });
});

kioskSfondoFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  readFileAsDataUrl(file, (dataUrl) => {
    kioskSfondoImg.value = dataUrl;
  });
});

async function caricaConfig() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  servizioInput.value = config.servizio || "";
  serviziInput.value = (config.servizi || []).join(", ");
  const operatori = config.operatori || [];
  numeroOperatoriSelect.value = String(operatori.length || 1);
  creaOperatoriInputs(operatori.length || 1, operatori);
  renderPriorita(config.servizi || [], config.priorita || {});
  renderPrefissi(config.servizi || [], config.prefissi || {});
  const display = config.display || {};
  displayUltimi.checked = Boolean(display.mostra_ultimi);
  displayNumeroUltimi.value = String(display.numero_ultimi ?? 5);
  displayLayout.value = display.layout || "split";
  const dimensioniDisplay = display.dimensioni || {};
  displayNumeroSize.value = dimensioniDisplay.numero || "5rem";
  displayCardSize.value = dimensioniDisplay.card || "1fr";
  displayExtraSize.value = dimensioniDisplay.extra || "1fr";
  const temaDisplay = display.tema || {};
  displaySfondo.value = temaDisplay.sfondo || "#0f172a";
  displayTesto.value = temaDisplay.testo || "#f8fafc";
  displayCard.value = temaDisplay.card || "#1e293b";
  displaySfondoImg.value = temaDisplay.immagine_sfondo || "";
  displayLogo.value = display.logo || "";
  displayImmagini.value = (display.immagini || []).join(", ");
  const kiosk = config.kiosk || {};
  const temaKiosk = kiosk.tema || {};
  kioskSfondo.value = temaKiosk.sfondo || "#f4f5f7";
  kioskTesto.value = temaKiosk.testo || "#1b1f24";
  kioskBottone.value = temaKiosk.bottone || "#1f6feb";
  kioskTestoBottone.value = temaKiosk.testo_bottone || "#ffffff";
  kioskSfondoImg.value = temaKiosk.immagine_sfondo || "";
  const dimensioniKiosk = kiosk.dimensioni || {};
  kioskBottoneSize.value = dimensioniKiosk.bottone || "1rem";
  kioskBottonePadding.value = dimensioniKiosk.bottone_padding || "8px 14px";
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
  const display = {
    mostra_ultimi: displayUltimi.checked,
    numero_ultimi: Number(displayNumeroUltimi.value || 5),
    layout: displayLayout.value,
    logo: displayLogo.value.trim(),
    immagini: displayImmagini.value
      .split(",")
      .map((voce) => voce.trim())
      .filter(Boolean),
    dimensioni: {
      numero: displayNumeroSize.value.trim() || "5rem",
      card: displayCardSize.value.trim() || "1fr",
      extra: displayExtraSize.value.trim() || "1fr",
    },
    tema: {
      sfondo: displaySfondo.value,
      testo: displayTesto.value,
      card: displayCard.value,
      immagine_sfondo: displaySfondoImg.value.trim(),
    },
  };
  const kiosk = {
    tema: {
      sfondo: kioskSfondo.value,
      testo: kioskTesto.value,
      bottone: kioskBottone.value,
      testo_bottone: kioskTestoBottone.value,
      immagine_sfondo: kioskSfondoImg.value.trim(),
    },
    dimensioni: {
      bottone: kioskBottoneSize.value.trim() || "1rem",
      bottone_padding: kioskBottonePadding.value.trim() || "8px 14px",
    },
  };
  const operatori = Array.from(operatoriContainer.querySelectorAll("input")).map((input) => ({
    nome: input.value.trim(),
  }));

  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ servizio, servizi, priorita, prefissi, display, kiosk, operatori }),
  });

  if (response.ok) {
    esitoAdmin.textContent = "Configurazione salvata.";
    esitoAdmin.className = "esito ok";
  } else {
    esitoAdmin.textContent = "Errore nel salvataggio.";
    esitoAdmin.className = "esito error";
  }
});

caricaConfig();
