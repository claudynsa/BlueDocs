import { showToast } from "./utils/toast.js";
import { openModal, wireDropzone } from "./utils/dom.js";
import { runMockProcess, downloadTextFile } from "./pdf/processors.js";

/* ===========================================================
   Atur Halaman — real page count via pdf-lib, drag-to-reorder and
   remove are genuine interactions; saving the new order is simulated.
   PDFLib is loaded globally via a classic <script> CDN tag.
   =========================================================== */
let organizeFile = null;
let organizePages = []; // [{ label }]

export function openOrganizeModal() {
  organizeFile = null;
  organizePages = [];
  document.getElementById("organize-file-name").textContent = "";
  document.getElementById("organize-page-list").innerHTML = "";
  document.getElementById("organize-progress-wrap").classList.remove("active");
  document.getElementById("organize-result-box").classList.remove("show");
  openModal(document.getElementById("organize-modal-overlay"));
}

function renderOrganizePages() {
  const list = document.getElementById("organize-page-list");
  list.innerHTML = "";
  organizePages.forEach((page, index) => {
    const item = document.createElement("div");
    item.className = "page-organize-item";
    item.draggable = true;
    item.dataset.index = String(index);
    item.innerHTML = `
      <i class="fa-solid fa-file-lines" aria-hidden="true"></i>
      <span>${page.label}</span>
      <button type="button" class="page-remove" aria-label="Hapus ${page.label}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    `;
    item.querySelector(".page-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      organizePages.splice(index, 1);
      renderOrganizePages();
      showToast(`${page.label} dihapus dari susunan.`);
    });
    item.addEventListener("dragstart", () => item.classList.add("dragging"));
    item.addEventListener("dragend", () => {
      list.querySelectorAll(".page-organize-item").forEach((el) => el.classList.remove("dragging", "drag-over"));
    });
    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      item.classList.add("drag-over");
    });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
    item.addEventListener("drop", (e) => {
      e.preventDefault();
      const draggingEl = list.querySelector(".dragging");
      if (!draggingEl) return;
      const draggedIndex = Number(draggingEl.dataset.index);
      const targetIndex = Number(item.dataset.index);
      const [moved] = organizePages.splice(draggedIndex, 1);
      organizePages.splice(targetIndex, 0, moved);
      renderOrganizePages();
      showToast("Urutan halaman diperbarui.");
    });
    list.appendChild(item);
  });
}

wireDropzone(document.getElementById("organize-dropzone"), async (files) => {
  organizeFile = files[0];
  let pageCount = 5;
  try {
    const bytes = await organizeFile.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(bytes);
    pageCount = doc.getPageCount();
  } catch (e) {
    showToast("File bukan PDF yang valid — menampilkan pratinjau contoh.", "error");
  }
  organizePages = Array.from({ length: pageCount }, (_, i) => ({ label: `Halaman ${i + 1}` }));
  renderOrganizePages();
});

document.getElementById("organize-save-btn").addEventListener("click", () => {
  if (!organizeFile) {
    showToast("Silakan unggah file PDF terlebih dahulu.", "error");
    return;
  }
  runMockProcess({
    progressWrap: document.getElementById("organize-progress-wrap"),
    progressBar: document.getElementById("organize-progress-bar"),
    progressLabel: document.getElementById("organize-progress-label"),
    resultBox: document.getElementById("organize-result-box"),
    resultText: document.getElementById("organize-result-text"),
    onDone: () => {
      document.getElementById("organize-result-text").textContent = `Urutan halaman berhasil disimpan (${organizePages.length} halaman)!`;
      showToast("Atur Halaman selesai diproses.", "success");
    },
  });
});

document.getElementById("organize-download-btn").addEventListener("click", () => {
  const order = organizePages.map((p) => p.label).join(", ") || "(tidak ada halaman)";
  const content =
    `BlueDocs — Hasil Simulasi\nTool: Atur Halaman\nWaktu: ${new Date().toLocaleString("id-ID")}\n\n` +
    `Urutan halaman akhir: ${order}`;
  downloadTextFile("hasil-simulasi-organize.txt", content);
  showToast("Unduhan hasil simulasi dimulai.", "success");
});
