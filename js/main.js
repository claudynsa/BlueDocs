/* ===========================================================
   BlueDocs — Shared utilities (toast, modal, dropzone, mock process)
   =========================================================== */

/* ---------- Toast notifications ---------- */
function showToast(message, type = "success") {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  const iconClass = type === "success" ? "fa-circle-check" : type === "error" ? "fa-triangle-exclamation" : "fa-circle-info";
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true"><i class="fa-solid ${iconClass}"></i></span><span>${message}</span>`;
  region.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 300ms ease";
    setTimeout(() => toast.remove(), 320);
  }, 3600);
}

/* ---------- Generic modal control ---------- */
let lastFocusedEl = null;

function openModal(overlayEl) {
  lastFocusedEl = document.activeElement;
  overlayEl.classList.add("open");
  overlayEl.setAttribute("aria-hidden", "false");
  const focusTarget = overlayEl.querySelector("[data-autofocus]") || overlayEl.querySelector(".modal-close");
  if (focusTarget) focusTarget.focus();
  document.addEventListener("keydown", trapEscape);
}

function closeModal(overlayEl) {
  overlayEl.classList.remove("open");
  overlayEl.setAttribute("aria-hidden", "true");
  document.removeEventListener("keydown", trapEscape);
  if (lastFocusedEl) lastFocusedEl.focus();
}

function trapEscape(e) {
  if (e.key === "Escape") {
    const openOverlay = document.querySelector(".modal-overlay.open");
    if (openOverlay) closeModal(openOverlay);
  }
}

/* Wire up any element with [data-close-modal] inside an overlay, and overlay background click */
document.addEventListener("click", (e) => {
  const closeBtn = e.target.closest("[data-close-modal]");
  if (closeBtn) {
    const overlay = closeBtn.closest(".modal-overlay");
    if (overlay) closeModal(overlay);
  }
  if (e.target.classList && e.target.classList.contains("modal-overlay")) {
    closeModal(e.target);
  }
});

/* ---------- Dropzone wiring ---------- */
function wireDropzone(dropzoneEl, onFileSelected) {
  const input = dropzoneEl.querySelector('input[type="file"]');
  const nameLabel = dropzoneEl.querySelector(".file-name");

  dropzoneEl.addEventListener("click", () => input && input.click());
  dropzoneEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input && input.click();
    }
  });

  ["dragenter", "dragover"].forEach((evt) =>
    dropzoneEl.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzoneEl.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzoneEl.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzoneEl.classList.remove("dragover");
    })
  );
  dropzoneEl.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length) {
      handleFiles(files);
    }
  });
  if (input) {
    input.addEventListener("change", () => {
      if (input.files && input.files.length) handleFiles(input.files);
    });
  }

  function handleFiles(files) {
    const names = Array.from(files).map((f) => f.name).join(", ");
    if (nameLabel) nameLabel.innerHTML = `<i class="fa-solid fa-file" aria-hidden="true"></i> ${names}`;
    if (onFileSelected) onFileSelected(files);
  }
}

/* ---------- Mock processing (progress bar simulation) ---------- */
function runMockProcess({ progressWrap, progressBar, progressLabel, resultBox, resultText, onDone }) {
  progressWrap.classList.add("active");
  resultBox.classList.remove("show");
  let pct = 0;
  progressBar.style.width = "0%";
  const interval = setInterval(() => {
    pct += Math.random() * 18 + 8;
    if (pct >= 100) {
      pct = 100;
      clearInterval(interval);
      progressLabel.textContent = "Selesai!";
      resultBox.classList.add("show");
      if (onDone) onDone();
    } else {
      progressLabel.textContent = `Memproses... ${Math.floor(pct)}%`;
    }
    progressBar.style.width = pct + "%";
  }, 220);
}

/* Trigger a client-side download of any Blob */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Trigger a client-side download of a text blob — used to simulate a "result file" */
function downloadTextFile(filename, content) {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
}

