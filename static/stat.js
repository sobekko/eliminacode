const statTicket = document.getElementById("stat-ticket");
const statChiamate = document.getElementById("stat-chiamate");
const statAttesa = document.getElementById("stat-attesa");
const statServizi = document.getElementById("stat-servizi");
const statOperatori = document.getElementById("stat-operatori");
const statUltime = document.getElementById("stat-ultime");
const statReset = document.getElementById("stat-reset");
const statGiorno = document.getElementById("stat-giorno");
const statSettimana = document.getElementById("stat-settimana");
const statMese = document.getElementById("stat-mese");
const statAnno = document.getElementById("stat-anno");
const statDayInput = document.getElementById("stat-day-date");
const statDayTotal = document.getElementById("stat-day-total");
const statDayAttesa = document.getElementById("stat-day-attesa");
const statDayServizi = document.getElementById("stat-day-servizi");
const statDayOperatori = document.getElementById("stat-day-operatori");
const statWeekInput = document.getElementById("stat-week-input");
const statWeekTotal = document.getElementById("stat-week-total");
const statWeekAttesa = document.getElementById("stat-week-attesa");
const statWeekServizi = document.getElementById("stat-week-servizi");
const statWeekOperatori = document.getElementById("stat-week-operatori");
const statMonthInput = document.getElementById("stat-month-input");
const statMonthTotal = document.getElementById("stat-month-total");
const statMonthAttesa = document.getElementById("stat-month-attesa");
const statMonthServizi = document.getElementById("stat-month-servizi");
const statMonthOperatori = document.getElementById("stat-month-operatori");

function renderList(container, items, formatter) {
  if (!container) {
    return;
  }
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
  if (statTicket) {
    statTicket.textContent = data.totale_ticket;
  }
  if (statChiamate) {
    statChiamate.textContent = data.totale_chiamate;
  }
  const attesa = Math.floor(data.attesa_media_secondi || 0);
  const minuti = Math.floor(attesa / 60);
  const secondi = attesa % 60;
  if (statAttesa) {
    statAttesa.textContent = `${minuti}m ${secondi}s`;
  }
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
  renderList(statAnno, data.per_anno || [], (item) => `${item.periodo}: ${item.count}`);
}

function toLocalISODate(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function startOfWeek(date) {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - day);
  return local;
}

