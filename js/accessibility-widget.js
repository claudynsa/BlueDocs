import { showToast } from "./utils/toast.js";
import { openModal } from "./utils/dom.js";
import { isReadAloudOn, setReadAloudOn, speakRaw } from "./utils/speech.js";

/* ===========================================================
   Floating Accessibility widget — shared by every page (side-effect
   module: just import it, no exports needed).
   Covers site-navigation accessibility only (Pembaca Layar, High
   Contrast, Font Size, Keyboard Navigation info).
   Document-specific accessibility tools (OCR, Braille conversion,
   Braille Display/Embosser) live in the dashboard's tool grid instead.
   =========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const fab = document.getElementById("a11y-fab");
  const overlay = document.getElementById("a11y-modal-overlay");
  if (!fab || !overlay) return; // page doesn't include the widget

  fab.addEventListener("click", () => openModal(overlay));

  /* ---- Font size (persisted across pages via localStorage) ---- */
  const FONT_LEVELS = ["", "font-lg", "font-xl"];
  let fontLevel = Number(localStorage.getItem("bd-font-level") || 0);

  function applyFontLevel() {
    FONT_LEVELS.forEach((c) => c && document.documentElement.classList.remove(c));
    if (FONT_LEVELS[fontLevel]) document.documentElement.classList.add(FONT_LEVELS[fontLevel]);
    localStorage.setItem("bd-font-level", String(fontLevel));
  }
  applyFontLevel();

  document.getElementById("a11y-font-inc").addEventListener("click", () => {
    fontLevel = Math.min(fontLevel + 1, FONT_LEVELS.length - 1);
    applyFontLevel();
    showToast("Ukuran huruf diperbesar.");
  });
  document.getElementById("a11y-font-dec").addEventListener("click", () => {
    fontLevel = Math.max(fontLevel - 1, 0);
    applyFontLevel();
    showToast("Ukuran huruf diperkecil.");
  });
  document.getElementById("a11y-font-reset").addEventListener("click", () => {
    fontLevel = 0;
    applyFontLevel();
    showToast("Ukuran huruf dikembalikan ke normal.");
  });

  /* ---- High contrast (persisted across pages) ---- */
  let contrastOn = localStorage.getItem("bd-contrast") === "1";
  const contrastBtn = document.getElementById("a11y-contrast-btn");

  function applyContrast() {
    document.body.classList.toggle("high-contrast", contrastOn);
    contrastBtn.setAttribute("aria-pressed", String(contrastOn));
    contrastBtn.textContent = contrastOn ? "Matikan" : "Aktifkan";
    contrastBtn.setAttribute("aria-label", contrastOn ? "Matikan Mode Kontras Tinggi" : "Aktifkan Mode Kontras Tinggi");
    localStorage.setItem("bd-contrast", contrastOn ? "1" : "0");
  }
  applyContrast();

  contrastBtn.addEventListener("click", () => {
    contrastOn = !contrastOn;
    applyContrast();
    showToast(contrastOn ? "Mode kontras tinggi diaktifkan." : "Mode kontras tinggi dimatikan.");
  });

  /* ---- Pembaca Layar / Read Aloud (Web Speech API) ----
     Standard screen-reader behavior, split by input method:
     - Tab (focus) announces the element's NAME.
     - Click announces the RESULT of the action (via the showToast /
       openModal / closeModal hooks in utils/) — since click always fires
       right after focus, its announcement naturally overrides the
       name that focus just spoke. */
  const readToggleBtn = document.getElementById("a11y-read-toggle");

  function applyReadAloud() {
    const on = isReadAloudOn();
    readToggleBtn.setAttribute("aria-pressed", String(on));
    readToggleBtn.textContent = on ? "Matikan" : "Aktifkan";
    readToggleBtn.setAttribute("aria-label", on ? "Matikan Pembaca Layar" : "Aktifkan Pembaca Layar");
  }
  applyReadAloud();

  readToggleBtn.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
      showToast("Browser Anda tidak mendukung Text-to-Speech.", "error");
      return;
    }
    const nextState = !isReadAloudOn();
    setReadAloudOn(nextState);
    applyReadAloud();
    const message = nextState
      ? "Pembaca Layar aktif — tombol yang di-tab akan disebutkan namanya, tombol yang diklik akan mengumumkan hasil aksinya."
      : "Pembaca Layar dimatikan.";
    if (!nextState) speakRaw(message); // flag is already false, so showToast's hook won't speak this — say it directly
    showToast(message);
  });

  // Focus covers keyboard Tab navigation and most mouse clicks on focusable elements.
  document.addEventListener(
    "focus",
    (e) => {
      if (!isReadAloudOn()) return;
      const target = e.target.closest("a, button, input, select, textarea, [tabindex]");
      if (target && target !== readToggleBtn) {
        speakRaw(target.getAttribute("aria-label") || target.textContent.trim().replace(/\s+/g, " "));
      }
    },
    true
  );
});
