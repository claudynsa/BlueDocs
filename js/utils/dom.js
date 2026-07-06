import { speakIfReadAloud } from "./speech.js";

/* ---------- Generic modal control ---------- */
let lastFocusedEl = null;

export function openModal(overlayEl) {
  lastFocusedEl = document.activeElement;
  overlayEl.classList.add("open");
  overlayEl.setAttribute("aria-hidden", "false");
  const focusTarget = overlayEl.querySelector("[data-autofocus]") || overlayEl.querySelector(".modal-close");
  if (focusTarget) focusTarget.focus();
  document.addEventListener("keydown", trapEscape);

  const labelledBy = overlayEl.getAttribute("aria-labelledby");
  const titleEl = labelledBy && document.getElementById(labelledBy);
  if (titleEl) speakIfReadAloud(`${titleEl.textContent.trim().replace(/\s+/g, " ")} dibuka.`);
}

export function closeModal(overlayEl) {
  overlayEl.classList.remove("open");
  overlayEl.setAttribute("aria-hidden", "true");
  document.removeEventListener("keydown", trapEscape);
  if (lastFocusedEl) lastFocusedEl.focus();
  speakIfReadAloud("Dialog ditutup.");
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
export function wireDropzone(dropzoneEl, onFileSelected) {
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
