import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import * as engine from 'pdfjs-dist/legacy/build/pdf.mjs';
import { contextSchema } from '../shared/model';
import {
  MAX_PDF_BYTES,
  curriculumSourceSchema,
  referenceIssues,
  sourceFromPages,
} from '../shared/curriculum';
import {
  approveUnit,
  createLesson,
  createUnit,
  currentApproval,
  editUnitContext,
  lessonOutline,
} from '../shared/planning';
import { exampleBlueprint, exampleContext } from '../shared/example';
import { parseBackup, serializeLibrary } from '../shared/storage';
import {
  getCurriculumPdf,
  listCurriculumPdfs,
  saveCurriculumPdf,
} from '../src/lib/curriculum-library';
import { readCurriculumPdf } from '../src/lib/pdf-reader';
import { curriculumPages, fixtureDocument, fixtureSource, pdfBytes } from './pdf-fixtures';

test('real PDF extraction preserves page boundaries and the original file', async () => {
  const bytes = await pdfBytes();
  const progress: number[] = [];
  const result = await readCurriculumPdf(
    new File([bytes as Uint8Array<ArrayBuffer>], 'curriculum.pdf', { type: 'application/pdf' }),
    engine,
    { onProgress: (page) => progress.push(page) },
  );
  assert.equal(result.pageCount, 2);
  assert.ok(result.pages[0].text.includes('Reading workshop: Character change'));
  assert.ok(result.pages[1].text.includes('Students choose their own evidence'));
  assert.deepEqual(progress, [1, 2]);
  assert.deepEqual(new Uint8Array(await result.blob.arrayBuffer()), bytes);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});
