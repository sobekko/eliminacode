const form = document.getElementById("form-nuovo");
const inputNome = document.getElementById("nome");
const esito = document.getElementById("esito");
const btnNext = document.getElementById("btn-next");
const btnReset = document.getElementById("btn-reset");
const corrente = document.getElementById("corrente");
const listaAttesa = document.getElementById("lista-attesa");
const servizioAttivo = document.getElementById("servizio-attivo");
const listaOperatori = document.getElementById("lista-operatori");
const serviziContainer = document.getElementById("servizi");
const servizioSelezionato = document.getElementById("servizio-selezionato");

let servizioScelto = "";

function renderState(state) {
  const attesa = state.turni || [];
  const config = state.config || {};
  listaAttesa.innerHTML = "";
  attesa.forEach((ticket) => {
    const li = document.createElement("li");
    const servizio = ticket.servizio ? ` (${ticket.servizio})` : "";
    li.textContent = `#${ticket.numero} - ${ticket.nome}${servizio}`;
    listaAttesa.appendChild(li);
  });

  if (servizioAttivo) {
    servizioAttivo.textContent = config.servizio || "-";
  }

  if (listaOperatori) {
    listaOperatori.innerHTML = "";
    (config.operatori || []).forEach((operatore) => {
      const li = document.createElement("li");
      li.textContent = operatore.nome;
      listaOperatori.appendChild(li);
    });
  }

  if (serviziContainer) {
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
        renderState(state);
      });
      serviziContainer.appendChild(button);
    });
    if (servizioSelezionato) {
      servizioSelezionato.textContent = servizioScelto || "-";
    }
  }

  if (state.corrente) {
    const servizio = state.corrente.servizio ? ` (${state.corrente.servizio})` : "";
    corrente.textContent = `#${state.corrente.numero} - ${state.corrente.nome}${servizio}`;
  } else {
    corrente.textContent = "Nessuno";
  }
}

async function fetchState() {
  const response = await fetch("/api/turni");
  const data = await response.json();
  renderState(data);
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
    fetchState();
  } else {
    esito.textContent = "Errore nella creazione del ticket.";
    esito.className = "esito error";
  }
});

btnNext.addEventListener("click", async () => {
  const response = await fetch("/api/turni/next", { method: "POST" });
  if (response.ok) {
    const data = await response.json();
    renderState({ turni: data.attesa, corrente: data.corrente });
  }
});

btnReset.addEventListener("click", async () => {
  if (!confirm("Reset completo dei turni?")) {
    return;
  }
  const response = await fetch("/api/turni/reset", { method: "POST" });
  if (response.ok) {
    const data = await response.json();
    renderState(data.state);
  }
});

fetchState();
