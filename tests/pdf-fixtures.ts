import { PDFDocument, StandardFonts } from 'pdf-lib';
import { sourceFromPages, type PdfDocument } from '../shared/curriculum';

export const curriculumPages = [
  'Reading workshop: Character change\nReaders explain how a character changes across a story.\nStudents compare earlier and later actions using relevant details.\nDuring discussion, students explain why their chosen detail supports an interpretation.',
  'Evidence and language\nStudents connect an interpretation to a relevant detail from the text.\nProtected EAL time includes oral rehearsal and comparison language.\nStudents choose their own evidence and wording before writing an explanation.',
];
export async function pdfBytes(pages = curriculumPages): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const text of pages) {
    const page = pdf.addPage([612, 792]);
    if (text) page.drawText(text, { x: 48, y: 735, size: 12, lineHeight: 20, font, maxWidth: 516 });
    else page.drawRectangle({ x: 40, y: 40, width: 250, height: 250 });
  }
  return pdf.save();
}
export function fixtureDocument(hashCharacter = 'a'): PdfDocument {
  const sha256 = hashCharacter.repeat(64);
  const pages = curriculumPages.map((text, index) => ({ page: index + 1, text }));
  return {
    id: `pdf-${sha256.slice(0, 32)}`,
    name: 'Character-change-curriculum.pdf',
    size: 1000,
    sha256,
    pageCount: 2,
    createdAt: new Date().toISOString(),
    characterCount: pages.reduce((sum, page) => sum + page.text.length, 0),
    unreadablePages: [],
    pages,
    blob: new Blob(['test-pdf']),
  };
}
export const fixtureSource = (hashCharacter = 'a') =>
  sourceFromPages(fixtureDocument(hashCharacter), [1, 2]);
