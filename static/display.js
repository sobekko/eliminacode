const numeroEl = document.getElementById("display-numero");
const servizioEl = document.getElementById("display-servizio");
const operatoreEl = document.getElementById("display-operatore");
const logoEl = document.getElementById("display-logo");
const cardEl = document.getElementById("display-card");
const titleEl = document.getElementById("display-title");
const subtitleEl = document.getElementById("display-subtitle");
const cardTitleEl = document.getElementById("display-card-title");
const extraContainer = document.getElementById("display-extra");
const popupEl = document.getElementById("display-popup");
const popupNumeroEl = document.getElementById("display-popup-numero");

let immagini = [];
let indiceImmagine = 0;
let ultimaChiamataKey = "";
let popupTimer = null;
let audioConfig = { abilita: false, url: "", volume: 1 };
let audioPlayer = null;
let lastPanelsSignature = "";
let storicoEl = null;
let immagineEl = null;

function applyDisplayTheme(display) {
  const tema = display.tema || {};
  const root = document.documentElement;
  root.style.setProperty("--display-bg", tema.sfondo || "#0f172a");
  root.style.setProperty("--display-text", tema.testo || "#f8fafc");
  root.style.setProperty("--display-card", tema.card || "#1e293b");
  const dimensioni = display.dimensioni || {};
  root.style.setProperty("--display-numero-size", dimensioni.numero || "5rem");
  root.style.setProperty("--display-card-size", dimensioni.card || "1fr");
  root.style.setProperty("--display-extra-size", dimensioni.extra || "1fr");
  const colonne = display.colonne_extra || 2;
  root.style.setProperty("--display-extra-columns", String(colonne));
  if (extraContainer) {
    if (colonne === 2) {
      extraContainer.style.gridTemplateColumns = `${dimensioni.card || "1fr"} ${
        dimensioni.extra || "1fr"
      }`;
    } else {
      extraContainer.style.gridTemplateColumns = `repeat(${colonne}, minmax(0, 1fr))`;
    }
  }
  if (tema.immagine_sfondo) {
    root.style.setProperty("--display-bg-image", `url('${tema.immagine_sfondo}')`);
  } else {
    root.style.setProperty("--display-bg-image", "none");
  }
  document.body.classList.toggle("layout-stacked", display.layout === "stacked");
}

function renderDisplay(corrente) {
  if (!corrente) {
    numeroEl.textContent = "—";
    servizioEl.textContent = "In attesa di chiamata";
    operatoreEl.textContent = "";
    return;
  }
  const prefisso = corrente.prefisso ? `${corrente.prefisso}` : "";
  numeroEl.textContent = `#${prefisso}${corrente.numero}`;
  servizioEl.textContent = corrente.servizio ? `Servizio: ${corrente.servizio}` : "Servizio: -";
  operatoreEl.textContent = corrente.operatore
    ? `Operatore: ${corrente.operatore}`
    : "Operatore: -";
}

function renderCurrentPanel(panel, corrente) {
  const section = document.createElement("div");
  section.className = "display-current-panel";
  if (panel.titolo) {
    section.appendChild(createPanelTitle(panel.titolo));
  }
  const number = document.createElement("div");
  number.className = "display-numero";
  if (corrente) {
    const prefisso = corrente.prefisso ? `${corrente.prefisso}` : "";
    number.textContent = `#${prefisso}${corrente.numero}`;
  } else {
    number.textContent = "—";
  }
  section.appendChild(number);
  const service = document.createElement("div");
  service.className = "display-servizio";
  const operator = document.createElement("div");
  operator.className = "display-operatore";
  if (corrente) {
    service.textContent = corrente.servizio ? `Servizio: ${corrente.servizio}` : "Servizio: -";
    operator.textContent = corrente.operatore
      ? `Operatore: ${corrente.operatore}`
      : "Operatore: -";
  } else {
    service.textContent = "In attesa di chiamata";
    operator.textContent = "";
  }
  service.style.display = servizioEl.style.display;
  operator.style.display = operatoreEl.style.display;
  section.appendChild(service);
  section.appendChild(operator);
  return section;
}

