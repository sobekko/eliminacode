const form = document.getElementById("form-display");
const displayNumeroUltimi = document.getElementById("display-numero-ultimi");
const displayFontText = document.getElementById("display-font-text");
const displayFontTextSize = document.getElementById("display-font-text-size");
const displayFontNumber = document.getElementById("display-font-number");
const displayFontNumberSize = document.getElementById("display-font-number-size");
const displaySfondo = document.getElementById("display-sfondo");
const displayTesto = document.getElementById("display-testo");
const displaySfondoImg = document.getElementById("display-sfondo-img");
const displaySfondoFile = document.getElementById("display-sfondo-file");
const displayImmagini = document.getElementById("display-immagini");
const displayCarouselInterval = document.getElementById("display-carousel-interval");
const displayCarouselRandom = document.getElementById("display-carousel-random");
const displayImmaginiFile = document.getElementById("display-immagini-file");
const displayImageUpload = document.getElementById("display-image-upload");
const displayImageLibrary = document.getElementById("display-image-library");
const displayImageAdd = document.getElementById("display-image-add");
const displayBgLibrary = document.getElementById("display-bg-library");
const displayBgApply = document.getElementById("display-bg-apply");
const displayAudioEnabled = document.getElementById("display-audio-enabled");
const displayAudioUrl = document.getElementById("display-audio-url");
const displayAudioUpload = document.getElementById("display-audio-upload");
const displayAudioLibrary = document.getElementById("display-audio-library");
const displayAudioApply = document.getElementById("display-audio-apply");
const displayAudioVolume = document.getElementById("display-audio-volume");
const displayWindowsContainer = document.getElementById("display-windows");
const esitoDisplay = document.getElementById("esito-display");
let configData = null;

const windowDefaults = [
  { tipo: "carousel" },
  { tipo: "corrente" },
  { tipo: "storico" },
  { tipo: "ticker", testo: "Benvenuti." },
];

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
    numero_ultimi: display.numero_ultimi ?? 5,
    immagini: display.immagini || [],
    carousel: {
      intervallo_ms: display.carousel?.intervallo_ms ?? 6000,
      casuale: display.carousel?.casuale ?? false,
    },
    finestre: Array.isArray(display.finestre) ? display.finestre : windowDefaults,
    fonts: {
      testo_famiglia: display.fonts?.testo_famiglia || "inherit",
      testo_dimensione: display.fonts?.testo_dimensione || "1.2rem",
      numero_famiglia: display.fonts?.numero_famiglia || "inherit",
      numero_dimensione: display.fonts?.numero_dimensione || "4rem",
    },
    tema: {
      sfondo: display.tema?.sfondo || "#0f172a",
      testo: display.tema?.testo || "#f8fafc",
      immagine_sfondo: display.tema?.immagine_sfondo || "",
    },
    audio: {
      abilita: display.audio?.abilita ?? false,
      url: display.audio?.url || "",
      volume: display.audio?.volume ?? 1,
    },
  };
}

function renderWindows(panels) {
  displayWindowsContainer.innerHTML = "";
  panels.slice(0, 4).forEach((panel, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "priorita-row";

    const label = document.createElement("span");
    label.textContent = `Finestra ${index + 1}`;

    const typeSelect = document.createElement("select");
    typeSelect.dataset.index = String(index);
    [
      { value: "carousel", label: "Immagini che scorrono" },
      { value: "corrente", label: "Ultimo numero chiamato" },
      { value: "storico", label: "Ultimi numeri chiamati" },
      { value: "ticker", label: "Testo scorrevole" },
    ].forEach((optionData) => {
      const option = document.createElement("option");
      option.value = optionData.value;
      option.textContent = optionData.label;
      if (optionData.value === panel.tipo) {
        option.selected = true;
      }
      typeSelect.appendChild(option);
    });

    const tickerInput = document.createElement("textarea");
    tickerInput.rows = 2;
    tickerInput.dataset.index = String(index);
    tickerInput.dataset.field = "testo";
    tickerInput.placeholder = "Testo scorrevole";
    tickerInput.value = panel.testo || "";

    wrapper.appendChild(label);
    wrapper.appendChild(typeSelect);
    wrapper.appendChild(tickerInput);
    displayWindowsContainer.appendChild(wrapper);

    const updateVisibility = () => {
      tickerInput.style.display = typeSelect.value === "ticker" ? "block" : "none";
    };
    typeSelect.addEventListener("change", updateVisibility);
    updateVisibility();
  });
}

