const form = document.getElementById("form-display");
const displayTitle = document.getElementById("display-title");
const displaySubtitle = document.getElementById("display-subtitle");
const displayCardTitle = document.getElementById("display-card-title");
const displayShowServizio = document.getElementById("display-show-servizio");
const displayShowOperatore = document.getElementById("display-show-operatore");
const displayShowCard = document.getElementById("display-show-card");
const displayNumberPosition = document.getElementById("display-number-position");
const displayUltimi = document.getElementById("display-ultimi");
const displayNumeroUltimi = document.getElementById("display-numero-ultimi");
const displayLayout = document.getElementById("display-layout");
const displayExtraColumns = document.getElementById("display-extra-columns");
const displayPanelsCount = document.getElementById("display-panels-count");
const displayPanelsContainer = document.getElementById("display-panels");
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
const displayImageUpload = document.getElementById("display-image-upload");
const displayImageLibrary = document.getElementById("display-image-library");
const displayImageAdd = document.getElementById("display-image-add");
const displayLogoLibrary = document.getElementById("display-logo-library");
const displayLogoApply = document.getElementById("display-logo-apply");
const displayBgLibrary = document.getElementById("display-bg-library");
const displayBgApply = document.getElementById("display-bg-apply");
const displayAudioEnabled = document.getElementById("display-audio-enabled");
const displayAudioUrl = document.getElementById("display-audio-url");
const displayAudioVolume = document.getElementById("display-audio-volume");
const displayAudioUpload = document.getElementById("display-audio-upload");
const displayAudioLibrary = document.getElementById("display-audio-library");
const displayAudioApply = document.getElementById("display-audio-apply");
const esitoDisplay = document.getElementById("esito-display");
let configData = null;

function readFileAsDataUrl(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

async function uploadFile(file, tipo) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/upload?type=${tipo}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Upload fallito");
  }
  return response.json();
}

function fillSelect(select, files) {
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Seleziona...";
  select.appendChild(empty);
  files.forEach((file) => {
    const option = document.createElement("option");
    option.value = file.url;
    option.textContent = file.name;
    select.appendChild(option);
  });
}

async function caricaUpload(tipo) {
  const response = await fetch(`/api/uploads?type=${tipo}`);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.files || [];
}

function ensureDisplayDefaults(display = {}) {
  return {
    mostra_ultimi: display.mostra_ultimi ?? true,
    numero_ultimi: display.numero_ultimi ?? 5,
    layout: display.layout || "split",
    colonne_extra: display.colonne_extra ?? 2,
    logo: display.logo || "",
    immagini: display.immagini || [],
    contenuti: {
      titolo: display.contenuti?.titolo || "Chiamata in corso",
      sottotitolo: display.contenuti?.sottotitolo || "",
      titolo_card: display.contenuti?.titolo_card || "",
      mostra_servizio: display.contenuti?.mostra_servizio ?? true,
      mostra_operatore: display.contenuti?.mostra_operatore ?? true,
      mostra_card: display.contenuti?.mostra_card ?? true,
      posizione_numero: display.contenuti?.posizione_numero || "card",
    },
    finestre: Array.isArray(display.finestre)
      ? display.finestre
      : [
          { tipo: "storico", titolo: "Ultimi chiamati" },
          { tipo: "carousel", titolo: "" },
          { tipo: "testo", titolo: "Info", testo: "" },
          { tipo: "testo", titolo: "Messaggi", testo: "" },
        ],
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

function renderPanels(panels) {
  displayPanelsContainer.innerHTML = "";
  panels.forEach((panel, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "priorita-row";

    const label = document.createElement("span");
    label.textContent = `Finestra ${index + 1}`;

    const typeSelect = document.createElement("select");
    typeSelect.dataset.index = String(index);
    [
      { value: "storico", label: "Storico chiamate" },
      { value: "carousel", label: "Carousel immagini" },
      { value: "testo", label: "Testo libero" },
      { value: "ticker", label: "Testo scorrevole" },
      { value: "corrente", label: "Numero chiamato" },
      { value: "custom", label: "HTML personalizzato" },
    ].forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      if (optionData.value === panel.tipo) {
        option.selected = true;
      }
      typeSelect.appendChild(option);
    });

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.dataset.index = String(index);
    titleInput.dataset.field = "titolo";
    titleInput.placeholder = "Titolo finestra";
    titleInput.value = panel.titolo || "";

    const textArea = document.createElement("textarea");
    textArea.rows = 2;
    textArea.dataset.index = String(index);
    textArea.dataset.field = "testo";
    textArea.placeholder = "Testo mostrato nella finestra";
    textArea.value = panel.testo || "";

    const htmlArea = document.createElement("textarea");
    htmlArea.rows = 3;
    htmlArea.dataset.index = String(index);
    htmlArea.dataset.field = "html";
    htmlArea.placeholder = "HTML personalizzato (attenzione: verrà inserito come HTML)";
    htmlArea.value = panel.html || "";

    wrapper.appendChild(label);
    wrapper.appendChild(typeSelect);
    wrapper.appendChild(titleInput);
    wrapper.appendChild(textArea);
    wrapper.appendChild(htmlArea);

    displayPanelsContainer.appendChild(wrapper);

    const updateVisibility = () => {
      textArea.style.display = ["testo", "ticker"].includes(typeSelect.value) ? "block" : "none";
      htmlArea.style.display = typeSelect.value === "custom" ? "block" : "none";
    };
    typeSelect.addEventListener("change", updateVisibility);
    updateVisibility();
  });
}

