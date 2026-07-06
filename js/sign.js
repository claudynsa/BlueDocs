import { showToast } from "./utils/toast.js";
import { openModal, wireDropzone } from "./utils/dom.js";
import { runMockProcess, downloadTextFile } from "./pdf/processors.js";

/* ===========================================================
   Tanda Tangan PDF — real signature drawn on a canvas; applying it
   to the document itself is simulated.
   =========================================================== */
let signFile = null;
let hasSignature = false;

const signCanvas = document.getElementById("sign-canvas");
const signCtx = signCanvas.getContext("2d");
let isDrawingSignature = false;
let lastSignaturePoint = null;

export function openSignModal() {
  signFile = null;
  hasSignature = false;
  document.getElementById("sign-file-name").textContent = "";
  signCtx.clearRect(0, 0, signCanvas.width, signCanvas.height);
  document.getElementById("sign-progress-wrap").classList.remove("active");
  document.getElementById("sign-result-box").classList.remove("show");
  openModal(document.getElementById("sign-modal-overlay"));
}

function getSignaturePoint(e) {
  const rect = signCanvas.getBoundingClientRect();
  const touch = e.touches && e.touches[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (signCanvas.width / rect.width),
    y: (clientY - rect.top) * (signCanvas.height / rect.height),
  };
}

function startSignature(e) {
  isDrawingSignature = true;
  lastSignaturePoint = getSignaturePoint(e);
}
function drawSignature(e) {
  if (!isDrawingSignature) return;
  e.preventDefault();
  const point = getSignaturePoint(e);
  signCtx.strokeStyle = "#123a6e";
  signCtx.lineWidth = 2.5;
  signCtx.lineCap = "round";
  signCtx.beginPath();
  signCtx.moveTo(lastSignaturePoint.x, lastSignaturePoint.y);
  signCtx.lineTo(point.x, point.y);
  signCtx.stroke();
  lastSignaturePoint = point;
  hasSignature = true;
}
function endSignature() {
  isDrawingSignature = false;
}

signCanvas.addEventListener("mousedown", startSignature);
signCanvas.addEventListener("mousemove", drawSignature);
window.addEventListener("mouseup", endSignature);
signCanvas.addEventListener("touchstart", startSignature);
signCanvas.addEventListener("touchmove", drawSignature);
signCanvas.addEventListener("touchend", endSignature);

wireDropzone(document.getElementById("sign-dropzone"), (files) => {
  signFile = files[0];
});

document.getElementById("sign-clear-btn").addEventListener("click", () => {
  signCtx.clearRect(0, 0, signCanvas.width, signCanvas.height);
  hasSignature = false;
  showToast("Coretan tanda tangan dihapus.");
});

document.getElementById("sign-apply-btn").addEventListener("click", () => {
  if (!signFile) {
    showToast("Silakan unggah file terlebih dahulu.", "error");
    return;
  }
  if (!hasSignature) {
    showToast("Silakan gambar tanda tangan terlebih dahulu.", "error");
    return;
  }
  runMockProcess({
    progressWrap: document.getElementById("sign-progress-wrap"),
    progressBar: document.getElementById("sign-progress-bar"),
    progressLabel: document.getElementById("sign-progress-label"),
    resultBox: document.getElementById("sign-result-box"),
    resultText: document.getElementById("sign-result-text"),
    onDone: () => {
      document.getElementById("sign-result-text").textContent = "Tanda tangan berhasil diterapkan ke dokumen!";
      showToast("Tanda Tangan PDF selesai diproses.", "success");
    },
  });
});

document.getElementById("sign-download-btn").addEventListener("click", () => {
  const content =
    `BlueDocs — Hasil Simulasi\nTool: Tanda Tangan PDF\nWaktu: ${new Date().toLocaleString("id-ID")}\n\n` +
    `Dokumen "${signFile ? signFile.name : ""}" telah dibubuhi tanda tangan digital.`;
  downloadTextFile("hasil-simulasi-sign.txt", content);
  showToast("Unduhan hasil simulasi dimulai.", "success");
});
