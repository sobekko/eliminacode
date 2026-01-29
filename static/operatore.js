const selectOperatore = document.getElementById("operatore");
const btnNext = document.getElementById("btn-next");
const corrente = document.getElementById("corrente");
const totaleCoda = document.getElementById("totale-coda");
const codaServizi = document.getElementById("coda-servizi");
const codaDettaglio = document.getElementById("coda-dettaglio");

async function caricaOperatori() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  const operatori = config.operatori || [];
  selectOperatore.innerHTML = "";
  operatori.forEach((operatore, index) => {
    const option = document.createElement("option");
    option.value = operatore.nome;
    option.textContent = operatore.nome;
    if (index === 0) {
      option.selected = true;
    }
    selectOperatore.appendChild(option);
  });
}

async function chiamaProssimo() {
  const response = await fetch("/api/turni/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operatore: selectOperatore.value }),
  });
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  if (data.corrente) {
    const servizio = data.corrente.servizio ? ` (${data.corrente.servizio})` : "";
    const prefisso = data.corrente.prefisso ? `${data.corrente.prefisso}` : "";
    let operatore = "";
    if (data.corrente.operatore) {
      operatore = ` - ${data.corrente.operatore}`;
    } else if (selectOperatore.value) {
      operatore = ` - ${selectOperatore.value}`;
    }
    corrente.textContent = `#${prefisso}${data.corrente.numero}${servizio}${operatore}`;
  } else {
    corrente.textContent = "Nessuno";
  }
}

function renderCoda(turni) {
  totaleCoda.textContent = String(turni.length);
  const conteggi = {};
  turni.forEach((ticket) => {
    const servizio = ticket.servizio || "non specificato";
    conteggi[servizio] = (conteggi[servizio] || 0) + 1;
  });
  codaServizi.innerHTML = "";
  Object.entries(conteggi)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([servizio, count]) => {
      const li = document.createElement("li");
      li.textContent = `${servizio}: ${count}`;
      codaServizi.appendChild(li);
    });
  codaDettaglio.innerHTML = "";
  if (!turni.length) {
    const li = document.createElement("li");
    li.textContent = "Nessun cliente in attesa";
    codaDettaglio.appendChild(li);
    return;
  }
  turni.forEach((ticket) => {
    const li = document.createElement("li");
    const prefisso = ticket.prefisso ? ticket.prefisso : "";
    const servizio = ticket.servizio ? ` (${ticket.servizio})` : "";
    const creatoIl = ticket.creato_il ? new Date(ticket.creato_il).getTime() : Date.now();
    const diff = Math.max(0, Math.floor((Date.now() - creatoIl) / 1000));
    const minuti = Math.floor(diff / 60);
    const secondi = diff % 60;
    li.textContent = `#${prefisso}${ticket.numero}${servizio} - attesa ${minuti}m ${secondi}s`;
    codaDettaglio.appendChild(li);
  });
}

async function aggiornaCoda() {
  const response = await fetch("/api/turni");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  renderCoda(data.turni || []);
}

btnNext.addEventListener("click", () => {
  chiamaProssimo();
  aggiornaCoda();
});

caricaOperatori();
aggiornaCoda();
setInterval(aggiornaCoda, 3000);