function collectPanels() {
  const panels = [];
  const rows = displayPanelsContainer.querySelectorAll(".priorita-row");
  rows.forEach((row) => {
    const typeSelect = row.querySelector("select");
    const titleInput = row.querySelector("input[data-field='titolo']");
    const textArea = row.querySelector("textarea[data-field='testo']");
    const htmlArea = row.querySelector("textarea[data-field='html']");
    const panel = {
      tipo: typeSelect?.value || "storico",
      titolo: titleInput?.value.trim() || "",
    };
    if (panel.tipo === "testo" || panel.tipo === "ticker") {
      panel.testo = textArea?.value.trim() || "";
    }
    if (panel.tipo === "custom") {
      panel.html = htmlArea?.value.trim() || "";
    }
    panels.push(panel);
  });
  return panels;
}

function applyNumeroPosition(panels) {
  const posizione = displayNumberPosition.value || "card";
  if (posizione === "card") {
    return panels;
  }
  const slotIndex = Number(posizione.split("-")[1] || 0) - 1;
  if (slotIndex < 0 || slotIndex >= panels.length) {
    return panels;
  }
  const updated = panels.map((panel, index) =>
    index === slotIndex ? { ...panel, tipo: "corrente" } : panel
  );
  return updated;
}

function setEsito(message, status) {
  esitoDisplay.textContent = message;
  esitoDisplay.className = `esito ${status}`;
}

async function caricaConfig() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  configData = config;
  const display = ensureDisplayDefaults(config.display || {});
  const finestre = display.finestre.slice(0, 4);
  let posizioneNumero = display.contenuti.posizione_numero || "card";
  const correnteIndex = finestre.findIndex((panel) => panel.tipo === "corrente");
  if (correnteIndex >= 0 && posizioneNumero === "card") {
    posizioneNumero = `slot-${correnteIndex + 1}`;
  }
  displayTitle.value = display.contenuti.titolo || "";
  displaySubtitle.value = display.contenuti.sottotitolo || "";
  displayCardTitle.value = display.contenuti.titolo_card || "";
  displayShowServizio.checked = Boolean(display.contenuti.mostra_servizio);
  displayShowOperatore.checked = Boolean(display.contenuti.mostra_operatore);
  displayShowCard.checked = Boolean(display.contenuti.mostra_card);
  displayNumberPosition.value = posizioneNumero;
  displayUltimi.checked = Boolean(display.mostra_ultimi);
  displayNumeroUltimi.value = String(display.numero_ultimi ?? 5);
  displayLayout.value = display.layout || "split";
  displayExtraColumns.value = String(display.colonne_extra ?? 2);
  displayPanelsCount.value = String(finestre.length);
  renderPanels(finestre);
  displayNumeroSize.value = display.dimensioni.numero || "5rem";
  displayCardSize.value = display.dimensioni.card || "1fr";
  displayExtraSize.value = display.dimensioni.extra || "1fr";
  displaySfondo.value = display.tema.sfondo || "#0f172a";
  displayTesto.value = display.tema.testo || "#f8fafc";
  displayCard.value = display.tema.card || "#1e293b";
  displaySfondoImg.value = display.tema.immagine_sfondo || "";
  displayLogo.value = display.logo || "";
  displayImmagini.value = (display.immagini || []).join(", ");
  displayAudioEnabled.checked = Boolean(display.audio.abilita);
  displayAudioUrl.value = display.audio.url || "";
  displayAudioVolume.value = String(display.audio.volume ?? 1);
}

