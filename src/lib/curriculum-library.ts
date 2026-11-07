import {
  pdfSummarySchema,
  pdfPageSchema,
  type PdfDocument,
  type PdfSummary,
} from '../../shared/curriculum';

export const CURRICULUM_DB = 'eal-unit-curriculum-v1';

async function openLibrary(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!factory) {
      reject(new Error('Browser storage is unavailable. Allow storage or try another browser.'));
      return;
    }
    let blocked = false;
    const request = factory.open(CURRICULUM_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('documents', { keyPath: 'id' });
      request.result.createObjectStore('content', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(
        new Error(
          'The curriculum library could not be opened. Allow browser storage or try another browser.',
        ),
      );
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close other EAL Unit tabs and try opening the curriculum library again.'));
    };
  });
}

function value<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () =>
      reject(transaction.error ?? new Error('The curriculum PDF could not be saved.'));
  });
}

export async function listCurriculumPdfs(
  factory: IDBFactory = globalThis.indexedDB,
): Promise<PdfSummary[]> {
  const db = await openLibrary(factory);
  try {
    const transaction = db.transaction('documents', 'readonly');
    const complete = finished(transaction);
    const [rows] = await Promise.all([
      value<unknown[]>(transaction.objectStore('documents').getAll()),
      complete,
    ]);
    return rows
      .map((row) => pdfSummarySchema.parse(row))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    db.close();
  }
}

export async function getCurriculumPdf(
  id: string,
  factory: IDBFactory = globalThis.indexedDB,
): Promise<PdfDocument | null> {
  const db = await openLibrary(factory);
  try {
    const transaction = db.transaction(['documents', 'content'], 'readonly');
    const complete = finished(transaction);
    const [summary, content] = await Promise.all([
      value(transaction.objectStore('documents').get(id)),
      value(transaction.objectStore('content').get(id)),
      complete,
    ]);
    if (!summary || !content) return null;
    if (!(content.blob instanceof Blob))
      throw new Error('The saved original PDF is not available. Re-upload the original file.');
    return {
      ...pdfSummarySchema.parse(summary),
      pages: pdfPageSchema.array().parse(content.pages),
      blob: content.blob,
    };
  } finally {
    db.close();
  }
}

export async function saveCurriculumPdf(
  document: PdfDocument,
  factory: IDBFactory = globalThis.indexedDB,
): Promise<void> {
  const { blob, pages, ...summary } = document;
  pdfSummarySchema.parse(summary);
  pdfPageSchema.array().parse(pages);
  const db = await openLibrary(factory);
  try {
    const transaction = db.transaction(['documents', 'content'], 'readwrite');
    const complete = finished(transaction);
    transaction.objectStore('documents').put(summary);
    transaction.objectStore('content').put({ id: document.id, blob, pages });
    await complete;
  } catch {
    throw new Error(
      'The PDF could not be saved in this browser. Free some browser storage and try again. Your unit has not changed.',
    );
  } finally {
    db.close();
  }
}

export async function downloadOriginalPdf(id: string): Promise<void> {
  const document = await getCurriculumPdf(id);
  if (!document)
    throw new Error(
      'The original PDF is not in this browser. Your reviewed page text is still saved with the unit. Re-upload the PDF to keep an original copy here.',
    );
  const url = URL.createObjectURL(document.blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
