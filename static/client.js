const esito = document.getElementById("esito");
const serviziContainer = document.getElementById("servizi");
const kioskTextTop = document.getElementById("kiosk-text-top");
const kioskTextBottom = document.getElementById("kiosk-text-bottom");
const kioskLogo = document.getElementById("kiosk-logo");
const kioskServiziDesc = document.getElementById("kiosk-servizi-desc");

function setElementVisibility(element, shouldShow) {
  if (!element) {
    return;
  }
  element.hidden = !shouldShow;
}

function applyKioskTheme(kiosk) {
  const tema = (kiosk && kiosk.tema) || {};
  const root = document.documentElement;
  root.style.setProperty("--kiosk-bg", tema.sfondo || "#f4f5f7");
  root.style.setProperty("--kiosk-text", tema.testo || "#1b1f24");
  root.style.setProperty("--kiosk-button", tema.bottone || "#1f6feb");
  root.style.setProperty("--kiosk-button-text", tema.testo_bottone || "#ffffff");
  const dimensioni = (kiosk && kiosk.dimensioni) || {};
  root.style.setProperty("--kiosk-button-size", dimensioni.bottone || "1rem");
  root.style.setProperty("--kiosk-button-padding", dimensioni.bottone_padding || "8px 14px");
  if (tema.immagine_sfondo) {
    root.style.setProperty("--kiosk-bg-image", `url('${tema.immagine_sfondo}')`);
  } else {
    root.style.setProperty("--kiosk-bg-image", "none");
  }
}

function renderKioskContent(kiosk) {
  const contenuti = (kiosk && kiosk.contenuti) || {};
  const testo = (contenuti.testo || "").trim();
  const posizione = contenuti.posizione_testo || "sopra";
  const logo = (contenuti.logo || "").trim();
  const descrizioneServizi = (contenuti.descrizione_servizi || "").trim();

  const showText = Boolean(testo);
  const showLogo = Boolean(logo);

  if (kioskTextTop) {
    kioskTextTop.textContent = posizione === "sopra" || posizione === "entrambi" ? testo : "";
    setElementVisibility(kioskTextTop, showText && kioskTextTop.textContent);
  }
  if (kioskTextBottom) {
    kioskTextBottom.textContent = posizione === "sotto" || posizione === "entrambi" ? testo : "";
    setElementVisibility(kioskTextBottom, showText && kioskTextBottom.textContent);
  }
  if (kioskLogo) {
    kioskLogo.src = logo;
    setElementVisibility(kioskLogo, showLogo);
  }
  if (kioskServiziDesc) {
    kioskServiziDesc.textContent = descrizioneServizi;
    setElementVisibility(kioskServiziDesc, Boolean(descrizioneServizi));
  }
}

async function creaTicket(servizio) {
  const response = await fetch("/api/turni", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ servizio }),
  });

  if (response.ok) {
    const data = await response.json();
    const prefisso = data.ticket.prefisso ? `${data.ticket.prefisso}` : "";
    esito.textContent = `Ticket creato: ${prefisso}${data.ticket.numero}`;
    esito.className = "esito ok";
  } else {
    esito.textContent = "Errore nella creazione del ticket.";
    esito.className = "esito error";
  }
}

function renderServizi(config) {
  serviziContainer.innerHTML = "";
  const servizi = config.servizi || [];
  servizi.forEach((servizio) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill";
    button.textContent = servizio;
    button.addEventListener("click", () => {
      creaTicket(servizio);
    });
    serviziContainer.appendChild(button);
  });
}

async function fetchConfig() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  renderServizi(config);
  applyKioskTheme(config.kiosk);
  renderKioskContent(config.kiosk);
}

fetchConfig();
