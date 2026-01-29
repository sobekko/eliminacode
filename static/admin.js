const form = document.getElementById("form-admin");
const servizioInput = document.getElementById("servizio");
const serviziInput = document.getElementById("servizi");
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
}

numeroOperatoriSelect.addEventListener("change", () => {
  const numero = Number(numeroOperatoriSelect.value);
  creaOperatoriInputs(numero);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const servizio = servizioInput.value.trim();
  const servizi = serviziInput.value
    .split(",")
    .map((voce) => voce.trim())
    .filter(Boolean);
  const operatori = Array.from(operatoriContainer.querySelectorAll("input")).map((input) => ({
    nome: input.value.trim(),
  }));

  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ servizio, servizi, operatori }),
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
