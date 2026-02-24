const cards = Array.from(document.querySelectorAll(".operator-card"));
const totaleCoda = document.getElementById("multi-totale-coda");
const codaServizi = document.getElementById("multi-coda-servizi");
const codaDettaglio = document.getElementById("multi-coda-dettaglio");
const audioTestBtn = document.getElementById("multi-audio-test");
const audioStatus = document.getElementById("multi-audio-status");
const castDisplayBtn = document.getElementById("multi-cast-display");
const castStatus = document.getElementById("multi-cast-status");
const multiOperatorTime = document.getElementById("multi-operator-time");
let operatoreAudio = { abilita: false, url: "", volume: 1 };
let ticketAudio = null;
let ultimoTotaleCoda = null;
let audioUnlocked = false;
let castReady = false;
let castMode = null;
let presentationRequest = null;
let presentationConnection = null;

function setAudioStatus(text) {
  if (audioStatus) {
    audioStatus.textContent = text;
  }
}

function setCastStatus(text) {
  if (castStatus) {
    castStatus.textContent = text;
  }
}

function getDisplayUrl() {
  return `${window.location.origin}/display`;
}

function provaSbloccoAudio() {
  if (audioUnlocked || !operatoreAudio.abilita || !ticketAudio) {
    return;
  }
  ticketAudio.volume = operatoreAudio.volume;
  ticketAudio
    .play()
    .then(() => {
      ticketAudio.pause();
      ticketAudio.currentTime = 0;
      audioUnlocked = true;
      setAudioStatus("Audio pronto");
    })
    .catch(() => {});
}

function formatNumero(item) {
  if (!item || !item.numero) {
    return "Nessuno";
  }
  const prefisso = item.prefisso ? `${item.prefisso}` : "";
  const servizio = item.servizio ? ` (${item.servizio})` : "";
  const operatore = item.operatore ? ` - ${item.operatore}` : "";
  return `#${prefisso}${item.numero}${servizio}${operatore}`;
}

async function caricaOperatori() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  const audio = config?.operatore?.audio || {};
  operatoreAudio = {
    abilita: audio.abilita ?? false,
    url: audio.url || "",
    volume: audio.volume ?? 1,
  };
  if (operatoreAudio.url) {
    if (!ticketAudio || ticketAudio.src !== operatoreAudio.url) {
      ticketAudio = new Audio(operatoreAudio.url);
    }
    ticketAudio.volume = operatoreAudio.volume;
    setAudioStatus(operatoreAudio.abilita ? "Audio attivo" : "Audio disattivato");
  } else {
    ticketAudio = null;
    setAudioStatus("Audio non configurato");
  }
  provaSbloccoAudio();
  const operatori = config.operatori || [];
  cards.forEach((card, index) => {
    const select = card.querySelector(".operator-select");
    if (!select) {
      return;
    }
    select.innerHTML = "";
    operatori.forEach((operatore, opIndex) => {
      const option = document.createElement("option");
      option.value = operatore.nome;
      option.textContent = operatore.nome;
      if (opIndex === index && opIndex < operatori.length) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  });
}

function riproduciAudioNuovoTicket() {
  if (!operatoreAudio.abilita || !operatoreAudio.url || !ticketAudio) {
    return;
  }
  ticketAudio.currentTime = 0;
  ticketAudio.volume = operatoreAudio.volume;
  ticketAudio.play().catch(() => {});
}

function aggiornaOra() {
  if (!multiOperatorTime) {
    return;
  }
  const now = new Date();
  const data = now.toLocaleDateString("it-IT");
  const ora = now.toLocaleTimeString("it-IT");
  multiOperatorTime.textContent = `${data} ${ora}`;
}

function inizializzaCast() {
  if (!castDisplayBtn) {
    return;
  }
  if (!window.cast?.framework || !window.chrome?.cast) {
    setCastStatus("Chromecast non disponibile");
    castDisplayBtn.disabled = true;
    return;
  }
  try {
    const castContext = window.cast.framework.CastContext.getInstance();
    castContext.setOptions({
      receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });
    castReady = true;
    castMode = "cast-sdk";
    castDisplayBtn.disabled = false;
    setCastStatus("Chromecast pronto");
  } catch (error) {
    castReady = false;
    castMode = null;
    castDisplayBtn.disabled = true;
    setCastStatus("Errore Chromecast");
  }
}

function inizializzaPresentationApi() {
  if (!castDisplayBtn) {
    return false;
  }
  if (!("PresentationRequest" in window) || !navigator.presentation) {
    return false;
  }
  try {
    presentationRequest = new window.PresentationRequest([getDisplayUrl()]);
    navigator.presentation.defaultRequest = presentationRequest;
    castReady = true;
    castMode = "presentation";
    castDisplayBtn.disabled = false;
    setCastStatus("Chromecast pronto");
    return true;
  } catch (error) {
    presentationRequest = null;
    return false;
  }
}

async function trasmettiDisplaySuChromecast() {
  if (!castReady) {
    setCastStatus("Chromecast non disponibile");
    return;
  }
  if (castMode === "presentation" && presentationRequest) {
    setCastStatus("Connessione Chromecast...");
    try {
      if (presentationConnection) {
        await presentationConnection.terminate();
      }
      presentationConnection = await presentationRequest.start();
      setCastStatus("Display trasmesso");
      return;
    } catch (error) {
      setCastStatus("Invio fallito");
      return;
    }
  }
  if (castMode === "cast-sdk" && window.cast?.framework && window.chrome?.cast) {
    const castContext = window.cast.framework.CastContext.getInstance();
    setCastStatus("Connessione Chromecast...");
    try {
      await castContext.requestSession();
      const session = castContext.getCurrentSession();
      if (!session) {
        setCastStatus("Sessione annullata");
        return;
      }
      const mediaInfo = new window.chrome.cast.media.MediaInfo(getDisplayUrl(), "text/html");
      mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = "Display Eliminacode";
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;
      await session.loadMedia(request);
      setCastStatus("Display trasmesso");
      return;
    } catch (error) {
      if (error?.code === "cancel") {
        setCastStatus("Selezione dispositivo annullata");
        return;
      }
      setCastStatus("Invio fallito");
      return;
    }
  }
  setCastStatus("Chromecast non disponibile");
}

async function chiamaProssimo(card) {
  const select = card.querySelector(".operator-select");
  const correnteEl = card.querySelector(".corrente-val");
  const recallBtn = card.querySelector(".btn-recall");
  const response = await fetch("/api/turni/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operatore: select?.value || "" }),
  });
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  if (data.corrente) {
    card.dataset.lastNumero = data.corrente.numero ?? "";
    card.dataset.lastServizio = data.corrente.servizio ?? "";
    card.dataset.lastPrefisso = data.corrente.prefisso ?? "";
    card.dataset.lastOperatore = data.corrente.operatore ?? (select?.value || "");
    if (correnteEl) {
      correnteEl.textContent = formatNumero(data.corrente);
    }
    if (recallBtn) {
      recallBtn.disabled = false;
    }
  } else {
    if (correnteEl) {
      correnteEl.textContent = "Nessuno";
    }
  }
}

