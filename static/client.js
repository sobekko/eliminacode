const esito = document.getElementById("esito");
const serviziContainer = document.getElementById("servizi");

function applyKioskTheme(kiosk) {
  const tema = (kiosk && kiosk.tema) || {};
  const root = document.documentElement;
  root.style.setProperty("--kiosk-bg", tema.sfondo || "#f4f5f7");
  root.style.setProperty("--kiosk-text", tema.testo || "#1b1f24");
  root.style.setProperty("--kiosk-button", tema.bottone || "#1f6feb");
  root.style.setProperty("--kiosk-button-text", tema.testo_bottone || "#ffffff");
  if (tema.immagine_sfondo) {
    root.style.setProperty("--kiosk-bg-image", `url('${tema.immagine_sfondo}')`);
  } else {
    root.style.setProperty("--kiosk-bg-image", "none");
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
}

fetchConfig();