function weekKeyFromDate(date) {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const jan1Day = (jan1.getDay() + 6) % 7;
  const firstMonday = new Date(year, 0, 1 + ((7 - jan1Day) % 7));
  if (date < firstMonday) {
    return `${year}-W00`;
  }
  const diff = date.getTime() - firstMonday.getTime();
  const week = 1 + Math.floor(diff / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function formatWeekLabel(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const mesi = [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ];
  const mesiCorti = [
    "gen",
    "feb",
    "mar",
    "apr",
    "mag",
    "giu",
    "lug",
    "ago",
    "set",
    "ott",
    "nov",
    "dic",
  ];
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();
  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${mesi[startMonth]}`;
  }
  return `${startDay} ${mesiCorti[startMonth]} - ${endDay} ${mesiCorti[endMonth]}`;
}

function buildWeekOptions(selectEl, weeksCount = 16) {
  const seen = new Set();
  const today = new Date();
  let currentStart = startOfWeek(today);
  selectEl.innerHTML = "";
  for (let i = 0; i < weeksCount; i += 1) {
    const key = weekKeyFromDate(currentStart);
    if (!seen.has(key)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = formatWeekLabel(currentStart);
      selectEl.appendChild(option);
      seen.add(key);
    }
    currentStart = new Date(currentStart);
    currentStart.setDate(currentStart.getDate() - 7);
  }
}

function toLocalISOMonth(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 7);
}

async function fetchDayStats(giorno) {
  if (!giorno) {
    return;
  }
  const response = await fetch(`/api/stats_day?date=${encodeURIComponent(giorno)}`);
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  if (statDayTotal) {
    statDayTotal.textContent = data.chiamate_totali ?? 0;
  }
  if (statDayAttesa) {
    const attesa = Math.floor(data.attesa_media_secondi || 0);
    const minuti = Math.floor(attesa / 60);
    const secondi = attesa % 60;
    statDayAttesa.textContent = `${minuti}m ${secondi}s`;
  }
  renderList(
    statDayServizi,
    data.per_servizio || [],
    (item) => `${item.servizio}: ${item.count}`
  );
  renderList(
    statDayOperatori,
    data.per_operatore || [],
    (item) => `${item.operatore || "(sconosciuto)"}: ${item.count}`
  );
}

async function fetchWeekStats(settimana) {
  if (!settimana) {
    return;
  }
  const response = await fetch(`/api/stats_week?week=${encodeURIComponent(settimana)}`);
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  if (statWeekTotal) {
    statWeekTotal.textContent = data.chiamate_totali ?? 0;
  }
  if (statWeekAttesa) {
    const attesa = Math.floor(data.attesa_media_secondi || 0);
    const minuti = Math.floor(attesa / 60);
    const secondi = attesa % 60;
    statWeekAttesa.textContent = `${minuti}m ${secondi}s`;
  }
  renderList(
    statWeekServizi,
    data.per_servizio || [],
    (item) => `${item.servizio}: ${item.count}`
  );
  renderList(
    statWeekOperatori,
    data.per_operatore || [],
    (item) => `${item.operatore || "(sconosciuto)"}: ${item.count}`
  );
}

async function fetchMonthStats(mese) {
  if (!mese) {
    return;
  }
  const response = await fetch(`/api/stats_month?month=${encodeURIComponent(mese)}`);
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  if (statMonthTotal) {
    statMonthTotal.textContent = data.chiamate_totali ?? 0;
  }
  if (statMonthAttesa) {
    const attesa = Math.floor(data.attesa_media_secondi || 0);
    const minuti = Math.floor(attesa / 60);
    const secondi = attesa % 60;
    statMonthAttesa.textContent = `${minuti}m ${secondi}s`;
  }
  renderList(
    statMonthServizi,
    data.per_servizio || [],
    (item) => `${item.servizio}: ${item.count}`
  );
  renderList(
    statMonthOperatori,
    data.per_operatore || [],
    (item) => `${item.operatore || "(sconosciuto)"}: ${item.count}`
  );
}

if (statDayInput) {
  statDayInput.value = toLocalISODate(new Date());
  fetchDayStats(statDayInput.value);
  statDayInput.addEventListener("change", () => {
    fetchDayStats(statDayInput.value);
  });
  setInterval(() => fetchDayStats(statDayInput.value), 5000);
} else if (statWeekInput) {
  buildWeekOptions(statWeekInput);
  fetchWeekStats(statWeekInput.value);
  statWeekInput.addEventListener("change", () => {
    fetchWeekStats(statWeekInput.value);
  });
  setInterval(() => fetchWeekStats(statWeekInput.value), 5000);
} else if (statMonthInput) {
  statMonthInput.value = toLocalISOMonth(new Date());
  fetchMonthStats(statMonthInput.value);
  statMonthInput.addEventListener("change", () => {
    fetchMonthStats(statMonthInput.value);
  });
  setInterval(() => fetchMonthStats(statMonthInput.value), 5000);
} else {
  fetchStats();
  setInterval(fetchStats, 5000);
}

if (statReset) {
  statReset.addEventListener("click", async () => {
    const ok = window.confirm(
      "Vuoi davvero resettare tutte le statistiche? Questa operazione elimina ticket e chiamate salvate."
    );
    if (!ok) {
      return;
    }
    const response = await fetch("/api/stats/reset", { method: "POST" });
    if (response.ok) {
      fetchStats();
    } else {
      window.alert("Errore nel reset delle statistiche.");
    }
  });
}