async function richiamaUltimo(card) {
  const select = card.querySelector(".operator-select");
  const correnteEl = card.querySelector(".corrente-val");
  const lastNumero = card.dataset.lastNumero;
  if (!lastNumero) {
    return;
  }
  const response = await fetch("/api/turni/recall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      numero: Number(lastNumero),
      servizio: card.dataset.lastServizio || "",
      prefisso: card.dataset.lastPrefisso || "",
      operatore: select?.value || card.dataset.lastOperatore || "",
    }),
  });
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  if (data.corrente && correnteEl) {
    correnteEl.textContent = formatNumero(data.corrente);
  }
}

function wireCard(card) {
  const nextBtn = card.querySelector(".btn-next");
  const recallBtn = card.querySelector(".btn-recall");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => chiamaProssimo(card));
  }
  if (recallBtn) {
    recallBtn.addEventListener("click", () => richiamaUltimo(card));
  }
}

function renderCoda(turni) {
  if (totaleCoda) {
    totaleCoda.textContent = String(turni.length);
  }
  const conteggi = {};
  turni.forEach((ticket) => {
    const servizio = ticket.servizio || "non specificato";
    conteggi[servizio] = (conteggi[servizio] || 0) + 1;
  });
  if (codaServizi) {
    codaServizi.innerHTML = "";
    Object.entries(conteggi)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([servizio, count]) => {
        const li = document.createElement("li");
        li.textContent = `${servizio}: ${count}`;
        codaServizi.appendChild(li);
      });
  }
  if (codaDettaglio) {
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
}

async function aggiornaCoda() {
  const response = await fetch("/api/turni");
  if (!response.ok) {
    return;
  }
  const data = await response.json();
  const turni = data.turni || [];
  renderCoda(turni);
  if (ultimoTotaleCoda === null) {
    ultimoTotaleCoda = turni.length;
  } else if (turni.length > ultimoTotaleCoda) {
    riproduciAudioNuovoTicket();
    ultimoTotaleCoda = turni.length;
  } else {
    ultimoTotaleCoda = turni.length;
  }
}

cards.forEach((card) => wireCard(card));
caricaOperatori();
aggiornaCoda();
setInterval(aggiornaCoda, 3000);
aggiornaOra();
setInterval(aggiornaOra, 1000);

if (inizializzaPresentationApi()) {
  if (castDisplayBtn) {
    castDisplayBtn.disabled = false;
  }
} else if (window.cast?.framework && window.chrome?.cast) {
  inizializzaCast();
} else {
  setCastStatus("Attesa Chromecast...");
  if (castDisplayBtn) {
    castDisplayBtn.disabled = true;
  }
}

window.__onGCastApiAvailable = (isAvailable) => {
  if (castMode === "presentation") {
    return;
  }
  if (isAvailable) {
    inizializzaCast();
  } else {
    castReady = false;
    castMode = null;
    if (castDisplayBtn) {
      castDisplayBtn.disabled = true;
    }
    setCastStatus("Chromecast non disponibile");
  }
};

if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
  if (castMode !== "presentation") {
    castReady = false;
    castMode = null;
    setCastStatus("Chromecast richiede HTTPS o localhost");
    if (castDisplayBtn) {
      castDisplayBtn.disabled = true;
    }
  }
}

document.addEventListener(
  "click",
  () => {
    provaSbloccoAudio();
  },
  { once: true }
);

if (audioTestBtn) {
  audioTestBtn.addEventListener("click", () => {
    provaSbloccoAudio();
    if (operatoreAudio.abilita && ticketAudio) {
      ticketAudio.currentTime = 0;
      ticketAudio.volume = operatoreAudio.volume;
      ticketAudio.play().catch(() => {});
    }
  });
}

if (castDisplayBtn) {
  castDisplayBtn.addEventListener("click", trasmettiDisplaySuChromecast);
}
