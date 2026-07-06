# BlueDocs

Demo landing page + dashboard pengelolaan dokumen PDF dengan pendekatan **Universal Design** — satu pengalaman yang sama untuk semua orang, dengan aksesibilitas sebagai fitur yang bisa diaktifkan siapa saja lewat tombol Accessibility mengambang. Dibangun dengan HTML, CSS, dan JavaScript murni (tanpa build step) sehingga siap di-deploy langsung ke Vercel.

## Struktur

Kode JavaScript memakai **ES Modules native** (`<script type="module">`) — tidak perlu bundler/build step, browser modern memuat `import`/`export` langsung. Satu konsekuensinya: buka lewat server (`npx serve`, Vercel, dsb), bukan dengan membuka file HTML langsung (`file://`), karena browser memblokir import modul di bawah protokol `file://`.

```
index.html                    Landing page: navbar, hero, features, about, contact, footer
dashboard.html                 Dashboard tunggal: semua tools PDF + konversi Braille

css/style.css                  Style dasar bersama (tombol, header, footer, modal, toast, widget Accessibility, mode kontras tinggi)
css/landing.css                 Style khusus landing page (navbar, hero, features, about, contact)
css/dashboard.css              Style khusus dashboard (grid tools, kartu, dsb.)

js/main.js                     Entry point index.html: toggle navbar mobile + impor widget Accessibility
js/dashboard.js                Entry point dashboard.html: katalog TOOLS + impor semua modul fitur
js/tool-modal.js               initToolModal() — kontroler modal generik dipakai semua tool PDF standar
js/accessibility-widget.js     Widget Accessibility mengambang (Read Aloud, High Contrast, Font Size)
js/braille.js                  Kartu + modal konversi Latin/Braille dan Braille Display/Embosser
js/organize.js                 Modal "Atur Halaman" (drag-reorder thumbnail)
js/sign.js                     Modal "Tanda Tangan PDF" (kanvas gambar tanda tangan)
js/pdf/processors.js           REAL_PROCESSORS (pdf-lib) + simulasi progress bar + helper file/blob
js/utils/dom.js                Kontrol modal generik (open/close/focus-trap) + dropzone
js/utils/toast.js              Notifikasi toast
js/utils/speech.js             State Pembaca Layar (Web Speech API) dipakai lintas modul
js/utils/format.js             formatBytes()

assets/logo.webp               Logo BlueDocs (dipakai di navbar, footer, dan favicon)
```

## Prinsip aksesibilitas

Tidak ada lagi pemisahan "Use for Normal People" vs "Use for Disability". Semua pengguna mengakses landing page dan dashboard yang sama:

- **Widget Accessibility** (tombol bulat di pojok kanan bawah, tersedia di semua halaman): Read Aloud (Text-to-Speech membacakan isi halaman), High Contrast Mode, Font Size (A−/A/A+), dan info Keyboard Navigation. Pengaturan kontras & ukuran huruf tersimpan di `localStorage` sehingga konsisten di seluruh halaman.
- **Tools dokumen terkait aksesibilitas** (bagian "Dokumen & Braille" di dashboard, karena ini fitur dokumen — bukan navigasi situs): konversi Latin ⇄ Braille dan integrasi Braille Display/Embosser.
- Semantic HTML + ARIA (`aria-label`, `aria-expanded`, `aria-hidden`, `role`) dan navigasi penuh via keyboard (Tab/Shift+Tab/Enter/Space/Esc) di seluruh komponen interaktif.

## Catatan penting: apa yang nyata vs. simulasi

Ini adalah **demo UI**, bukan produk produksi dengan backend pemrosesan file:

- **Disimulasikan** (progress bar palsu + file hasil berupa teks placeholder): Atur Halaman, Compress PDF, PDF to Word, PDF ke JPG, OCR, Protect/Unlock PDF, Tanda Tangan PDF, serta koneksi ke perangkat Braille Display/Embosser.
- **Benar-benar berfungsi** (tanpa perlu server, pakai library CDN):
  - **Merge PDF, Split PDF, Rotasi Halaman, Watermark, konversi Gambar → PDF** — diproses langsung di browser memakai [pdf-lib](https://pdf-lib.js.org/) via CDN.
  - **Read Aloud** — Web Speech API bawaan browser, membacakan isi halaman yang sedang dibuka.
  - **Konversi Latin ⇄ Braille** — tabel pemetaan Braille Grade 1 standar, hasilnya bisa diunduh sebagai file `.brf`.
  - **High Contrast Mode & Font Size** — toggle CSS murni, tersimpan di `localStorage`.

## Menjalankan secara lokal

Karena JavaScript-nya berupa ES Modules, **harus** dijalankan lewat server statis (tidak bisa dibuka langsung sebagai file `index.html` via `file://`):

```bash
npx serve .
```

## Deploy ke Vercel

Karena seluruhnya statis (tanpa build step), cukup import repo ini ke Vercel dan biarkan "Framework Preset" di-set ke **Other** — tidak perlu build command maupun output directory khusus.
