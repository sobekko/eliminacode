const selectOperatore = document.getElementById("operatore");
const btnNext = document.getElementById("btn-next");
const corrente = document.getElementById("corrente");

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

btnNext.addEventListener("click", () => {
  chiamaProssimo();
});

caricaOperatori();