/* ---------- Real PDF processing helpers (used with the pdf-lib CDN library) ---------- */
function isPdfFile(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function renameWithSuffix(filename, suffix) {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return `${filename}-${suffix}`;
  return `${filename.slice(0, dot)}-${suffix}${filename.slice(dot)}`;
}

/* Drive the progress UI while a real async task (e.g. a pdf-lib operation) runs.
   The bar animates up to 90% while waiting, then jumps to 100% when the task resolves. */
function runRealProcess({ progressWrap, progressBar, progressLabel, resultBox }, task) {
  progressWrap.classList.add("active");
  resultBox.classList.remove("show");
  progressBar.style.width = "0%";
  let pct = 0;
  const interval = setInterval(() => {
    pct = Math.min(pct + Math.random() * 10 + 4, 90);
    progressBar.style.width = pct + "%";
    progressLabel.textContent = `Memproses... ${Math.floor(pct)}%`;
  }, 180);

  return task().then(
    (result) => {
      clearInterval(interval);
      progressBar.style.width = "100%";
      progressLabel.textContent = "Selesai!";
      resultBox.classList.add("show");
      return result;
    },
    (err) => {
      clearInterval(interval);
      progressWrap.classList.remove("active");
      throw err;
    }
  );
}

/* ===========================================================
   Real PDF processors — powered by the pdf-lib CDN library.
   Each function receives the selected File(s) and a context object
   with whatever field values the tool's modal collected, and resolves to
   either { blob, filename }, { multi: true, count } (already downloaded
   itself), or null to signal "not supported for this input — fall back
   to the mock simulation" (used by toPdf for non-image formats).
   =========================================================== */
const REAL_PROCESSORS = {
  rotate: async (files, ctx) => {
    const file = files[0];
    if (!isPdfFile(file)) throw new Error("File harus berformat PDF (.pdf).");
    const bytes = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(bytes);
    const angle = Number(ctx.rotate || 90);
    pdfDoc.getPages().forEach((page) => {
      page.setRotation(PDFLib.degrees(page.getRotation().angle + angle));
    });
    const outBytes = await pdfDoc.save();
    return { blob: new Blob([outBytes], { type: "application/pdf" }), filename: renameWithSuffix(file.name, "rotated") };
  },

  watermark: async (files, ctx) => {
    const file = files[0];
    if (!isPdfFile(file)) throw new Error("File harus berformat PDF (.pdf).");
    const text = (ctx.text || "").trim() || "BlueDocs";
    const bytes = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const size = 36;
    const textWidth = font.widthOfTextAtSize(text, size);
    pdfDoc.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size,
        font,
        color: PDFLib.rgb(0.35, 0.5, 0.75),
        opacity: 0.35,
        rotate: PDFLib.degrees(45),
      });
    });
    const outBytes = await pdfDoc.save();
    return { blob: new Blob([outBytes], { type: "application/pdf" }), filename: renameWithSuffix(file.name, "watermarked") };
  },

  merge: async (files) => {
    if (files.length < 2) throw new Error("Pilih minimal 2 file PDF untuk digabungkan.");
    for (const f of files) {
      if (!isPdfFile(f)) throw new Error(`"${f.name}" bukan file PDF.`);
    }
    const merged = await PDFLib.PDFDocument.create();
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const src = await PDFLib.PDFDocument.load(bytes);
      const copiedPages = await merged.copyPages(src, src.getPageIndices());
      copiedPages.forEach((page) => merged.addPage(page));
    }
    const outBytes = await merged.save();
    return { blob: new Blob([outBytes], { type: "application/pdf" }), filename: "bluedocs-merged.pdf" };
  },

  split: async (files) => {
    const file = files[0];
    if (!isPdfFile(file)) throw new Error("File harus berformat PDF (.pdf).");
    const bytes = await file.arrayBuffer();
    const src = await PDFLib.PDFDocument.load(bytes);
    const total = src.getPageCount();
    if (total < 2) throw new Error("PDF hanya memiliki 1 halaman, tidak perlu dipisah.");
    for (let i = 0; i < total; i++) {
      const doc = await PDFLib.PDFDocument.create();
      const [page] = await doc.copyPages(src, [i]);
      doc.addPage(page);
      const outBytes = await doc.save();
      downloadBlob(new Blob([outBytes], { type: "application/pdf" }), renameWithSuffix(file.name, `halaman-${i + 1}`));
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return { multi: true, count: total };
  },

  toPdf: async (files, ctx) => {
    const file = files[0];
    if (ctx.format !== "Gambar (.jpg/.png)") return null;
    if (!file.type.startsWith("image/")) throw new Error("Untuk konversi nyata, unggah file gambar (.jpg/.png).");
    const bytes = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.create();
    const img = file.type === "image/png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    const outBytes = await pdfDoc.save();
    return {
      blob: new Blob([outBytes], { type: "application/pdf" }),
      filename: file.name.replace(/\.[^.]+$/, "") + "-converted.pdf",
    };
  },
};

