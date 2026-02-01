const form = document.getElementById("form-kiosk");
const kioskSfondo = document.getElementById("kiosk-sfondo");
const kioskTesto = document.getElementById("kiosk-testo");
const kioskBottone = document.getElementById("kiosk-bottone");
const kioskTestoBottone = document.getElementById("kiosk-testo-bottone");
const kioskBottoneSize = document.getElementById("kiosk-bottone-size");
const kioskBottonePadding = document.getElementById("kiosk-bottone-padding");
const kioskSfondoImg = document.getElementById("kiosk-sfondo-img");
const kioskSfondoFile = document.getElementById("kiosk-sfondo-file");
const esitoKiosk = document.getElementById("esito-kiosk");
let configData = null;

function readFileAsDataUrl(file, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader.result);
  reader.readAsDataURL(file);
}

function ensureKioskDefaults(kiosk = {}) {
  return {
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
  kioskSfondo.value = kiosk.tema.sfondo || "#f4f5f7";
  kioskTesto.value = kiosk.tema.testo || "#1b1f24";
  kioskBottone.value = kiosk.tema.bottone || "#1f6feb";
  kioskTestoBottone.value = kiosk.tema.testo_bottone || "#ffffff";
  kioskSfondoImg.value = kiosk.tema.immagine_sfondo || "";
  kioskBottoneSize.value = kiosk.dimensioni.bottone || "1rem";
  kioskBottonePadding.value = kiosk.dimensioni.bottone_padding || "8px 14px";
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!configData?.servizio || !configData?.servizi?.length || !configData?.operatori?.length) {
    setEsito("Completa prima la configurazione base nell'admin.", "error");
    return;
  }
  const kiosk = {
    tema: {
      sfondo: kioskSfondo.value,
      testo: kioskTesto.value,
      bottone: kioskBottone.value,
      testo_bottone: kioskTestoBottone.value,
      immagine_sfondo: kioskSfondoImg.value.trim(),
    },
    dimensioni: {
      bottone: kioskBottoneSize.value.trim() || "1rem",
      bottone_padding: kioskBottonePadding.value.trim() || "8px 14px",
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
