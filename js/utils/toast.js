import { speakIfReadAloud } from "./speech.js";

/* ---------- Toast notifications ---------- */
export function showToast(message, type = "success") {
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
  // Toasts are shown exactly when an action completes, so this doubles as
  // the "announce the action that was just performed" hook for Pembaca Layar.
  speakIfReadAloud(message);
}
