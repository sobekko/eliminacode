const form = document.getElementById("form-admin");
const servizioInput = document.getElementById("servizio");
const serviziInput = document.getElementById("servizi");
const prioritaContainer = document.getElementById("priorita-container");
const numeroOperatoriSelect = document.getElementById("numero-operatori");
const operatoriContainer = document.getElementById("operatori-container");
const esitoAdmin = document.getElementById("esito-admin");

function creaOperatoriInputs(numero, valori = []) {
  operatoriContainer.innerHTML = "";
  for (let i = 0; i < numero; i += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "row";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = `Operatore ${i + 1}`;
    input.value = valori[i]?.nome || "";
    input.required = true;

    wrapper.appendChild(input);
    operatoriContainer.appendChild(wrapper);
  }
}

function creaPrioritaRow(servizio, valore) {
  const row = document.createElement("div");
  row.className = "priorita-row";

  const label = document.createElement("span");
  label.textContent = servizio;

  const select = document.createElement("select");
  select.dataset.servizio = servizio;
  [1, 2, 3].forEach((numero) => {
    const option = document.createElement("option");
    option.value = String(numero);
    option.textContent = String(numero);
    if (numero === valore) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  row.appendChild(label);
  row.appendChild(select);
  return row;
}

function renderPriorita(servizi, priorita) {
  prioritaContainer.innerHTML = "";
  servizi.forEach((servizio) => {
    const valore = priorita[servizio] ?? 3;
    prioritaContainer.appendChild(creaPrioritaRow(servizio, valore));
  });
}

function parseServizi() {
  return serviziInput.value
    .split(",")
    .map((voce) => voce.trim())
    .filter(Boolean);
}

async function caricaConfig() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  servizioInput.value = config.servizio || "";
  serviziInput.value = (config.servizi || []).join(", ");
  const operatori = config.operatori || [];
  numeroOperatoriSelect.value = String(operatori.length || 1);
  creaOperatoriInputs(operatori.length || 1, operatori);
  renderPriorita(config.servizi || [], config.priorita || {});
}

numeroOperatoriSelect.addEventListener("change", () => {
  const numero = Number(numeroOperatoriSelect.value);
  creaOperatoriInputs(numero);
});

serviziInput.addEventListener("input", () => {
  const servizi = parseServizi();
  const priorita = {};
  prioritaContainer.querySelectorAll("select").forEach((select) => {
    priorita[select.dataset.servizio] = Number(select.value);
  });
  renderPriorita(servizi, priorita);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const servizio = servizioInput.value.trim();
  const servizi = parseServizi();
  const priorita = {};
  prioritaContainer.querySelectorAll("select").forEach((select) => {
    priorita[select.dataset.servizio] = Number(select.value);
  });
  const operatori = Array.from(operatoriContainer.querySelectorAll("input")).map((input) => ({
    nome: input.value.trim(),
  }));

  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ servizio, servizi, priorita, operatori }),
  });

  if (response.ok) {
    esitoAdmin.textContent = "Configurazione salvata.";
    esitoAdmin.className = "esito ok";
  } else {
    esitoAdmin.textContent = "Errore nel salvataggio.";
    esitoAdmin.className = "esito error";
  }
});

caricaConfig();
