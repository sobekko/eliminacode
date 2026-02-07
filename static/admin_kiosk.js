const form = document.getElementById("form-kiosk");
const kioskIntroText = document.getElementById("kiosk-intro-text");
const kioskLogo = document.getElementById("kiosk-logo");
const kioskLogoFile = document.getElementById("kiosk-logo-file");
const kioskServiziDesc = document.getElementById("kiosk-servizi-desc");
const kioskTestoPosizione = document.getElementById("kiosk-testo-posizione");
const kioskSfondo = document.getElementById("kiosk-sfondo");
const kioskTextColor = document.getElementById("kiosk-text-color");
const kioskBottone = document.getElementById("kiosk-bottone");
const kioskTestoBottone = document.getElementById("kiosk-testo-bottone");
const kioskBottoneSize = document.getElementById("kiosk-bottone-size");
const kioskBottonePadding = document.getElementById("kiosk-bottone-padding");
const kioskSfondoImg = document.getElementById("kiosk-sfondo-img");
const kioskSfondoFile = document.getElementById("kiosk-sfondo-file");
const kioskPrintEnabled = document.getElementById("kiosk-print-enabled");
const kioskPrintHost = document.getElementById("kiosk-print-host");
const kioskPrintPort = document.getElementById("kiosk-print-port");
const kioskPrintName = document.getElementById("kiosk-print-name");
const kioskPrintLogo = document.getElementById("kiosk-print-logo");
const kioskPrintMessage = document.getElementById("kiosk-print-message");
const kioskPrintFooter = document.getElementById("kiosk-print-footer");
const kioskPrintDatetime = document.getElementById("kiosk-print-datetime");
const kioskPrintCut = document.getElementById("kiosk-print-cut");
const esitoKiosk = document.getElementById("esito-kiosk");
let configData = null;

function readFileAsDataUrl(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

function ensureKioskDefaults(kiosk = {}) {
  return {
    contenuti: {
      testo: kiosk.contenuti?.testo || "Prendi il tuo ticket",
      logo: kiosk.contenuti?.logo || "",
      descrizione_servizi:
        kiosk.contenuti?.descrizione_servizi || "Seleziona un servizio per stampare il ticket.",
      posizione_testo: kiosk.contenuti?.posizione_testo || "sopra",
    },
    tema: {
      sfondo: kiosk.tema?.sfondo || "#f4f5f7",
      testo: kiosk.tema?.testo || "#1b1f24",
      bottone: kiosk.tema?.bottone || "#1f6feb",
      testo_bottone: kiosk.tema?.testo_bottone || "#ffffff",
      immagine_sfondo: kiosk.tema?.immagine_sfondo || "",
    },
    dimensioni: {
      bottone: kiosk.dimensioni?.bottone || "1rem",
      bottone_padding: kiosk.dimensioni?.bottone_padding || "8px 14px",
    },
    stampa: {
      abilita: kiosk.stampa?.abilita ?? false,
      host: kiosk.stampa?.host || "",
      port: kiosk.stampa?.port ?? 9100,
      nome: kiosk.stampa?.nome || "",
      logo: kiosk.stampa?.logo || "",
      messaggio: kiosk.stampa?.messaggio || "Ticket eliminacode",
      footer: kiosk.stampa?.footer || "",
      mostra_data_ora: kiosk.stampa?.mostra_data_ora ?? true,
      taglio: kiosk.stampa?.taglio ?? true,
    },
  };
}

function setEsito(message, status) {
  esitoKiosk.textContent = message;
  esitoKiosk.className = `esito ${status}`;
}

async function caricaConfig() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    return;
  }
  const config = await response.json();
  configData = config;
  const kiosk = ensureKioskDefaults(config.kiosk || {});
  kioskIntroText.value = kiosk.contenuti.testo || "";
  kioskLogo.value = kiosk.contenuti.logo || "";
  kioskServiziDesc.value = kiosk.contenuti.descrizione_servizi || "";
  kioskTestoPosizione.value = kiosk.contenuti.posizione_testo || "sopra";
  kioskSfondo.value = kiosk.tema.sfondo || "#f4f5f7";
  kioskTextColor.value = kiosk.tema.testo || "#1b1f24";
  kioskBottone.value = kiosk.tema.bottone || "#1f6feb";
  kioskTestoBottone.value = kiosk.tema.testo_bottone || "#ffffff";
  kioskSfondoImg.value = kiosk.tema.immagine_sfondo || "";
  kioskBottoneSize.value = kiosk.dimensioni.bottone || "1rem";
  kioskBottonePadding.value = kiosk.dimensioni.bottone_padding || "8px 14px";
  kioskPrintEnabled.checked = kiosk.stampa.abilita;
  kioskPrintHost.value = kiosk.stampa.host || "";
  kioskPrintPort.value = String(kiosk.stampa.port || 9100);
  kioskPrintName.value = kiosk.stampa.nome || "";
  kioskPrintLogo.value = kiosk.stampa.logo || "";
  kioskPrintMessage.value = kiosk.stampa.messaggio || "Ticket eliminacode";
  kioskPrintFooter.value = kiosk.stampa.footer || "";
  kioskPrintDatetime.checked = kiosk.stampa.mostra_data_ora ?? true;
  kioskPrintCut.checked = kiosk.stampa.taglio;
}

kioskSfondoFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  readFileAsDataUrl(file, (dataUrl) => {
    kioskSfondoImg.value = dataUrl;
  });
});

kioskLogoFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  readFileAsDataUrl(file, (dataUrl) => {
    kioskLogo.value = dataUrl;
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configData?.servizio || !configData?.servizi?.length || !configData?.operatori?.length) {
    setEsito("Completa prima la configurazione base nell'admin.", "error");
    return;
  }
  const kiosk = {
    contenuti: {
      testo: kioskIntroText.value.trim(),
      logo: kioskLogo.value.trim(),
      descrizione_servizi: kioskServiziDesc.value.trim(),
      posizione_testo: kioskTestoPosizione.value,
    },
    tema: {
      sfondo: kioskSfondo.value,
      testo: kioskTextColor.value,
      bottone: kioskBottone.value,
      testo_bottone: kioskTestoBottone.value,
      immagine_sfondo: kioskSfondoImg.value.trim(),
    },
    dimensioni: {
      bottone: kioskBottoneSize.value.trim() || "1rem",
      bottone_padding: kioskBottonePadding.value.trim() || "8px 14px",
    },
    stampa: {
      abilita: kioskPrintEnabled.checked,
      host: kioskPrintHost.value.trim(),
      port: Number(kioskPrintPort.value) || 9100,
      nome: kioskPrintName.value.trim(),
      logo: kioskPrintLogo.value.trim(),
      messaggio: kioskPrintMessage.value.trim(),
      footer: kioskPrintFooter.value.trim(),
      mostra_data_ora: kioskPrintDatetime.checked,
      taglio: kioskPrintCut.checked,
    },
  };

  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      servizio: configData.servizio,
      servizi: configData.servizi,
      priorita: configData.priorita || {},
      prefissi: configData.prefissi || {},
      display: configData.display || {},
      kiosk,
      operatori: configData.operatori || [],
    }),
  });

  if (response.ok) {
    const data = await response.json();
    configData = data.config;
    setEsito("Configurazione kiosk salvata.", "ok");
  } else {
    setEsito("Errore nel salvataggio.", "error");
  }
});

caricaConfig();