test('PDF extraction reports empty or image-only pages instead of inventing text', async () => {
  const bytes = await pdfBytes([curriculumPages[0], '']);
  const result = await readCurriculumPdf(
    new File([bytes as Uint8Array<ArrayBuffer>], 'mixed.pdf'),
    engine,
  );
  assert.deepEqual(result.unreadablePages, [2]);
  assert.equal(result.pages[1].text, '');
  const blank = await pdfBytes(['']);
  await assert.rejects(
    () => readCurriculumPdf(new File([blank as Uint8Array<ArrayBuffer>], 'scan.pdf'), engine),
    /text recognition/,
  );
});
test('file validation rejects non-PDF input and oversized files before parsing', async () => {
  await assert.rejects(
    () => readCurriculumPdf(new File(['not a PDF'], 'notes.pdf'), engine),
    /not a readable PDF/,
  );
  await assert.rejects(
    () =>
      readCurriculumPdf(
        { name: 'large.pdf', size: MAX_PDF_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(0) },
        engine,
      ),
    /20 MB/,
  );
});
test('selected source pages keep their numbers and require real readable text', () => {
  const source = sourceFromPages(fixtureDocument(), [2]);
  assert.deepEqual(
    source.pages.map((page) => page.page),
    [2],
  );
  assert.throws(() => sourceFromPages(fixtureDocument(), []));
  assert.throws(() =>
    curriculumSourceSchema.parse({ ...source, pages: [{ page: 3, text: 'invented' }] }),
  );
  assert.throws(() =>
    curriculumSourceSchema.parse({ ...source, pages: [source.pages[0], source.pages[0]] }),
  );
});
test('a reviewed PDF can supply curriculum without requiring the teacher to retype it', () => {
  assert.equal(
    contextSchema.safeParse({
      ...exampleContext,
      curriculum: '',
      curriculumSources: [fixtureSource()],
    }).success,
    true,
  );
  assert.equal(
    contextSchema.safeParse({ ...exampleContext, curriculum: '', curriculumSources: [] }).success,
    false,
  );
  const longSource = {
    ...fixtureSource(),
    pages: [
      { page: 1, text: 'x'.repeat(21000) },
      { page: 2, text: 'x'.repeat(21000) },
    ],
  };
  assert.equal(
    contextSchema.safeParse({ ...exampleContext, curriculumSources: [longSource] }).success,
    false,
  );
});
test('citations must match a reviewed page and an actual source passage', () => {
  const source = fixtureSource();
  const ref = {
    documentId: source.id,
    page: 2,
    quote: 'Students connect an interpretation to a relevant detail from the text.',
  };
  assert.deepEqual(referenceIssues([ref], [source]), []);
  assert.ok(referenceIssues([{ ...ref, page: 1 }], [source]).length);
  assert.ok(referenceIssues([{ ...ref, quote: 'An invented official standard' }], [source]).length);
  assert.ok(referenceIssues([ref], [sourceFromPages(fixtureDocument(), [1])]).length);
});
test('adding or replacing curriculum preserves the exact source context of approved lessons', () => {
  const source = fixtureSource();
  const blueprint = exampleBlueprint();
  const ref = {
    documentId: source.id,
    page: 2,
    quote: 'Students connect an interpretation to a relevant detail from the text.',
  };
  blueprint.steps[0].sourceRefs = [ref];
  const approved = approveUnit(
    createUnit({ ...exampleContext, curriculumSources: [source] }, blueprint, 'outline'),
  );
  const lesson = createLesson(
    approved,
    ['step-1'],
    lessonOutline(approved, [approved.blueprint.steps[0]]),
    'outline',
  );
  const original = { ...approved, lessons: [lesson] };
  const changed = editUnitContext(original, {
    ...original.context,
    curriculumSources: [fixtureSource('b')],
  });
  assert.equal(changed.revision, 2);
  assert.equal(currentApproval(changed), undefined);
  assert.equal(changed.approvals[0].context?.curriculumSources?.[0].id, source.id);
  assert.deepEqual(changed.lessons[0], lesson);
  assert.deepEqual(changed.blueprint.steps[0].sourceRefs, []);
  assert.equal(
    parseBackup(serializeLibrary([changed]))[0].approvals[0].context?.curriculumSources?.[0].id,
    source.id,
  );
});
test('legacy approvals are given their previous context before a PDF is attached', () => {
  const approved = approveUnit(createUnit(exampleContext, exampleBlueprint(), 'example'));
  delete approved.approvals[0].context;
  const changed = editUnitContext(approved, {
    ...approved.context,
    curriculumSources: [fixtureSource()],
  });
  assert.deepEqual(changed.approvals[0].context, exampleContext);
});
test('backups reject forged PDF citations and keep reviewed text without original binary files', () => {
  const source = fixtureSource();
  const unit = createUnit(
    { ...exampleContext, curriculumSources: [source] },
    exampleBlueprint(),
    'outline',
  );
  const raw = serializeLibrary([unit]);
  assert.equal(
    parseBackup(raw)[0].context.curriculumSources?.[0].pages[1].text,
    source.pages[1].text,
  );
  assert.ok(!raw.includes('test-pdf'));
  unit.blueprint.goals[0].sourceRefs = [
    { documentId: source.id, page: 2, quote: 'This statement is not in the PDF.' },
  ];
  assert.throws(() => serializeLibrary([unit]), /source reference/);
});
test('curriculum PDFs persist separately and can be reused after reopening the library', async () => {
  const factory = new IDBFactory();
  const document = fixtureDocument();
  await saveCurriculumPdf(document, factory);
  const summaries = await listCurriculumPdfs(factory);
  assert.equal(summaries.length, 1);
  assert.ok(!('blob' in summaries[0]));
  const reopened = await getCurriculumPdf(document.id, factory);
  assert.equal(await reopened?.blob.text(), 'test-pdf');
  assert.deepEqual(reopened?.pages, document.pages);
  await saveCurriculumPdf(document, factory);
  assert.equal((await listCurriculumPdfs(factory)).length, 1);
  assert.equal(await getCurriculumPdf('missing', factory), null);
});
