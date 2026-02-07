const windows = [
  document.getElementById("window-1"),
  document.getElementById("window-2"),
  document.getElementById("window-3"),
  document.getElementById("window-4"),
];
const popupEl = document.getElementById("display-popup");
const popupNumeroEl = document.getElementById("display-popup-numero");

let carouselIndex = 0;
let lastImages = [];
let lastPanels = [];
const STORAGE_KEY_LAST_CHIAMATA = "display-last-chiamata";
let lastChiamataKey = "";
let carouselOrder = [];
let carouselPosition = 0;
let lastCarouselInterval = 6000;
let lastCarouselRandom = false;
let carouselTimer = null;
let lastTickerTexts = [];
let popupTimer = null;
let hasLoadedOnce = false;
let refreshInFlight = false;
let audioConfig = { abilita: false, url: "", volume: 1 };
let audioPlayer = null;

function loadStoredAudioState() {
  if (!window.sessionStorage) {
    return;
  }
  const storedChiamata = window.sessionStorage.getItem(STORAGE_KEY_LAST_CHIAMATA);
  if (storedChiamata) {
    lastChiamataKey = storedChiamata;
  }
}

function saveStoredAudioState() {
  if (!window.sessionStorage) {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY_LAST_CHIAMATA, lastChiamataKey);
}

loadStoredAudioState();

function applyDisplayTheme(display) {
  const tema = display.tema || {};
  const fonts = display.fonts || {};
  const root = document.documentElement;
  root.style.setProperty("--display-bg", tema.sfondo || "#0f172a");
  root.style.setProperty("--display-text", tema.testo || "#f8fafc");
  root.style.setProperty("--display-text-font", fonts.testo_famiglia || "inherit");
  root.style.setProperty("--display-text-size", fonts.testo_dimensione || "1.2rem");
  root.style.setProperty("--display-number-font", fonts.numero_famiglia || "inherit");
  root.style.setProperty("--display-number-size", fonts.numero_dimensione || "4rem");
  if (tema.immagine_sfondo) {
    root.style.setProperty("--display-bg-image", `url('${tema.immagine_sfondo}')`);
  } else {
    root.style.setProperty("--display-bg-image", "none");
  }
}

function formatNumero(item) {
  if (!item || !item.numero) {
    return "—";
  }
  const prefisso = item.prefisso ? `${item.prefisso}` : "";
  return `${prefisso}${item.numero}`;
}

function buildChiamataKey(item) {
  if (!item) {
    return "";
  }
  if (item.chiamato_il) {
    return item.chiamato_il;
  }
  const prefisso = item.prefisso ? `${item.prefisso}` : "";
  const numero = item.numero ? `${item.numero}` : "";
  const servizio = item.servizio ? `${item.servizio}` : "";
  return `${prefisso}${numero}-${servizio}`;
}

function mostraPopup(item) {
  if (!popupEl || !popupNumeroEl || !item?.numero) {
    return;
  }
  popupNumeroEl.textContent = formatNumero(item);
  popupEl.classList.add("is-visible");
  if (popupTimer) {
    clearTimeout(popupTimer);
  }
  if (audioConfig.abilita && audioConfig.url) {
    if (!audioPlayer) {
      audioPlayer = new Audio();
    }
    if (audioPlayer.src !== audioConfig.url) {
      audioPlayer.src = audioConfig.url;
    }
    audioPlayer.volume = audioConfig.volume;
    audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => {});
  }
  popupTimer = setTimeout(() => {
    popupEl.classList.remove("is-visible");
  }, 4000);
}

function renderCarousel(container, immagini) {
  if (!immagini.length) {
    container.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.className = "display-placeholder";
    placeholder.textContent = "Nessuna immagine";
    container.appendChild(placeholder);
    return;
  }
  const existingImage = container.querySelector(".display-carousel img");
  if (existingImage && container.querySelector(".display-carousel")) {
    return;
  }
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "display-carousel";
  const img = document.createElement("img");
  img.alt = "Slide";
  const activeIndex = carouselOrder.length ? carouselOrder[carouselPosition] : 0;
  img.src = immagini[activeIndex % immagini.length];
  wrap.appendChild(img);
  container.appendChild(wrap);
}

function renderCurrent(container, corrente) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "display-current";
  const label = document.createElement("div");
  label.className = "display-current-label";
  const number = document.createElement("div");
  number.textContent = formatNumero(corrente);
  const operator = document.createElement("div");
  operator.className = "display-current-operator";
  operator.textContent = corrente?.operatore ? `Operatore: ${corrente.operatore}` : "Operatore: —";
  wrapper.appendChild(label);
  wrapper.appendChild(number);
  wrapper.appendChild(operator);
  container.appendChild(wrapper);
}

function renderHistory(container, storico, numeroUltimi) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "display-history";
  const title = document.createElement("h2");
  wrapper.appendChild(title);
  const list = document.createElement("ul");
  list.className = "display-history-list";
  const ultimi = storico.slice(-numeroUltimi).reverse();
  if (!ultimi.length) {
    const li = document.createElement("li");
    li.textContent = "Nessuna chiamata";
    list.appendChild(li);
  } else {
    ultimi.forEach((item) => {
      const li = document.createElement("li");
      const operatore = item?.operatore ? ` - ${item.operatore}` : "";
      li.textContent = `${formatNumero(item)}${operatore}`;
      list.appendChild(li);
    });
  }
  wrapper.appendChild(list);
  container.appendChild(wrapper);
}

