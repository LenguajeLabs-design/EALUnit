import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  MAX_PDF_TEXT,
  MAX_SOURCE_TEXT,
  pdfSummarySchema,
  type PdfDocument,
  type PdfPage,
} from '../../shared/curriculum';

type Engine = Pick<typeof import('pdfjs-dist'), 'getDocument'>;
type InputFile = Pick<File, 'name' | 'size' | 'arrayBuffer'>;
export type PdfProgress = (page: number, total: number) => void;

export async function readCurriculumPdf(
  file: InputFile,
  engine: Engine,
  options: {
    signal?: AbortSignal;
    onProgress?: PdfProgress;
    resources?: { cMapUrl: string; standardFontDataUrl: string; wasmUrl: string };
  } = {},
): Promise<PdfDocument> {
  if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Choose a PDF file.');
  if (!file.size || file.size > MAX_PDF_BYTES) throw new Error('Choose a PDF smaller than 20 MB.');
  if (file.name.length > 255)
    throw new Error('Shorten the PDF filename to 255 characters or fewer.');
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (!new TextDecoder('latin1').decode(bytes.subarray(0, 1024)).includes('%PDF-'))
    throw new Error('This file is not a readable PDF. Choose the original PDF document.');
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  const sha256 = Array.from(hash, (value) => value.toString(16).padStart(2, '0')).join('');
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(60000)])
    : AbortSignal.timeout(60000);
  signal.throwIfAborted();
  const task = engine.getDocument({
    data: bytes,
    stopAtErrors: true,
    useSystemFonts: true,
    ...options.resources,
    ...(options.resources ? { cMapPacked: true } : {}),
  });
  const cancel = () => {
    void task.destroy().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES)
      throw new Error(
        'Choose a PDF with up to 100 pages, such as the relevant unit rather than a whole curriculum book.',
      );
    const pages: PdfPage[] = [];
    let characterCount = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      signal.throwIfAborted();
      options.onProgress?.(pageNumber, pdf.numPages);
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
        .join('')
        .replace(/\u0000/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (text.length > MAX_SOURCE_TEXT)
        throw new Error(
          `Page ${pageNumber} contains too much text for this prototype. Upload a shorter excerpt of the curriculum.`,
        );
      characterCount += text.length;
      if (characterCount > MAX_PDF_TEXT)
        throw new Error(
          'This PDF contains too much text. Upload just the unit or section you want to plan from.',
        );
      pages.push({ page: pageNumber, text });
      page.cleanup();
    }
    if (!pages.some((page) => page.text.trim()))
      throw new Error(
        'No readable text was found. This may be a scanned PDF. Run text recognition (OCR) on it, or paste the curriculum overview instead.',
      );
    const summary = pdfSummarySchema.parse({
      id: `pdf-${sha256.slice(0, 32)}`,
      name: file.name,
      size: file.size,
      sha256,
      pageCount: pdf.numPages,
      characterCount,
      createdAt: new Date().toISOString(),
      unreadablePages: pages.filter((page) => !page.text).map((page) => page.page),
    });
    return { ...summary, pages, blob };
  } catch (error) {
    if (signal.aborted)
      throw new Error(
        options.signal?.aborted
          ? 'PDF reading was cancelled.'
          : 'This PDF took too long to read. Try a smaller unit excerpt.',
      );
    if (error instanceof Error && error.name === 'PasswordException')
      throw new Error('This PDF is password-protected. Upload an unlocked copy.');
    if (
      error instanceof Error &&
      ['InvalidPDFException', 'UnknownErrorException', 'FormatError'].includes(error.name)
    )
      throw new Error(
        'This PDF could not be read. Try downloading a fresh copy or paste the unit overview.',
      );
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
    await task.destroy().catch(() => {});
  }
}
