const esito = document.getElementById("esito");
const serviziContainer = document.getElementById("servizi");

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
    esito.textContent = `Ticket creato: #${data.ticket.numero}`;
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
}

fetchConfig();