function mostraPopup(numero, prefisso) {
  const testo = `#${prefisso}${numero}`;
  popupNumeroEl.textContent = testo;
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

function buildStoricoKey(item, index, total) {
  if (!item) {
    return "";
  }
  if (item.chiamato_il) {
    return item.chiamato_il;
  }
  const prefisso = item.prefisso ? `${item.prefisso}` : "";
  const numero = item.numero ? `${item.numero}` : "";
  const operatore = item.operatore ? `${item.operatore}` : "";
  return `${total}-${index}-${prefisso}${numero}-${operatore}`;
}

function renderStorico(storico, numeroUltimi) {
  if (!storicoEl) {
    return;
  }
  storicoEl.innerHTML = "";
  const ultimi = storico.slice(-numeroUltimi).reverse();
  if (!ultimi.length) {
    const li = document.createElement("li");
    li.textContent = "Nessuna chiamata";
    storicoEl.appendChild(li);
    return;
  }
  ultimi.forEach((item) => {
    const prefisso = item.prefisso ? `${item.prefisso}` : "";
    const servizio = item.servizio ? ` (${item.servizio})` : "";
    const operatore = item.operatore ? ` - ${item.operatore}` : "";
    const li = document.createElement("li");
    li.textContent = `#${prefisso}${item.numero}${servizio}${operatore}`;
    storicoEl.appendChild(li);
  });
}

function renderLogo(url) {
  if (url) {
    logoEl.src = url;
    logoEl.style.display = "block";
  } else {
    logoEl.style.display = "none";
  }
}

function renderImmagine() {
  if (!immagini.length || !immagineEl) {
    if (immagineEl) {
      immagineEl.style.display = "none";
    }
    return;
  }
  if (indiceImmagine >= immagini.length) {
    indiceImmagine = 0;
  }
  immagineEl.src = immagini[indiceImmagine];
  immagineEl.style.display = "block";
}

function aggiornaImmagine() {
  if (!immagini.length) {
    return;
  }
  indiceImmagine = (indiceImmagine + 1) % immagini.length;
  renderImmagine();
}

function createPanelTitle(title) {
  const heading = document.createElement("h2");
  heading.textContent = title;
  return heading;
}

function renderPanels(display, storico, corrente) {
  const panels = Array.isArray(display.finestre) ? display.finestre : [];
  const signature = JSON.stringify(panels);
  if (signature === lastPanelsSignature && extraContainer.children.length) {
    return;
  }
  lastPanelsSignature = signature;
  extraContainer.innerHTML = "";
  storicoEl = null;
  immagineEl = null;
  extraContainer.classList.toggle("schema-layout", panels.length === 4);

  panels.forEach((panel, index) => {
    const tipo = panel.tipo || "storico";
    const slotClass = `panel-slot-${index + 1}`;
    if (tipo === "storico") {
      const section = document.createElement("div");
      section.className = `display-history ${slotClass}`;
      section.appendChild(createPanelTitle(panel.titolo || "Ultimi chiamati"));
      const list = document.createElement("ul");
      list.id = "display-storico";
      section.appendChild(list);
      extraContainer.appendChild(section);
      storicoEl = list;
      renderStorico(storico, display.numero_ultimi || 5);
    } else if (tipo === "carousel") {
      const section = document.createElement("div");
      section.className = `display-carousel ${slotClass}`;
      if (panel.titolo) {
        section.appendChild(createPanelTitle(panel.titolo));
      }
      const image = document.createElement("img");
      image.id = "display-immagine";
      image.alt = panel.titolo || "Slide";
      section.appendChild(image);
      extraContainer.appendChild(section);
      immagineEl = image;
      renderImmagine();
    } else if (tipo === "testo") {
      const section = document.createElement("div");
      section.className = `display-text-panel ${slotClass}`;
      if (panel.titolo) {
        section.appendChild(createPanelTitle(panel.titolo));
      }
      const body = document.createElement("p");
      body.textContent = panel.testo || "";
      section.appendChild(body);
      extraContainer.appendChild(section);
    } else if (tipo === "ticker") {
      const section = document.createElement("div");
      section.className = `display-ticker-panel ${slotClass}`;
      if (panel.titolo) {
        section.appendChild(createPanelTitle(panel.titolo));
      }
      const ticker = document.createElement("div");
      ticker.className = "display-ticker";
      const tickerText = document.createElement("div");
      tickerText.className = "display-ticker-text";
      tickerText.textContent = panel.testo || "";
      ticker.appendChild(tickerText);
      section.appendChild(ticker);
      extraContainer.appendChild(section);
    } else if (tipo === "corrente") {
      const section = renderCurrentPanel(panel, corrente);
      section.className += ` ${slotClass}`;
      extraContainer.appendChild(section);
    } else if (tipo === "custom") {
      const section = document.createElement("div");
      section.className = `display-custom-panel ${slotClass}`;
      if (panel.titolo) {
        section.appendChild(createPanelTitle(panel.titolo));
      }
      const wrapper = document.createElement("div");
      wrapper.className = "display-custom-body";
      wrapper.innerHTML = panel.html || "";
      section.appendChild(wrapper);
      extraContainer.appendChild(section);
    }
  });
  extraContainer.style.display = panels.length ? "grid" : "none";
}

async function aggiornaDisplay() {
  const response = await fetch("/api/display");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  renderDisplay(data.corrente);
  const storico = data.storico || [];
  const lastIndex = storico.length - 1;
  const lastItem = lastIndex >= 0 ? storico[lastIndex] : null;
  if (lastItem && lastItem.numero) {
    const prefisso = lastItem.prefisso ? `${lastItem.prefisso}` : "";
    const key = buildStoricoKey(lastItem, lastIndex, storico.length);
    if (key && key !== ultimaChiamataKey) {
      ultimaChiamataKey = key;
      mostraPopup(lastItem.numero, prefisso);
    }
  } else if (data.corrente) {
    const prefisso = data.corrente.prefisso ? `${data.corrente.prefisso}` : "";
    const key = `${prefisso}${data.corrente.numero}`;
    if (key && key !== ultimaChiamataKey) {
      ultimaChiamataKey = key;
      mostraPopup(data.corrente.numero, prefisso);
    }
  }

  const display = data.display || {};
  applyDisplayTheme(display);
  const newAudio = display.audio || {};
  audioConfig = {
    abilita: Boolean(newAudio.abilita),
    url: newAudio.url || "",
    volume: typeof newAudio.volume === "number" ? newAudio.volume : 1,
  };
  const mostraUltimi = display.mostra_ultimi !== false;
  const numeroUltimi = display.numero_ultimi || 5;
  if (!mostraUltimi && Array.isArray(display.finestre)) {
    display.finestre = display.finestre.filter((panel) => panel.tipo !== "storico");
  }
  renderPanels(display, storico, data.corrente);
  renderStorico(storico, numeroUltimi);

  renderLogo(display.logo || "");
  immagini = display.immagini || [];
  renderImmagine();

  const contenuti = display.contenuti || {};
  titleEl.textContent = contenuti.titolo || "Chiamata in corso";
  subtitleEl.textContent = contenuti.sottotitolo || "";
  subtitleEl.style.display = contenuti.sottotitolo ? "block" : "none";
  cardTitleEl.textContent = contenuti.titolo_card || "";
  cardTitleEl.style.display = contenuti.titolo_card ? "block" : "none";
  servizioEl.style.display = contenuti.mostra_servizio === false ? "none" : "block";
  operatoreEl.style.display = contenuti.mostra_operatore === false ? "none" : "block";
  cardEl.style.display = contenuti.mostra_card === false ? "none" : "grid";
}

aggiornaDisplay();
setInterval(aggiornaDisplay, 2000);
setInterval(aggiornaImmagine, 5000);
