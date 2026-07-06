/* ===========================================================
   PDF processing helpers — mock progress simulation, real
   pdf-lib-powered processors, and small file/blob utilities.
   PDFLib is loaded globally via a classic <script> CDN tag, so it's
   referenced here as a global rather than imported.
   =========================================================== */

export function isPdfFile(file) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function renameWithSuffix(filename, suffix) {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return `${filename}-${suffix}`;
  return `${filename.slice(0, dot)}-${suffix}${filename.slice(dot)}`;
}

/* Trigger a client-side download of any Blob */
export function downloadBlob(blob, filename) {
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
export function downloadTextFile(filename, content) {
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
}

/* ---------- Mock processing (progress bar simulation) ---------- */
export function runMockProcess({ progressWrap, progressBar, progressLabel, resultBox, resultText, onDone }) {
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

/* Drive the progress UI while a real async task (e.g. a pdf-lib operation) runs.
   The bar animates up to 90% while waiting, then jumps to 100% when the task resolves. */
export function runRealProcess({ progressWrap, progressBar, progressLabel, resultBox }, task) {
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
export const REAL_PROCESSORS = {
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
