import { showToast } from "./utils/toast.js";
import { openModal } from "./utils/dom.js";
import { downloadTextFile, runMockProcess } from "./pdf/processors.js";

/* ===========================================================
   Dokumen & Braille section — self-contained side-effect module:
   renders its own cards into #grid-braille and wires the Latin<->Braille
   converter modal plus the Braille Display/Embosser scan+connect modal.
   =========================================================== */

/* ---------- Card rendering ---------- */
const BRAILLE_TOOLS = [
  { icon: "fa-braille", title: "Latin ke Braille", desc: "Konversi teks Latin menjadi Braille Grade 1.", action: () => openBraille("l2b") },
  { icon: "fa-font", title: "Braille ke Latin", desc: "Konversi pola Braille menjadi teks Latin.", action: () => openBraille("b2l") },
  { icon: "fa-print", title: "Braille Display / Embosser", desc: "Hubungkan dan kirim dokumen ke perangkat Braille.", action: () => openModal(document.getElementById("device-modal-overlay")) },
];

function renderBrailleTools() {
  const grid = document.getElementById("grid-braille");
  BRAILLE_TOOLS.forEach((tool) => {
    const card = document.createElement("button");
    card.className = "tool-card a11y";
    card.type = "button";
    card.setAttribute("aria-label", `${tool.title} — ${tool.desc}`);
    card.innerHTML = `
      <div class="tool-icon" aria-hidden="true"><i class="fa-solid ${tool.icon}"></i></div>
      <h3>${tool.title}</h3>
      <p>${tool.desc}</p>
    `;
    card.addEventListener("click", tool.action);
    grid.appendChild(card);
  });
}
renderBrailleTools();

/* ---------- Latin <-> Braille conversion (real, Grade 1 mapping) ---------- */
const LATIN_TO_BRAILLE = {
  a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑", f: "⠋", g: "⠛", h: "⠓", i: "⠊", j: "⠚",
  k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕", p: "⠏", q: "⠟", r: "⠗", s: "⠎", t: "⠞",
  u: "⠥", v: "⠧", w: "⠺", x: "⠭", y: "⠽", z: "⠵",
  "1": "⠁", "2": "⠃", "3": "⠉", "4": "⠙", "5": "⠑", "6": "⠋", "7": "⠛", "8": "⠓", "9": "⠊", "0": "⠚",
  ".": "⠲", ",": "⠂", "?": "⠦", "!": "⠖", "'": "⠄", "-": "⠤", " ": " ",
};
const NUMBER_SIGN = "⠼";
const CAPITAL_SIGN = "⠠";
// Reverse map built from letters + punctuation only — digit cells (a-j shapes)
// are resolved separately via numberMode, since they visually overlap with letters.
const BRAILLE_TO_LATIN = {};
"abcdefghijklmnopqrstuvwxyz.,?!'- ".split("").forEach((ch) => {
  BRAILLE_TO_LATIN[LATIN_TO_BRAILLE[ch]] = ch;
});

function convertLatinToBraille(text) {
  let out = "";
  let inNumber = false;
  for (const rawCh of text) {
    const ch = rawCh;
    const lower = ch.toLowerCase();
    if (/[0-9]/.test(ch)) {
      if (!inNumber) {
        out += NUMBER_SIGN;
        inNumber = true;
      }
      out += LATIN_TO_BRAILLE[ch] || ch;
      continue;
    }
    inNumber = false;
    if (/[a-z]/i.test(ch)) {
      if (ch !== lower) out += CAPITAL_SIGN;
      out += LATIN_TO_BRAILLE[lower] || lower;
    } else {
      out += LATIN_TO_BRAILLE[ch] || ch;
    }
  }
  return out;
}

function convertBrailleToLatin(text) {
  let out = "";
  let numberMode = false;
  let capitalNext = false;
  for (const ch of text) {
    if (ch === NUMBER_SIGN) {
      numberMode = true;
      continue;
    }
    if (ch === CAPITAL_SIGN) {
      capitalNext = true;
      continue;
    }
    if (ch === " ") {
      out += " ";
      numberMode = false;
      continue;
    }
    let mapped = BRAILLE_TO_LATIN[ch];
    if (mapped === undefined) {
      out += ch;
      continue;
    }
    if (numberMode) {
      const digitMap = { a: "1", b: "2", c: "3", d: "4", e: "5", f: "6", g: "7", h: "8", i: "9", j: "0" };
      out += digitMap[mapped] !== undefined ? digitMap[mapped] : mapped;
    } else if (capitalNext) {
      out += mapped.toUpperCase();
      capitalNext = false;
    } else {
      out += mapped;
    }
  }
  return out;
}

