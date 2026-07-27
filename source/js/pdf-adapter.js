window.NaviPdfReady = (async () => {
  try {
    const pdfjsLib = await import(
      'https://esm.sh/pdfjs-dist'
    );

    window.pdfjsLib = pdfjsLib;

if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist/build/pdf.worker.mjs';
}

    console.log('NaviPdf loaded.');

    return true;
  }
  catch (error) {
    console.error('NaviPdf failed.', error);
    return false;
  }
})();