function renderTicker(container, testo) {
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "display-ticker";
  const text = document.createElement("div");
  text.className = "display-ticker-text";
  const baseText = testo || "Benvenuti.";
  text.textContent = baseText;
  wrap.appendChild(text);
  container.appendChild(wrap);
}

function renderPlaceholder(container) {
  container.innerHTML = "";
  const placeholder = document.createElement("div");
  placeholder.className = "display-placeholder";
  placeholder.textContent = "Finestra non configurata";
  container.appendChild(placeholder);
}

function renderWindows(display, corrente, storico) {
  const panels = Array.isArray(display.finestre) ? display.finestre.slice(0, 4) : [];
  const defaultPanels = [
    { tipo: "carousel" },
    { tipo: "corrente" },
    { tipo: "storico" },
    { tipo: "ticker", testo: "" },
  ];
  while (panels.length < 4) {
    panels.push(defaultPanels[panels.length]);
  }

  ensureCarouselOrder(display.immagini || [], display.carousel || {});
  panels.forEach((panel, index) => {
    const container = windows[index];
    if (!container) {
      return;
    }
    const tipo = panel.tipo || defaultPanels[index].tipo;
    if (tipo === "carousel") {
      const immagini = display.immagini || [];
      const sameImages =
        immagini.length === lastImages.length &&
        immagini.every((img, imageIndex) => img === lastImages[imageIndex]);
      if (!sameImages) {
        container.innerHTML = "";
      }
      renderCarousel(container, immagini);
    } else if (tipo === "corrente") {
      renderCurrent(container, corrente);
    } else if (tipo === "storico") {
      const numeroUltimi = Math.min(Number(display.numero_ultimi || 5), 10);
      renderHistory(container, storico || [], numeroUltimi);
    } else if (tipo === "ticker") {
      const testo = panel.testo || "";
      if (lastTickerTexts[index] !== testo) {
        renderTicker(container, testo);
        lastTickerTexts[index] = testo;
      }
    } else {
      renderPlaceholder(container);
    }
  });
  lastPanels = panels.map((panel, index) => panel.tipo || defaultPanels[index].tipo);
}

function ensureCarouselOrder(immagini, carouselConfig) {
  const randomEnabled = Boolean(carouselConfig?.casuale);
  if (!immagini.length) {
    carouselOrder = [];
    carouselPosition = 0;
    return;
  }
  const needsRebuild =
    carouselOrder.length !== immagini.length || randomEnabled !== lastCarouselRandom;
  if (needsRebuild) {
    carouselOrder = immagini.map((_, index) => index);
    if (randomEnabled) {
      for (let i = carouselOrder.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [carouselOrder[i], carouselOrder[j]] = [carouselOrder[j], carouselOrder[i]];
      }
    }
    carouselPosition = 0;
  }
  lastCarouselRandom = randomEnabled;
}

function scheduleCarousel(intervalMs) {
  if (carouselTimer) {
    clearInterval(carouselTimer);
  }
  carouselTimer = setInterval(rotateCarousel, intervalMs);
}

async function refreshDisplay() {
  if (refreshInFlight) {
    return;
  }
  refreshInFlight = true;
  const response = await fetch("/api/display");
  try {
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const display = data.display || {};
    applyDisplayTheme(display);
    const newAudio = display.audio || {};
    audioConfig = {
      abilita: Boolean(newAudio.abilita),
      url: newAudio.url || "",
      volume: typeof newAudio.volume === "number" ? newAudio.volume : 1,
    };
    renderWindows(display, data.corrente, data.storico || []);
    const storico = data.storico || [];
    const lastItem = storico.length ? storico[storico.length - 1] : null;
    const current = data.corrente;
    const chiamataKey = buildChiamataKey(lastItem);
    if (!hasLoadedOnce) {
      if (!lastChiamataKey) {
        lastChiamataKey = chiamataKey;
      }
      saveStoredAudioState();
      hasLoadedOnce = true;
    } else if (chiamataKey && chiamataKey !== lastChiamataKey) {
      lastChiamataKey = chiamataKey;
      saveStoredAudioState();
      mostraPopup(lastItem);
    }
    const immagini = display.immagini || [];
    const carouselConfig = display.carousel || {};
    const intervalMs = Math.max(Number(carouselConfig.intervallo_ms || 6000), 1000);
    if (intervalMs !== lastCarouselInterval) {
      lastCarouselInterval = intervalMs;
      scheduleCarousel(intervalMs);
    }
    const sameImages =
      immagini.length === lastImages.length &&
      immagini.every((img, index) => img === lastImages[index]);
    if (!sameImages) {
      lastImages = immagini.slice();
      carouselIndex = 0;
      carouselPosition = 0;
      carouselOrder = [];
    }
    ensureCarouselOrder(immagini, carouselConfig);
  } finally {
    refreshInFlight = false;
  }
}

function rotateCarousel() {
  carouselIndex += 1;
  if (carouselOrder.length) {
    carouselPosition = (carouselPosition + 1) % carouselOrder.length;
  }
  windows.forEach((container, index) => {
    if (!container) {
      return;
    }
    const tipo = Array.isArray(lastPanels) ? lastPanels[index] : null;
    if (tipo !== "carousel") {
      return;
    }
    const img = container.querySelector("img");
    if (!img) {
      return;
    }
    if (!lastImages.length) {
      return;
    }
    const activeIndex = carouselOrder.length ? carouselOrder[carouselPosition] : 0;
    img.src = lastImages[activeIndex % lastImages.length];
  });
}

refreshDisplay();
setInterval(refreshDisplay, 2000);
scheduleCarousel(lastCarouselInterval);