let brailleMode = "l2b"; // l2b = Latin -> Braille, b2l = Braille -> Latin
function openBraille(mode) {
  brailleMode = mode;
  updateBrailleLabels();
  document.getElementById("braille-input").value = "";
  document.getElementById("braille-output").textContent = "";
  openModal(document.getElementById("braille-modal-overlay"));
}
function updateBrailleLabels() {
  const isL2B = brailleMode === "l2b";
  document.getElementById("braille-modal-title").textContent = isL2B ? "Konversi Latin ke Braille" : "Konversi Braille ke Latin";
  document.getElementById("braille-input-label").textContent = isL2B ? "Teks Latin" : "Teks Braille (Unicode)";
  document.getElementById("braille-output-label").textContent = isL2B ? "Hasil Braille" : "Hasil Latin";
  document.getElementById("braille-input").placeholder = isL2B ? "Ketik teks Latin di sini..." : "Tempel karakter Braille di sini (contoh: ⠓⠑⠇⠇⠕)";
}
document.getElementById("braille-swap").addEventListener("click", () => {
  brailleMode = brailleMode === "l2b" ? "b2l" : "l2b";
  updateBrailleLabels();
  document.getElementById("braille-input").value = "";
  document.getElementById("braille-output").textContent = "";
  document.getElementById("braille-input").focus();
  showToast(brailleMode === "l2b" ? "Diubah ke mode Latin ke Braille." : "Diubah ke mode Braille ke Latin.");
});
document.getElementById("braille-input").addEventListener("input", (e) => {
  const value = e.target.value;
  const result = brailleMode === "l2b" ? convertLatinToBraille(value) : convertBrailleToLatin(value);
  document.getElementById("braille-output").textContent = result;
});
document.getElementById("braille-download").addEventListener("click", () => {
  const output = document.getElementById("braille-output").textContent;
  if (!output.trim()) {
    showToast("Belum ada hasil konversi untuk diekspor.", "error");
    return;
  }
  const brailleText = brailleMode === "l2b" ? output : document.getElementById("braille-input").value;
  downloadTextFile("dokumen-braille.brf", brailleText);
  showToast("File Braille siap dicetak dengan Embosser atau dikirim ke Braille Display.", "success");
});

/* ---------- Braille Display / Embosser device (simulated scan + connect) ---------- */
const DEMO_DEVICES = ["Focus 40 Blue", "BrailleNote Touch", "Orbit Reader 20", "HumanWare Brailliant BI 40"];

document.getElementById("device-scan-btn").addEventListener("click", () => {
  const deviceList = document.getElementById("device-list");
  deviceList.innerHTML = "";
  document.getElementById("device-result-box").classList.remove("show");

  runMockProcess({
    progressWrap: document.getElementById("device-progress-wrap"),
    progressBar: document.getElementById("device-progress-bar"),
    progressLabel: document.getElementById("device-progress-label"),
    resultBox: document.getElementById("device-result-box"),
    resultText: document.getElementById("device-result-text"),
    onDone: () => {
      document.getElementById("device-result-box").classList.remove("show");
      const found = [...DEMO_DEVICES].sort(() => Math.random() - 0.5).slice(0, 3);
      found.forEach((device) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "device-item";
        item.innerHTML = `<span><i class="fa-solid fa-braille" aria-hidden="true"></i> ${device}</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i>`;
        item.addEventListener("click", () => connectToDevice(device));
        deviceList.appendChild(item);
      });
      showToast(`${found.length} perangkat ditemukan. Pilih salah satu untuk menghubungkan.`, "success");
    },
  });
});

function connectToDevice(device) {
  document.getElementById("device-list").innerHTML = "";
  runMockProcess({
    progressWrap: document.getElementById("device-progress-wrap"),
    progressBar: document.getElementById("device-progress-bar"),
    progressLabel: document.getElementById("device-progress-label"),
    resultBox: document.getElementById("device-result-box"),
    resultText: document.getElementById("device-result-text"),
    onDone: () => {
      document.getElementById("device-result-text").textContent = `Terhubung ke perangkat: ${device}`;
      showToast(`Berhasil terhubung ke ${device}.`, "success");
    },
  });
}
