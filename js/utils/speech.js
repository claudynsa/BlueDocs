/* ===========================================================
   Pembaca Layar (screen-reader simulation) — shared speech state.
   Focus (Tab) announces an element's NAME; completed actions (toasts,
   opening/closing dialogs) announce the RESULT of what just happened.
   See accessibility-widget.js for the on/off toggle and focus listener.
   =========================================================== */
let readAloudOn = false;

export function isReadAloudOn() {
  return readAloudOn;
}

export function setReadAloudOn(value) {
  readAloudOn = value;
}

export function speakRaw(text) {
  if (!text || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "id-ID";
  window.speechSynthesis.speak(utter);
}

export function speakIfReadAloud(text) {
  if (readAloudOn) speakRaw(text);
}