/* ===========================================================
   Generic PDF-tool modal controller — shared by both dashboards.
   Renders tool cards into their grids and wires the shared modal
   (#tool-modal-overlay) to either run a REAL_PROCESSORS entry or
   fall back to the mock progress-bar simulation.
   Returns { openTool } so callers can open ad-hoc tool objects
   that aren't part of the rendered grid (e.g. the a11y OCR card).
   =========================================================== */
function initToolModal(TOOLS) {
  let activeTool = null;
  let selectedFiles = [];
  let lastResultBlob = null;
  let lastResultFilename = null;
  let resultMode = null; // 'real' | 'multi' | 'mock'

  const overlay = document.getElementById("tool-modal-overlay");
  const dropzone = document.getElementById("tool-dropzone");
  const fileInput = document.getElementById("tool-file-input");
  const fileNameEl = document.getElementById("tool-file-name");
  const hintEl = document.getElementById("tool-dropzone-hint");
  const multiHintEl = document.getElementById("tool-dropzone-multi-hint");
  const formatLabelEl = document.getElementById("tool-format-label");

  function renderTools() {
    TOOLS.forEach((tool) => {
      const grid = document.getElementById(tool.grid);
      if (!grid) return;
      const card = document.createElement("button");
      card.className = "tool-card";
      card.type = "button";
      card.setAttribute("aria-label", `${tool.title} — ${tool.desc}`);
      card.innerHTML = `
        <div class="tool-icon" aria-hidden="true"><i class="fa-solid ${tool.icon}"></i></div>
        <span class="tool-tag">${tool.tag}</span>
        <h3>${tool.title}</h3>
        <p>${tool.desc}</p>
      `;
      card.addEventListener("click", () => openTool(tool));
      grid.appendChild(card);
    });
  }

  function openTool(tool) {
    activeTool = tool;
    selectedFiles = [];
    lastResultBlob = null;
    lastResultFilename = null;
    resultMode = null;

    document.getElementById("tool-modal-title").textContent = tool.title;
    document.getElementById("tool-modal-desc").textContent = tool.desc;
    fileNameEl.textContent = "";
    document.getElementById("tool-progress-wrap").classList.remove("active");
    document.getElementById("tool-result-box").classList.remove("show");

    if (fileInput) fileInput.toggleAttribute("multiple", !!tool.multi);
    if (multiHintEl) multiHintEl.textContent = tool.multi ? " (boleh pilih beberapa file sekaligus)" : "";
    if (hintEl) {
      hintEl.textContent = tool.real
        ? "Diproses langsung di browser Anda — tidak diunggah ke server manapun."
        : "(Simulasi — file tidak benar-benar diunggah)";
    }

    const fieldFormat = document.getElementById("field-format");
    const fieldPassword = document.getElementById("field-password");
    const fieldText = document.getElementById("field-text");
    const fieldRotate = document.getElementById("field-rotate");

    fieldFormat.hidden = !tool.format;
    if (tool.format) {
      document.getElementById("tool-format").innerHTML = tool.format.map((f) => `<option>${f}</option>`).join("");
      if (formatLabelEl) formatLabelEl.textContent = tool.formatLabel || "Format tujuan";
    }

    fieldPassword.hidden = !tool.password;
    document.getElementById("tool-password").value = "";

    fieldText.hidden = !tool.text;
    if (tool.text) document.getElementById("tool-text-label").textContent = tool.text;
    document.getElementById("tool-text").value = "";

    fieldRotate.hidden = !tool.rotate;

    openModal(overlay);
  }

  wireDropzone(dropzone, (files) => {
    selectedFiles = Array.from(files);
  });

  document.getElementById("tool-process-btn").addEventListener("click", async () => {
    if (!activeTool) return;
    if (!selectedFiles.length) {
      showToast("Silakan unggah file terlebih dahulu.", "error");
      return;
    }
    if (activeTool.password && !document.getElementById("tool-password").value.trim()) {
      showToast("Silakan isi kata sandi terlebih dahulu.", "error");
      return;
    }

    const progressUi = {
      progressWrap: document.getElementById("tool-progress-wrap"),
      progressBar: document.getElementById("tool-progress-bar"),
      progressLabel: document.getElementById("tool-progress-label"),
      resultBox: document.getElementById("tool-result-box"),
    };
    const resultText = document.getElementById("tool-result-text");
    const processor = activeTool.real && REAL_PROCESSORS[activeTool.real];

    if (!processor) {
      resultMode = "mock";
      runMockProcess({
        ...progressUi,
        resultText,
        onDone: () => {
          resultText.textContent = `${activeTool.title} berhasil diproses!`;
          showToast(`${activeTool.title} selesai diproses.`, "success");
        },
      });
      return;
    }

    const ctx = {
      rotate: document.getElementById("tool-rotate").value,
      text: document.getElementById("tool-text").value,
      format: activeTool.format ? document.getElementById("tool-format").value : undefined,
    };

    try {
      const result = await runRealProcess(progressUi, () => processor(selectedFiles, ctx));
      if (result === null) {
        resultMode = "mock";
        resultText.textContent = `${activeTool.title} berhasil diproses! (Simulasi — format ini belum didukung untuk konversi nyata di browser.)`;
        document.getElementById("tool-result-box").classList.add("show");
        showToast(`${activeTool.title} selesai diproses (simulasi).`, "success");
      } else if (result.multi) {
        resultMode = "multi";
        resultText.textContent = `Berhasil! ${result.count} halaman sudah diunduh sebagai file PDF terpisah.`;
        showToast(`${activeTool.title} selesai diproses.`, "success");
      } else {
        resultMode = "real";
        lastResultBlob = result.blob;
        lastResultFilename = result.filename;
        resultText.textContent = `${activeTool.title} berhasil diproses! File siap diunduh.`;
        showToast(`${activeTool.title} selesai diproses.`, "success");
      }
    } catch (err) {
      showToast(err.message || "Gagal memproses file.", "error");
    }
  });

  document.getElementById("tool-download-btn").addEventListener("click", () => {
    if (!activeTool) return;
    if (resultMode === "real" && lastResultBlob) {
      downloadBlob(lastResultBlob, lastResultFilename);
      showToast("File berhasil diunduh.", "success");
      return;
    }
    if (resultMode === "multi") {
      showToast("Semua file hasil sudah diunduh otomatis satu per satu.", "success");
      return;
    }
    const content =
      `BlueDocs — Hasil Simulasi\n` +
      `Tool: ${activeTool.title}\n` +
      `Waktu: ${new Date().toLocaleString("id-ID")}\n\n` +
      `Ini adalah file placeholder untuk mendemonstrasikan alur kerja "${activeTool.title}".\n` +
      `Pada versi produksi, file ini akan berisi hasil pemrosesan dokumen PDF Anda yang sesungguhnya.`;
    downloadTextFile(`hasil-simulasi-${activeTool.id}.txt`, content);
    showToast("Unduhan hasil simulasi dimulai.", "success");
  });

  renderTools();

  return { openTool };
}

