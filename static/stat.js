const statTicket = document.getElementById("stat-ticket");
const statChiamate = document.getElementById("stat-chiamate");
const statAttesa = document.getElementById("stat-attesa");
const statServizi = document.getElementById("stat-servizi");
const statOperatori = document.getElementById("stat-operatori");
const statUltime = document.getElementById("stat-ultime");
const statGiorno = document.getElementById("stat-giorno");
const statSettimana = document.getElementById("stat-settimana");
const statMese = document.getElementById("stat-mese");

function renderList(container, items, formatter) {
  container.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.textContent = "Nessun dato";
    container.appendChild(li);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = formatter(item);
    container.appendChild(li);
  });
}

async function fetchStats() {
  const response = await fetch("/api/stats");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  statTicket.textContent = data.totale_ticket;
  statChiamate.textContent = data.totale_chiamate;
  const attesa = Math.floor(data.attesa_media_secondi || 0);
  const minuti = Math.floor(attesa / 60);
  const secondi = attesa % 60;
  statAttesa.textContent = `${minuti}m ${secondi}s`;
  renderList(statServizi, data.per_servizio || [], (item) => `${item.servizio}: ${item.count}`);
  renderList(
    statOperatori,
    data.chiamate_per_operatore || [],
    (item) => `${item.operatore || "(sconosciuto)"}: ${item.count}`
  );
  renderList(statUltime, data.ultime_chiamate || [], (item) => {
    const prefisso = item.prefisso ? item.prefisso : "";
    return `#${prefisso}${item.numero} - ${item.servizio} - ${item.operatore || "-"} (${item.chiamato_il})`;
  });
  renderList(statGiorno, data.per_giorno || [], (item) => `${item.periodo}: ${item.count}`);
  renderList(statSettimana, data.per_settimana || [], (item) => `${item.periodo}: ${item.count}`);
  renderList(statMese, data.per_mese || [], (item) => `${item.periodo}: ${item.count}`);
}

fetchStats();
setInterval(fetchStats, 5000);
