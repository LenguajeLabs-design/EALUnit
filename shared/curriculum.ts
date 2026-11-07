import { z } from 'zod';
import type { Blueprint } from './model';

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 100;
export const MAX_PDF_TEXT = 400000;
export const MAX_SOURCE_TEXT = 40000;
export const MAX_CURRICULUM_SOURCES = 3;

export const pdfPageSchema = z.object({
  page: z.number().int().min(1).max(MAX_PDF_PAGES),
  text: z.string().max(MAX_SOURCE_TEXT),
});
export const pdfSummarySchema = z.object({
  id: z.string().regex(/^pdf-[a-f0-9]{32}$/),
  name: z.string().min(1).max(255),
  size: z.number().int().min(1).max(MAX_PDF_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  pageCount: z.number().int().min(1).max(MAX_PDF_PAGES),
  createdAt: z.iso.datetime(),
  characterCount: z.number().int().min(0).max(MAX_PDF_TEXT),
  unreadablePages: z.array(z.number().int().min(1).max(MAX_PDF_PAGES)).max(MAX_PDF_PAGES),
});
export const curriculumSourceSchema = pdfSummarySchema
  .omit({ createdAt: true, characterCount: true })
  .extend({
    origin: z.literal('source_extracted'),
    reviewedAt: z.iso.datetime(),
    pages: z
      .array(pdfPageSchema.extend({ text: z.string().trim().min(1).max(MAX_SOURCE_TEXT) }))
      .min(1)
      .max(MAX_PDF_PAGES),
  })
  .superRefine((source, ctx) => {
    if (source.id !== `pdf-${source.sha256.slice(0, 32)}`)
      ctx.addIssue({
        code: 'custom',
        message: 'The PDF source identity does not match its checksum.',
      });
    if (
      new Set(source.pages.map((page) => page.page)).size !== source.pages.length ||
      source.pages.some((page) => page.page > source.pageCount)
    )
      ctx.addIssue({ code: 'custom', message: 'The selected PDF pages are invalid.' });
    if (
      source.unreadablePages.some(
        (page) =>
          page > source.pageCount || source.pages.some((selected) => selected.page === page),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Unreadable pages cannot be used as source text.' });
    if (source.pages.reduce((sum, page) => sum + page.text.length, 0) > MAX_SOURCE_TEXT)
      ctx.addIssue({
        code: 'custom',
        message: 'Choose PDF pages with no more than 40,000 characters.',
      });
  });
export const sourceReferenceSchema = z.object({
  documentId: z.string().regex(/^pdf-[a-f0-9]{32}$/),
  page: z.number().int().min(1).max(MAX_PDF_PAGES),
  quote: z.string().trim().min(8).max(300),
});
export type PdfPage = z.infer<typeof pdfPageSchema>;
export type PdfSummary = z.infer<typeof pdfSummarySchema>;
export type PdfDocument = PdfSummary & { pages: PdfPage[]; blob: Blob };
export type CurriculumSource = z.infer<typeof curriculumSourceSchema>;
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export const normalizeSourceText = (text: string) => text.replace(/\s+/g, ' ').trim();
export const sourceCharacterCount = (sources: CurriculumSource[]) =>
  sources.reduce(
    (sum, source) => sum + source.pages.reduce((count, page) => count + page.text.length, 0),
    0,
  );
export function referenceIssues(
  refs: SourceReference[] | undefined,
  sources: CurriculumSource[],
): string[] {
  return (refs ?? []).flatMap((ref) => {
    const page = sources
      .find((source) => source.id === ref.documentId)
      ?.pages.find((page) => page.page === ref.page);
    return !page || !normalizeSourceText(page.text).includes(normalizeSourceText(ref.quote))
      ? ['A PDF reference does not match the reviewed source page.']
      : [];
  });
}
export function sourceFromPages(document: PdfDocument, pageNumbers: number[]): CurriculumSource {
  const {
    createdAt: _createdAt,
    characterCount: _characterCount,
    blob: _blob,
    pages,
    ...metadata
  } = document;
  return curriculumSourceSchema.parse({
    ...metadata,
    origin: 'source_extracted',
    reviewedAt: new Date().toISOString(),
    pages: pages.filter((page) => pageNumbers.includes(page.page)).map((page) => ({ ...page })),
  });
}
export const pageNumbersLabel = (pages: { page: number }[]) =>
  pages.map((page) => page.page).join(', ');

export function blueprintReferenceIssues(
  blueprint: Blueprint,
  sources: CurriculumSource[],
): string[] {
  return [...blueprint.goals, ...blueprint.demands, ...blueprint.steps].flatMap((item) =>
    referenceIssues(item.sourceRefs, sources),
  );
}
