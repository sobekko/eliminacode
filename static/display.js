const numeroEl = document.getElementById("display-numero");
const servizioEl = document.getElementById("display-servizio");
const operatoreEl = document.getElementById("display-operatore");
const logoEl = document.getElementById("display-logo");
const storicoEl = document.getElementById("display-storico");
const immagineEl = document.getElementById("display-immagine");

let immagini = [];
let indiceImmagine = 0;

function renderDisplay(corrente) {
  if (!corrente) {
    numeroEl.textContent = "—";
    servizioEl.textContent = "In attesa di chiamata";
    operatoreEl.textContent = "";
    return;
  }
  const prefisso = corrente.prefisso ? `${corrente.prefisso}` : "";
  numeroEl.textContent = `#${prefisso}${corrente.numero}`;
  servizioEl.textContent = corrente.servizio ? `Servizio: ${corrente.servizio}` : "Servizio: -";
  operatoreEl.textContent = corrente.operatore
    ? `Operatore: ${corrente.operatore}`
    : "Operatore: -";
}

function renderStorico(storico, numeroUltimi) {
  storicoEl.innerHTML = "";
  const ultimi = storico.slice(-numeroUltimi).reverse();
  if (!ultimi.length) {
    const li = document.createElement("li");
    li.textContent = "Nessuna chiamata";
    storicoEl.appendChild(li);
    return;
  }
  ultimi.forEach((item) => {
    const prefisso = item.prefisso ? `${item.prefisso}` : "";
    const servizio = item.servizio ? ` (${item.servizio})` : "";
    const operatore = item.operatore ? ` - ${item.operatore}` : "";
    const li = document.createElement("li");
    li.textContent = `#${prefisso}${item.numero}${servizio}${operatore}`;
    storicoEl.appendChild(li);
  });
}

function renderLogo(url) {
  if (url) {
    logoEl.src = url;
    logoEl.style.display = "block";
  } else {
    logoEl.style.display = "none";
  }
}

function renderImmagine() {
  if (!immagini.length) {
    immagineEl.style.display = "none";
    return;
  }
  if (indiceImmagine >= immagini.length) {
    indiceImmagine = 0;
  }
  immagineEl.src = immagini[indiceImmagine];
  immagineEl.style.display = "block";
}

function aggiornaImmagine() {
  if (!immagini.length) {
    return;
  }
  indiceImmagine = (indiceImmagine + 1) % immagini.length;
  renderImmagine();
}

async function aggiornaDisplay() {
  const response = await fetch("/api/display");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  renderDisplay(data.corrente);

  const display = data.display || {};
  const mostraUltimi = display.mostra_ultimi !== false;
  const numeroUltimi = display.numero_ultimi || 5;
  const storico = data.storico || [];
  if (mostraUltimi) {
    storicoEl.closest(".display-history").style.display = "block";
    renderStorico(storico, numeroUltimi);
  } else {
    storicoEl.closest(".display-history").style.display = "none";
  }

  renderLogo(display.logo || "");
  immagini = display.immagini || [];
  renderImmagine();
}

aggiornaDisplay();
setInterval(aggiornaDisplay, 2000);
setInterval(aggiornaImmagine, 5000);
