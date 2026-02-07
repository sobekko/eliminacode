const btnNext = document.getElementById("btn-next");
const btnReset = document.getElementById("btn-reset");
const corrente = document.getElementById("corrente");
const listaAttesa = document.getElementById("lista-attesa");
const servizioAttivo = document.getElementById("servizio-attivo");
const listaOperatori = document.getElementById("lista-operatori");

function renderState(state) {
  const attesa = state.turni || [];
  const config = state.config || {};
  listaAttesa.innerHTML = "";
  attesa.forEach((ticket) => {
    const li = document.createElement("li");
    const servizio = ticket.servizio ? ` (${ticket.servizio})` : "";
    const prefisso = ticket.prefisso ? `${ticket.prefisso}` : "";
    const nome = ticket.nome ? ` - ${ticket.nome}` : "";
    li.textContent = `#${prefisso}${ticket.numero}${nome}${servizio}`;
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

  if (state.corrente) {
    const servizio = state.corrente.servizio ? ` (${state.corrente.servizio})` : "";
    const prefisso = state.corrente.prefisso ? `${state.corrente.prefisso}` : "";
    const nome = state.corrente.nome ? ` - ${state.corrente.nome}` : "";
    corrente.textContent = `#${prefisso}${state.corrente.numero}${nome}${servizio}`;
  } else {
    corrente.textContent = "Nessuno";
  }
}

async function fetchState() {
  const response = await fetch("/api/turni");
  const data = await response.json();
  renderState(data);
}

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
