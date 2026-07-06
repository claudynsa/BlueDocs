import { initToolModal } from "./tool-modal.js";
import { formatBytes } from "./utils/format.js";
import { openOrganizeModal } from "./organize.js";
import { openSignModal } from "./sign.js";
import "./accessibility-widget.js";
import "./braille.js";

/* ===========================================================
   BlueDocs — Unified Dashboard entry point.
   Merge, split, rotate, watermark, and image→PDF run for real via
   pdf-lib (see REAL_PROCESSORS in pdf/processors.js). Everything
   else is mocked. Site-navigation accessibility (Pembaca Layar,
   High Contrast, Font Size) lives in accessibility-widget.js;
   Braille tools live in braille.js; Atur Halaman and Tanda Tangan
   PDF each have their own dedicated modal module.
   =========================================================== */
const TOOLS = [
  { id: "merge", grid: "grid-organize", icon: "fa-layer-group", title: "Gabung PDF", desc: "Gabungkan beberapa file PDF menjadi satu dokumen.", tag: "Organisasi", real: "merge", multi: true },
  { id: "split", grid: "grid-organize", icon: "fa-scissors", title: "Pisah PDF", desc: "Pisahkan setiap halaman PDF menjadi file terpisah.", tag: "Organisasi", real: "split" },
  { id: "organize", grid: "grid-organize", icon: "fa-folder-tree", title: "Atur Halaman", desc: "Urutkan ulang, tambah, atau hapus halaman PDF.", tag: "Organisasi", customAction: () => openOrganizeModal() },
  { id: "rotate", grid: "grid-organize", icon: "fa-rotate", title: "Rotasi Halaman", desc: "Putar orientasi halaman PDF sesuai kebutuhan.", tag: "Organisasi", rotate: true, real: "rotate" },
  {
    id: "compress", grid: "grid-organize", icon: "fa-compress", title: "Kompres PDF",
    desc: "Perkecil ukuran file PDF tanpa mengubah tampilan.", tag: "Organisasi",
    format: ["Rendah (kualitas tinggi)", "Sedang (seimbang)", "Tinggi (ukuran terkecil)"],
    formatLabel: "Tingkat kompresi",
    afterProcess: (files, ctx) => {
      const original = files[0].size;
      const ratios = { "Rendah (kualitas tinggi)": 0.85, "Sedang (seimbang)": 0.55, "Tinggi (ukuran terkecil)": 0.3 };
      const ratio = ratios[ctx.format] || 0.55;
      const compressed = Math.max(original * ratio, 8 * 1024);
      const pct = Math.round((1 - compressed / original) * 100);
      return `<div class="compress-compare">
        <div><span>Ukuran asli</span><strong>${formatBytes(original)}</strong></div>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        <div><span>Setelah kompresi</span><strong>${formatBytes(compressed)}</strong></div>
        <span class="compress-badge">${pct}% lebih kecil</span>
      </div>`;
    },
  },

  { id: "pdf2word", grid: "grid-convert", icon: "fa-file-word", title: "PDF ke Word", desc: "Konversi dokumen PDF menjadi file Word yang dapat diedit.", tag: "Konversi" },
  {
    id: "pdf2jpg", grid: "grid-convert", icon: "fa-file-image", title: "PDF ke JPG",
    desc: "Ubah setiap halaman PDF menjadi gambar JPG.", tag: "Konversi",
    afterProcess: async (files) => {
      let pageCount = 3;
      try {
        const bytes = await files[0].arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        pageCount = doc.getPageCount();
      } catch (e) {
        // Not a real PDF (expected in a demo) — fall back to a placeholder page count.
      }
      const thumbs = Array.from({ length: Math.min(pageCount, 12) }, (_, i) => `
        <div class="fake-thumb"><i class="fa-solid fa-image" aria-hidden="true"></i><span>Halaman ${i + 1}</span></div>
      `).join("");
      return `<div class="fake-thumb-grid">${thumbs}</div>
        <p style="font-size:0.78rem;color:var(--ink-500);margin-top:8px;">Pratinjau simulasi — unduh hasil di atas untuk file placeholder.</p>`;
    },
  },
  { id: "toPdf", grid: "grid-convert", icon: "fa-file-pdf", title: "Word ke PDF", desc: "Ubah file Word, Excel, PPT, atau gambar menjadi PDF.", tag: "Konversi", format: ["Word (.docx)", "Excel (.xlsx)", "PowerPoint (.pptx)", "Gambar (.jpg/.png)"], formatLabel: "Format asal file", real: "toPdf" },
  {
    id: "ocr", grid: "grid-convert", icon: "fa-magnifying-glass", title: "OCR",
    desc: "Kenali teks pada dokumen hasil scan atau gambar agar dapat dicari & disalin.", tag: "Konversi",
    afterProcess: (files) => `<div class="field ocr-result" style="margin-top:14px;">
        <label>Teks hasil OCR (simulasi)</label>
        <textarea readonly>Ini adalah simulasi hasil pengenalan teks (OCR) dari berkas "${files[0].name}". Pada versi produksi, teks asli yang tercetak atau ditulis tangan pada dokumen akan diekstrak di sini dan dapat disalin atau dicari.</textarea>
      </div>`,
  },

  {
    id: "protect", grid: "grid-security", icon: "fa-lock", title: "Lindungi PDF",
    desc: "Tambahkan kata sandi agar dokumen lebih aman.", tag: "Keamanan",
    password: true, passwordLabel: "Buat kata sandi baru", showStrength: true, confirmPassword: true,
  },
  { id: "unlock", grid: "grid-security", icon: "fa-lock-open", title: "Buka Proteksi PDF", desc: "Hapus kata sandi dari file PDF yang terkunci.", tag: "Keamanan", password: true, passwordLabel: "Kata sandi PDF saat ini" },
  { id: "watermark", grid: "grid-security", icon: "fa-droplet", title: "Tambah Watermark", desc: "Sisipkan teks watermark ke seluruh halaman dokumen.", tag: "Keamanan", text: "Teks watermark", real: "watermark" },
  { id: "sign", grid: "grid-security", icon: "fa-signature", title: "Tanda Tangan PDF", desc: "Bubuhkan tanda tangan digital pada dokumen.", tag: "Keamanan", customAction: () => openSignModal() },
];

initToolModal(TOOLS);
