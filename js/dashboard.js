/* ===========================================================
   BlueDocs — Unified Dashboard
   All PDF tools + Braille conversion in one place.
   Merge, split, rotate, watermark, and image→PDF run for real via
   pdf-lib (see REAL_PROCESSORS in main.js). Everything else is mocked.
   Site-navigation accessibility (Read Aloud, High Contrast, Font Size)
   lives in the floating Accessibility widget, wired in main.js.
   =========================================================== */

const TOOLS = [
  { id: "merge", grid: "grid-organize", icon: "fa-layer-group", title: "Merge PDF", desc: "Gabungkan beberapa file PDF menjadi satu dokumen.", tag: "Organisasi", real: "merge", multi: true },
  { id: "split", grid: "grid-organize", icon: "fa-scissors", title: "Split PDF", desc: "Pisahkan setiap halaman PDF menjadi file terpisah.", tag: "Organisasi", real: "split" },
  { id: "organize", grid: "grid-organize", icon: "fa-folder-tree", title: "Atur Halaman", desc: "Urutkan ulang, tambah, atau hapus halaman PDF.", tag: "Organisasi" },
  { id: "rotate", grid: "grid-organize", icon: "fa-rotate", title: "Rotasi Halaman", desc: "Putar orientasi halaman PDF sesuai kebutuhan.", tag: "Organisasi", rotate: true, real: "rotate" },
  { id: "compress", grid: "grid-organize", icon: "fa-compress", title: "Compress PDF", desc: "Perkecil ukuran file PDF tanpa mengubah tampilan.", tag: "Organisasi" },

  { id: "pdf2word", grid: "grid-convert", icon: "fa-file-word", title: "PDF to Word", desc: "Konversi dokumen PDF menjadi file Word yang dapat diedit.", tag: "Konversi" },
  { id: "pdf2jpg", grid: "grid-convert", icon: "fa-file-image", title: "PDF ke JPG", desc: "Ubah setiap halaman PDF menjadi gambar JPG.", tag: "Konversi" },
  { id: "toPdf", grid: "grid-convert", icon: "fa-file-pdf", title: "Word to PDF", desc: "Ubah file Word, Excel, PPT, atau gambar menjadi PDF.", tag: "Konversi", format: ["Word (.docx)", "Excel (.xlsx)", "PowerPoint (.pptx)", "Gambar (.jpg/.png)"], formatLabel: "Format asal file", real: "toPdf" },
  { id: "ocr", grid: "grid-convert", icon: "fa-magnifying-glass", title: "OCR", desc: "Kenali teks pada dokumen hasil scan atau gambar agar dapat dicari & disalin.", tag: "Konversi" },

  { id: "protect", grid: "grid-security", icon: "fa-lock", title: "Protect PDF", desc: "Tambahkan kata sandi agar dokumen lebih aman.", tag: "Keamanan", password: true },
  { id: "unlock", grid: "grid-security", icon: "fa-lock-open", title: "Unlock PDF", desc: "Hapus kata sandi dari file PDF yang terkunci.", tag: "Keamanan", password: true },
  { id: "watermark", grid: "grid-security", icon: "fa-droplet", title: "Tambah Watermark", desc: "Sisipkan teks watermark ke seluruh halaman dokumen.", tag: "Keamanan", text: "Teks watermark", real: "watermark" },
  { id: "sign", grid: "grid-security", icon: "fa-signature", title: "Tanda Tangan PDF", desc: "Bubuhkan tanda tangan digital pada dokumen.", tag: "Keamanan", text: "Nama penanda tangan" },
];

initToolModal(TOOLS);

/* ---------- Document & Braille tools (custom modals, not the generic upload flow) ---------- */
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
      <span class="tool-tag">Dokumen</span>
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

/* ---------- Braille Display / Embosser device (simulated connection) ---------- */
const DEMO_DEVICES = ["Focus 40 Blue", "BrailleNote Touch", "Orbit Reader 20", "HumanWare Brailliant BI 40"];
document.getElementById("device-connect-btn").addEventListener("click", () => {
  const wrap = document.getElementById("device-progress-wrap");
  const bar = document.getElementById("device-progress-bar");
  const label = document.getElementById("device-progress-label");
  const resultBox = document.getElementById("device-result-box");
  const resultText = document.getElementById("device-result-text");
  runMockProcess({
    progressWrap: wrap,
    progressBar: bar,
    progressLabel: label,
    resultBox,
    resultText,
    onDone: () => {
      const device = DEMO_DEVICES[Math.floor(Math.random() * DEMO_DEVICES.length)];
      resultText.textContent = `Terhubung ke perangkat: ${device}`;
      showToast(`Berhasil terhubung ke ${device}.`, "success");
    },
  });
});
