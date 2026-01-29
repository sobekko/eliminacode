const selectOperatore = document.getElementById("operatore");
const btnNext = document.getElementById("btn-next");
const corrente = document.getElementById("corrente");
const totaleCoda = document.getElementById("totale-coda");
const codaServizi = document.getElementById("coda-servizi");

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
  const response = await fetch("/api/turni/next", { method: "POST" });
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  if (data.corrente) {
    const servizio = data.corrente.servizio ? ` (${data.corrente.servizio})` : "";
    const operatore = selectOperatore.value ? ` - ${selectOperatore.value}` : "";
    corrente.textContent = `#${data.corrente.numero}${servizio}${operatore}`;
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
});

caricaOperatori();
aggiornaCoda();
setInterval(aggiornaCoda, 3000);
