const numeroEl = document.getElementById("display-numero");
const servizioEl = document.getElementById("display-servizio");
const operatoreEl = document.getElementById("display-operatore");

function renderDisplay(corrente) {
  if (!corrente) {
    numeroEl.textContent = "—";
    servizioEl.textContent = "In attesa di chiamata";
    operatoreEl.textContent = "";
    return;
  }
  numeroEl.textContent = `#${corrente.numero}`;
  servizioEl.textContent = corrente.servizio ? `Servizio: ${corrente.servizio}` : "Servizio: -";
  operatoreEl.textContent = corrente.operatore
    ? `Operatore: ${corrente.operatore}`
    : "Operatore: -";
}

async function aggiornaDisplay() {
  const response = await fetch("/api/display");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  renderDisplay(data.corrente);
}

aggiornaDisplay();
setInterval(aggiornaDisplay, 2000);
