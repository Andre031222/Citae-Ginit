let pdfjsPromise = null;

function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function renderPdfFirstPage(url, { width = 200 } = {}) {
  const pdfjs = await getPdfjs();

  const task = pdfjs.getDocument({
    url,
    disableAutoFetch: true,
    disableStream: false,
    rangeChunkSize: 65536,
  });

  let pdf;
  try {
    pdf = await task.promise;
    const page = await pdf.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const scale = width / base.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    page.cleanup();
    return dataUrl;
  } finally {
    if (pdf) { pdf.cleanup(); pdf.destroy(); }
  }
}
