import { readCurriculumPdf, type PdfProgress } from './pdf-reader';

export async function readBrowserPdf(file: File, onProgress: PdfProgress, signal: AbortSignal) {
  const [engine, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  engine.GlobalWorkerOptions.workerSrc = worker.default;
  const assets = `${import.meta.env.BASE_URL}pdf-assets/`;
  return readCurriculumPdf(file, engine, {
    signal,
    onProgress,
    resources: {
      cMapUrl: `${assets}cmaps/`,
      standardFontDataUrl: `${assets}standard_fonts/`,
      wasmUrl: `${assets}wasm/`,
    },
  });
}
