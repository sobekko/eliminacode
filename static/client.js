const form = document.getElementById("form-nuovo");
const inputNome = document.getElementById("nome");
const esito = document.getElementById("esito");
const serviziContainer = document.getElementById("servizi");
const servizioSelezionato = document.getElementById("servizio-selezionato");
const ticketDettaglio = document.getElementById("ticket-dettaglio");
const btnStampa = document.getElementById("btn-stampa");

let servizioScelto = "";
let ultimoTicket = null;

function renderServizi(config) {
  serviziContainer.innerHTML = "";
  const servizi = config.servizi || [];
  if (!servizioScelto && servizi.length) {
    servizioScelto = servizi[0];
  }
  servizi.forEach((servizio) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = servizio === servizioScelto ? "pill active" : "pill";
    button.textContent = servizio;
    button.addEventListener("click", () => {
      servizioScelto = servizio;
      renderServizi(config);
    });
    serviziContainer.appendChild(button);
  });
  servizioSelezionato.textContent = servizioScelto || "-";
}

async function fetchConfig() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  renderServizi(config);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nome = inputNome.value.trim();
  if (!nome) {
    esito.textContent = "Inserisci un nome valido.";
    esito.className = "esito error";
    return;
  }

  const response = await fetch("/api/turni", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nome, servizio: servizioScelto }),
  });

  if (response.ok) {
    const data = await response.json();
    esito.textContent = `Ticket creato: #${data.ticket.numero}`;
    esito.className = "esito ok";
    inputNome.value = "";
    ultimoTicket = data.ticket;
    const servizio = ultimoTicket.servizio ? ` (${ultimoTicket.servizio})` : "";
    ticketDettaglio.innerHTML = `
      <div class="ticket-numero">#${ultimoTicket.numero}</div>
      <div class="ticket-nome">${ultimoTicket.nome}${servizio}</div>
      <div class="ticket-orario">${new Date().toLocaleTimeString()}</div>
    `;
  } else {
    esito.textContent = "Errore nella creazione del ticket.";
    esito.className = "esito error";
  }
});

btnStampa.addEventListener("click", () => {
  if (!ultimoTicket) {
    esito.textContent = "Nessun ticket da stampare.";
    esito.className = "esito error";
    return;
  }
  window.print();
});

fetchConfig();
