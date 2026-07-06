import { showToast } from "./utils/toast.js";
import { openModal, wireDropzone } from "./utils/dom.js";
import { runMockProcess, runRealProcess, REAL_PROCESSORS, downloadBlob, downloadTextFile } from "./pdf/processors.js";

/* ===========================================================
   Generic PDF-tool modal controller — shared by both dashboards.
   Renders tool cards into their grids and wires the shared modal
   (#tool-modal-overlay) to either run a REAL_PROCESSORS entry or
   fall back to the mock progress-bar simulation.
   Returns { openTool } so callers can open ad-hoc tool objects
   that aren't part of the rendered grid.
   =========================================================== */
export function initToolModal(TOOLS) {
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
  const resultExtraEl = document.getElementById("tool-result-extra");
  const passwordInput = document.getElementById("tool-password");
  const strengthWrap = document.getElementById("tool-password-strength");
  const strengthBar = document.getElementById("tool-password-strength-bar");
  const strengthLabel = document.getElementById("tool-password-strength-label");

  function passwordStrength(value) {
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    if (!value) return { pct: 0, label: "Kekuatan kata sandi", color: "var(--danger)" };
    if (score <= 1) return { pct: 25, label: "Lemah", color: "var(--danger)" };
    if (score <= 3) return { pct: 60, label: "Cukup", color: "var(--warning)" };
    return { pct: 100, label: "Kuat", color: "var(--success)" };
  }

  passwordInput.addEventListener("input", () => {
    if (!activeTool || !activeTool.showStrength) return;
    const { pct, label, color } = passwordStrength(passwordInput.value);
    strengthBar.style.width = pct + "%";
    strengthBar.style.background = color;
    strengthLabel.textContent = label;
  });

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
        <h3>${tool.title}</h3>
        <p>${tool.desc}</p>
      `;
      card.addEventListener("click", () => (tool.customAction ? tool.customAction() : openTool(tool)));
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
    resultExtraEl.innerHTML = "";

    if (fileInput) fileInput.toggleAttribute("multiple", !!tool.multi);
    if (multiHintEl) multiHintEl.textContent = tool.multi ? " (boleh pilih beberapa file sekaligus)" : "";
    if (hintEl) {
      hintEl.textContent = tool.real
        ? "Diproses langsung di browser Anda — tidak diunggah ke server manapun."
        : "(Simulasi — file tidak benar-benar diunggah)";
    }

    const fieldFormat = document.getElementById("field-format");
    const fieldPassword = document.getElementById("field-password");
    const fieldConfirmPassword = document.getElementById("field-confirm-password");
    const fieldText = document.getElementById("field-text");
    const fieldRotate = document.getElementById("field-rotate");

    fieldFormat.hidden = !tool.format;
    if (tool.format) {
      document.getElementById("tool-format").innerHTML = tool.format.map((f) => `<option>${f}</option>`).join("");
      if (formatLabelEl) formatLabelEl.textContent = tool.formatLabel || "Format tujuan";
    }

    fieldPassword.hidden = !tool.password;
    document.getElementById("tool-password-label").textContent = tool.passwordLabel || "Kata sandi";
    document.getElementById("tool-password").value = "";
    strengthWrap.hidden = !tool.showStrength;
    strengthBar.style.width = "0%";
    strengthLabel.textContent = "Kekuatan kata sandi";

    fieldConfirmPassword.hidden = !tool.confirmPassword;
    document.getElementById("tool-confirm-password").value = "";

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
    if (activeTool.password && !passwordInput.value.trim()) {
      showToast("Silakan isi kata sandi terlebih dahulu.", "error");
      return;
    }
    if (activeTool.confirmPassword && passwordInput.value !== document.getElementById("tool-confirm-password").value) {
      showToast("Konfirmasi kata sandi tidak cocok.", "error");
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

    const ctx = {
      rotate: document.getElementById("tool-rotate").value,
      text: document.getElementById("tool-text").value,
      format: activeTool.format ? document.getElementById("tool-format").value : undefined,
    };

    async function showExtraPreview() {
      if (!activeTool.afterProcess) return;
      try {
        const html = await activeTool.afterProcess(selectedFiles, ctx);
        if (html) resultExtraEl.innerHTML = html;
      } catch (err) {
        // Preview generation is a cosmetic bonus — never block the main success flow on it.
      }
    }

    if (!processor) {
      resultMode = "mock";
      runMockProcess({
        ...progressUi,
        resultText,
        onDone: async () => {
          resultText.textContent = `${activeTool.title} berhasil diproses!`;
          showToast(`${activeTool.title} selesai diproses.`, "success");
          await showExtraPreview();
        },
      });
      return;
    }

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
      await showExtraPreview();
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