async function aggiornaLibrerie() {
  const immagini = await caricaUpload("image");
  fillSelect(displayImageLibrary, immagini);
  fillSelect(displayLogoLibrary, immagini);
  fillSelect(displayBgLibrary, immagini);
  const audio = await caricaUpload("audio");
  fillSelect(displayAudioLibrary, audio);
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

displayImageUpload.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files);
  if (!files.length) {
    return;
  }
  for (const file of files) {
    try {
      await uploadFile(file, "image");
    } catch (error) {
      setEsito("Errore upload immagini.", "error");
      return;
    }
  }
  await aggiornaLibrerie();
});

displayAudioUpload.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  try {
    await uploadFile(file, "audio");
  } catch (error) {
    setEsito("Errore upload audio.", "error");
    return;
  }
  await aggiornaLibrerie();
});

displayImageAdd.addEventListener("click", () => {
  if (!displayImageLibrary.value) {
    return;
  }
  const current = displayImmagini.value
    .split(",")
    .map((voce) => voce.trim())
    .filter(Boolean);
  if (!current.includes(displayImageLibrary.value)) {
    current.push(displayImageLibrary.value);
  }
  displayImmagini.value = current.join(", ");
});

displayLogoApply.addEventListener("click", () => {
  if (!displayLogoLibrary.value) {
    return;
  }
  displayLogo.value = displayLogoLibrary.value;
});

displayBgApply.addEventListener("click", () => {
  if (!displayBgLibrary.value) {
    return;
  }
  displaySfondoImg.value = displayBgLibrary.value;
});

displayAudioApply.addEventListener("click", () => {
  if (!displayAudioLibrary.value) {
    return;
  }
  displayAudioUrl.value = displayAudioLibrary.value;
});

displayPanelsCount.addEventListener("change", () => {
  const count = Number(displayPanelsCount.value || 0);
  const panels = collectPanels();
  while (panels.length < count) {
    panels.push({ tipo: "storico", titolo: "" });
  }
  panels.length = count;
  renderPanels(panels);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configData?.servizio || !configData?.servizi?.length || !configData?.operatori?.length) {
    setEsito("Completa prima la configurazione base nell'admin.", "error");
    return;
  }
  const display = {
    contenuti: {
      titolo: displayTitle.value.trim(),
      sottotitolo: displaySubtitle.value.trim(),
      titolo_card: displayCardTitle.value.trim(),
      mostra_servizio: displayShowServizio.checked,
      mostra_operatore: displayShowOperatore.checked,
      mostra_card: displayShowCard.checked,
      posizione_numero: displayNumberPosition.value,
    },
    mostra_ultimi: displayUltimi.checked,
    numero_ultimi: Number(displayNumeroUltimi.value || 5),
    layout: displayLayout.value,
    colonne_extra: Number(displayExtraColumns.value || 2),
    logo: displayLogo.value.trim(),
    immagini: displayImmagini.value
      .split(",")
      .map((voce) => voce.trim())
      .filter(Boolean),
    finestre: applyNumeroPosition(collectPanels()),
    dimensioni: {
      numero: displayNumeroSize.value.trim() || "5rem",
      card: displayCardSize.value.trim() || "1fr",
      extra: displayExtraSize.value.trim() || "1fr",
    },
    audio: {
      abilita: displayAudioEnabled.checked,
      url: displayAudioUrl.value.trim(),
      volume: Number(displayAudioVolume.value || 1),
    },
    tema: {
      sfondo: displaySfondo.value,
      testo: displayTesto.value,
      card: displayCard.value,
      immagine_sfondo: displaySfondoImg.value.trim(),
    },
  };

  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      servizio: configData.servizio,
      servizi: configData.servizi,
      priorita: configData.priorita || {},
      prefissi: configData.prefissi || {},
      display,
      kiosk: configData.kiosk || {},
      operatori: configData.operatori || [],
    }),
  });

  if (response.ok) {
    const data = await response.json();
    configData = data.config;
    setEsito("Configurazione display salvata.", "ok");
  } else {
    setEsito("Errore nel salvataggio.", "error");
  }
});

caricaConfig();
aggiornaLibrerie();