/* Mobile nav toggle hook (if a page includes a hamburger button) */
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav-menu]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }
});

/* ===========================================================
   Floating Accessibility widget — shared by every page.
   Covers site-navigation accessibility only (Read Aloud of the
   current page, High Contrast, Font Size, Keyboard Navigation info).
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
    localStorage.setItem("bd-contrast", contrastOn ? "1" : "0");
  }
  applyContrast();

  contrastBtn.addEventListener("click", () => {
    contrastOn = !contrastOn;
    applyContrast();
    showToast(contrastOn ? "Mode kontras tinggi diaktifkan." : "Mode kontras tinggi dimatikan.");
  });

  /* ---- Read Aloud (Web Speech API, reads the page's main content) ---- */
  document.getElementById("a11y-read-btn").addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
      showToast("Browser Anda tidak mendukung Text-to-Speech.", "error");
      return;
    }
    const main = document.querySelector("main");
    const text = main ? main.innerText.trim() : "";
    if (!text) {
      showToast("Tidak ada konten untuk dibacakan.", "error");
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "id-ID";
    utter.onend = () => showToast("Pembacaan selesai.");
    window.speechSynthesis.speak(utter);
    showToast("Membacakan halaman ini...");
  });

  document.getElementById("a11y-stop-btn").addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    showToast("Pembacaan dihentikan.");
  });
});