function collectWindows() {
  const panels = [];
  const rows = displayWindowsContainer.querySelectorAll(".priorita-row");
  rows.forEach((row, index) => {
    const typeSelect = row.querySelector("select");
    const tickerInput = row.querySelector("textarea[data-field='testo']");
    const tipo = typeSelect?.value || windowDefaults[index].tipo;
    const panel = { tipo };
    if (tipo === "ticker") {
      panel.testo = tickerInput?.value.trim() || "";
    }
    panels.push(panel);
  });
  return panels;
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
  const panels = display.finestre.slice(0, 4);
  while (panels.length < 4) {
    panels.push(windowDefaults[panels.length]);
  }
  renderWindows(panels);
  displayNumeroUltimi.value = String(display.numero_ultimi ?? 5);
  displayFontText.value = display.fonts.testo_famiglia || "inherit";
  displayFontTextSize.value = display.fonts.testo_dimensione || "1.2rem";
  displayFontNumber.value = display.fonts.numero_famiglia || "inherit";
  displayFontNumberSize.value = display.fonts.numero_dimensione || "4rem";
  displaySfondo.value = display.tema.sfondo || "#0f172a";
  displayTesto.value = display.tema.testo || "#f8fafc";
  displaySfondoImg.value = display.tema.immagine_sfondo || "";
  displayImmagini.value = (display.immagini || []).join(", ");
  displayCarouselInterval.value = String(Math.round((display.carousel?.intervallo_ms ?? 6000) / 1000));
  displayCarouselRandom.checked = Boolean(display.carousel?.casuale);
  displayAudioEnabled.checked = Boolean(display.audio.abilita);
  displayAudioUrl.value = display.audio.url || "";
  displayAudioVolume.value = String(display.audio.volume ?? 1);
}

async function aggiornaLibrerie() {
  const immagini = await caricaUpload("image");
  fillSelect(displayImageLibrary, immagini);
  fillSelect(displayBgLibrary, immagini);
  const audio = await caricaUpload("audio");
  fillSelect(displayAudioLibrary, audio);
}

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

displayBgApply.addEventListener("click", () => {
  if (!displayBgLibrary.value) {
    return;
  }
  displaySfondoImg.value = displayBgLibrary.value;
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

displayAudioApply.addEventListener("click", () => {
  if (!displayAudioLibrary.value) {
    return;
  }
  displayAudioUrl.value = displayAudioLibrary.value;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configData?.servizio || !configData?.servizi?.length || !configData?.operatori?.length) {
    setEsito("Completa prima la configurazione base nell'admin.", "error");
    return;
  }
  const display = {
    numero_ultimi: Math.min(Number(displayNumeroUltimi.value || 5), 10),
    immagini: displayImmagini.value
      .split(",")
      .map((voce) => voce.trim())
      .filter(Boolean),
    carousel: {
      intervallo_ms: Math.max(Number(displayCarouselInterval.value || 6), 1) * 1000,
      casuale: displayCarouselRandom.checked,
    },
    finestre: collectWindows(),
    fonts: {
      testo_famiglia: displayFontText.value.trim() || "inherit",
      testo_dimensione: displayFontTextSize.value.trim() || "1.2rem",
      numero_famiglia: displayFontNumber.value.trim() || "inherit",
      numero_dimensione: displayFontNumberSize.value.trim() || "4rem",
    },
    tema: {
      sfondo: displaySfondo.value,
      testo: displayTesto.value,
      immagine_sfondo: displaySfondoImg.value.trim(),
    },
    audio: {
      abilita: displayAudioEnabled.checked,
      url: displayAudioUrl.value.trim(),
      volume: Number(displayAudioVolume.value || 1),
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
      descrizioni: configData.descrizioni || {},
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
