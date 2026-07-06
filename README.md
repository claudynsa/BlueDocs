# BlueDocs

Demo landing page + dashboard pengelolaan dokumen PDF dengan pendekatan **Universal Design** — satu pengalaman yang sama untuk semua orang, dengan aksesibilitas sebagai fitur yang bisa diaktifkan siapa saja lewat tombol Accessibility mengambang. Dibangun dengan HTML, CSS, dan JavaScript murni (tanpa build step) sehingga siap di-deploy langsung ke Vercel.

## Struktur

```
index.html                  Landing page: navbar, hero, features, about, contact, footer
dashboard.html               Dashboard tunggal: semua tools PDF + konversi Braille
css/style.css                Style dasar bersama (tombol, header, footer, modal, toast, widget Accessibility, mode kontras tinggi)
css/landing.css               Style khusus landing page (navbar, hero, features, about, contact)
css/dashboard.css            Style khusus dashboard (grid tools)
js/main.js                   Utilitas bersama: toast, modal, dropzone, simulasi progress, REAL_PROCESSORS (pdf-lib),
                              initToolModal() (kontroler modal tool generik), dan widget Accessibility mengambang
js/dashboard.js              Katalog tools PDF + logika konversi Braille & Braille Display/Embosser
assets/logo.webp              Logo BlueDocs (dipakai di navbar, footer, dan favicon)
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

Buka `index.html` langsung di browser, atau jalankan server statis sederhana, misalnya:

```bash
npx serve .
```

## Deploy ke Vercel

Karena seluruhnya statis (tanpa build step), cukup import repo ini ke Vercel dan biarkan "Framework Preset" di-set ke **Other** — tidak perlu build command maupun output directory khusus.
