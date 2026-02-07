const windows = [
  document.getElementById("window-1"),
  document.getElementById("window-2"),
  document.getElementById("window-3"),
  document.getElementById("window-4"),
];

let carouselIndex = 0;
let lastImages = [];
let lastPanels = [];

function applyDisplayTheme(display) {
  const tema = display.tema || {};
  const root = document.documentElement;
  root.style.setProperty("--display-bg", tema.sfondo || "#0f172a");
  root.style.setProperty("--display-text", tema.testo || "#f8fafc");
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

function renderCarousel(container, immagini) {
  container.innerHTML = "";
  if (!immagini.length) {
    const placeholder = document.createElement("div");
    placeholder.className = "display-placeholder";
    placeholder.textContent = "Nessuna immagine";
    container.appendChild(placeholder);
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "display-carousel";
  const img = document.createElement("img");
  img.alt = "Slide";
  img.src = immagini[carouselIndex % immagini.length];
  wrap.appendChild(img);
  container.appendChild(wrap);
}

function renderCurrent(container, corrente) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "display-current";
  const label = document.createElement("div");
  label.className = "display-current-label";
  label.textContent = "Ultimo numero";
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
  title.textContent = "Ultimi numeri";
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
  const repeated = `${baseText} \u2022 ${baseText} \u2022 ${baseText}`;
  text.textContent = repeated;
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

  panels.forEach((panel, index) => {
    const container = windows[index];
    if (!container) {
      return;
    }
    const tipo = panel.tipo || defaultPanels[index].tipo;
    if (tipo === "carousel") {
      renderCarousel(container, display.immagini || []);
    } else if (tipo === "corrente") {
      renderCurrent(container, corrente);
    } else if (tipo === "storico") {
      const numeroUltimi = Math.min(Number(display.numero_ultimi || 5), 10);
      renderHistory(container, storico || [], numeroUltimi);
    } else if (tipo === "ticker") {
      renderTicker(container, panel.testo || "");
    } else {
      renderPlaceholder(container);
    }
  });
  lastPanels = panels.map((panel, index) => panel.tipo || defaultPanels[index].tipo);
}

async function refreshDisplay() {
  const response = await fetch("/api/display");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  const display = data.display || {};
  applyDisplayTheme(display);
  renderWindows(display, data.corrente, data.storico || []);
  const immagini = display.immagini || [];
  const sameImages =
    immagini.length === lastImages.length &&
    immagini.every((img, index) => img === lastImages[index]);
  if (!sameImages) {
    lastImages = immagini.slice();
    carouselIndex = 0;
  }
}

function rotateCarousel() {
  carouselIndex += 1;
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
    img.src = lastImages[carouselIndex % lastImages.length];
  });
}

refreshDisplay();
setInterval(refreshDisplay, 2000);
setInterval(rotateCarousel, 6000);
