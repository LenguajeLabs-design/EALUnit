import { useEffect, useRef, useState, type DragEvent } from 'react';
import { BookOpen, Check, Download, FileText, FolderOpen, Upload, X } from 'lucide-react';
import {
  MAX_CURRICULUM_SOURCES,
  MAX_SOURCE_TEXT,
  pageNumbersLabel,
  sourceCharacterCount,
  sourceFromPages,
  type CurriculumSource,
  type PdfDocument,
  type PdfSummary,
  type SourceReference,
} from '../../shared/curriculum';
import {
  downloadOriginalPdf,
  getCurriculumPdf,
  listCurriculumPdfs,
  saveCurriculumPdf,
} from '../lib/curriculum-library';
import { Dialog, Spinner, Tag } from './ui';

export function CurriculumSourcesPanel({
  sources,
  onChange,
  disabled = false,
  onBusyChange,
}: {
  sources: CurriculumSource[];
  onChange: (sources: CurriculumSource[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [library, setLibrary] = useState<PdfSummary[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [review, setReview] = useState<{
    document: PdfDocument;
    selected: number[];
    originalMissing?: boolean;
  } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    void listCurriculumPdfs()
      .then((rows) => {
        if (active.current) setLibrary(rows);
      })
      .catch(() => {});
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    onBusyChange?.(reading || Boolean(review));
  }, [reading, review, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  const busy = reading || disabled;

  function openReview(document: PdfDocument, originalMissing = false) {
    const attached = sources.find((source) => source.id === document.id);
    const remaining =
      MAX_SOURCE_TEXT - sourceCharacterCount(sources.filter((source) => source.id !== document.id));
    const all = document.pages.filter((page) => page.text.trim());
    setReview({
      document,
      selected:
        attached?.pages.map((page) => page.page) ??
        (all.reduce((sum, page) => sum + page.text.length, 0) <= remaining
          ? all.map((page) => page.page)
          : []),
      originalMissing,
    });
    setLibraryOpen(false);
  }
  async function upload(file: File) {
    if (busy || review) return;
    setError('');
    setReading(true);
    setProgress('Opening your PDF…');
    const abort = new AbortController();
    controller.current = abort;
    try {
      const { readBrowserPdf } = await import('../lib/pdf-browser');
      const parsed = await readBrowserPdf(
        file,
        (page, total) => {
          if (active.current) setProgress(`Reading page ${page} of ${total}…`);
        },
        abort.signal,
      );
      if (abort.signal.aborted || !active.current) return;
      const existing = await getCurriculumPdf(parsed.id);
      const document = existing ?? parsed;
      if (!existing) await saveCurriculumPdf(document);
      if (!active.current || abort.signal.aborted) return;
      setLibrary((previous) => [document, ...previous.filter((item) => item.id !== document.id)]);
      openReview(document);
    } catch (error) {
      if (active.current)
        setError(
          error instanceof Error
            ? error.message
            : 'The PDF could not be read. Your existing curriculum is safe.',
        );
    } finally {
      if (active.current) {
        setReading(false);
        setProgress('');
      }
      controller.current = null;
    }
  }
  async function choose(id: string, fallback?: CurriculumSource) {
    setError('');
    setReading(true);
    setProgress('Opening saved curriculum…');
    try {
      const document = await getCurriculumPdf(id);
      if (!active.current) return;
      if (document) openReview(document);
      else if (fallback)
        openReview(
          {
            ...fallback,
            pages: fallback.pages,
            blob: new Blob(),
            characterCount: sourceCharacterCount([fallback]),
            createdAt: fallback.reviewedAt,
          },
          true,
        );
      else throw new Error('This PDF is no longer saved in this browser. Upload it again.');
    } catch (error) {
      if (active.current)
        setError(error instanceof Error ? error.message : 'The saved PDF could not be opened.');
    } finally {
      if (active.current) {
        setReading(false);
        setProgress('');
      }
    }
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 1) {
      setError('Add one PDF at a time so you can review its pages.');
      return;
    }
    if (event.dataTransfer.files[0]) void upload(event.dataTransfer.files[0]);
  }
  function usePages(pageNumbers: number[]) {
    if (!review) return;
    try {
      const source = sourceFromPages(review.document, pageNumbers);
      const next = [...sources.filter((item) => item.id !== source.id), source];
      if (next.length > MAX_CURRICULUM_SOURCES || sourceCharacterCount(next) > MAX_SOURCE_TEXT)
        throw new Error('Use up to three PDFs and 40,000 characters of selected text in one unit.');
      onChange(next);
      setReview(null);
      setError('');
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Choose readable pages within the text limit.',
      );
    }
  }
  return (
    <section className="curriculum-panel" aria-label="Curriculum PDFs">
      <div className="curriculum-heading">
        <div>
          <h3>Bring your curriculum PDF</h3>
          <p>
            Choose the pages that matter for this unit. Review the text before using it to plan.
          </p>
        </div>
        <Tag>Optional</Tag>
      </div>
      {sources.length > 0 && (
        <div className="curriculum-attached">
          {sources.map((source) => (
            <div className="curriculum-file" key={source.id}>
              <FileText size={21} />
              <div>
                <strong>{source.name}</strong>
                <span>Reviewed PDF text · pages {pageNumbersLabel(source.pages)}</span>
              </div>
              <button
                type="button"
                className="text-button"
                disabled={busy || Boolean(review)}
                onClick={() => void choose(source.id, source)}
              >
                Review pages
              </button>
              <button
                type="button"
                className="icon-button"
                disabled={busy || Boolean(review)}
                onClick={() => onChange(sources.filter((item) => item.id !== source.id))}
                aria-label={`Remove ${source.name} from this unit`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {review ? (
        <PdfReview
          key={review.document.id}
          document={review.document}
          selected={review.selected}
          originalMissing={review.originalMissing}
          remaining={
            MAX_SOURCE_TEXT -
            sourceCharacterCount(sources.filter((source) => source.id !== review.document.id))
          }
          onUse={usePages}
          onCancel={() => {
            setReview(null);
            setError('');
          }}
        />
      ) : (
        <>
          {sources.length < MAX_CURRICULUM_SOURCES && (
            <div
              className={`pdf-upload ${dragging ? 'dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={drop}
            >
              {reading ? (
                <div className="pdf-progress" role="status">
                  <Spinner />
                  <span>{progress}</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => controller.current?.abort()}
                  >
                    Cancel reading
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={23} />
                  <div>
                    <strong>Drop a curriculum PDF here</strong>
                    <span>Up to 20 MB and 100 pages · searchable text</span>
                  </div>
                  <label className={`button secondary file-button ${disabled ? 'disabled' : ''}`}>
                    <Upload size={15} /> Upload PDF
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      aria-label="Upload curriculum PDF"
                      disabled={disabled}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void upload(file);
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          )}
          {library.length > 0 && (
            <button
              type="button"
              className="text-button saved-pdfs-button"
              disabled={busy}
              onClick={() => setLibraryOpen(!libraryOpen)}
            >
              <FolderOpen size={15} /> {libraryOpen ? 'Hide saved PDFs' : 'Choose a saved PDF'}
            </button>
          )}
          {libraryOpen && (
            <div className="pdf-library">
              {library.map((document) => (
                <div className="pdf-library-row" key={document.id}>
                  <FileText size={18} />
                  <div>
                    <strong>{document.name}</strong>
                    <span>
                      {document.pageCount} pages · {(document.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button small secondary"
                    disabled={
                      busy ||
                      (sources.length >= MAX_CURRICULUM_SOURCES &&
                        !sources.some((source) => source.id === document.id))
                    }
                    onClick={() => void choose(document.id)}
                  >
                    Choose pages
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}
      <p className="privacy-note">
        PDFs are read and kept in this browser. Only the pages you review are sent for AI drafting.
        Unit backups include that text; keep your original PDF separately.
      </p>
    </section>
  );
}

function PdfReview({
  document,
  selected,
  remaining,
  originalMissing,
  onUse,
  onCancel,
}: {
  document: PdfDocument;
  selected: number[];
  remaining: number;
  originalMissing?: boolean;
  onUse: (pages: number[]) => void;
  onCancel: () => void;
}) {
  const [chosen, setChosen] = useState(selected);
  const [current, setCurrent] = useState(selected[0] ?? document.pages[0].page);
  const page = document.pages.find((page) => page.page === current)!;
  const characters = document.pages
    .filter((page) => chosen.includes(page.page))
    .reduce((sum, page) => sum + page.text.length, 0);
  const readable = document.pages.filter((page) => page.text.trim());
  const allFit = readable.reduce((sum, page) => sum + page.text.length, 0) <= remaining;
  return (
    <div className="pdf-review">
      <div className="pdf-review-heading">
        <FileText size={20} />
        <div>
          <h4>{document.name}</h4>
          <p>{document.pageCount} pages · select the curriculum for this unit</p>
        </div>
      </div>
      {document.unreadablePages.length > 0 && (
        <div className="message warning">
          No text could be extracted from pages {document.unreadablePages.join(', ')}. They may
          contain images, scans, or blank pages and will not be used for AI planning. Upload a
          searchable copy to include scanned text.
        </div>
      )}
      {originalMissing && (
        <div className="message warning">
          Only the page text saved in this unit is available here. Re-upload the original PDF to
          choose other pages.
        </div>
      )}
      <div className="pdf-review-toolbar">
        <span>Pages to use</span>
        <div>
          <button
            type="button"
            className="text-button"
            disabled={!allFit}
            onClick={() => setChosen(readable.map((page) => page.page))}
          >
            Select all readable
          </button>
          <button type="button" className="text-button" onClick={() => setChosen([])}>
            Clear
          </button>
        </div>
      </div>
      <div className="pdf-review-layout">
        <div className="pdf-page-list" role="group" aria-label="Choose PDF pages">
          {document.pages.map((item) => (
            <div
              className={`pdf-page-row ${item.page === current ? 'current' : ''}`}
              key={item.page}
            >
              <input
                type="checkbox"
                aria-label={`Use page ${item.page}`}
                disabled={!item.text.trim()}
                checked={chosen.includes(item.page)}
                onChange={(event) => {
                  setChosen(
                    event.target.checked
                      ? [...chosen, item.page]
                      : chosen.filter((number) => number !== item.page),
                  );
                  setCurrent(item.page);
                }}
              />
              <button
                type="button"
                onClick={() => setCurrent(item.page)}
                aria-label={`Read page ${item.page}`}
              >
                Page {item.page}
                <small>
                  {item.text.trim()
                    ? `${item.text.length.toLocaleString()} characters`
                    : 'No readable text'}
                </small>
              </button>
            </div>
          ))}
        </div>
        <div className="pdf-text-preview">
          <span className="small-label">Extracted text · page {current}</span>
          <pre>
            {page.text ||
              'No readable text was found on this page. It will not be included in the planning context.'}
          </pre>
        </div>
      </div>
      <p className="pdf-review-help">
        Check reading order, tables, and missing details against your PDF. Reviewing text does not
        verify official curriculum or WIDA alignment.
      </p>
      <div className="pdf-review-footer">
        <span className={characters > remaining ? 'over' : ''}>
          {chosen.length} pages · {characters.toLocaleString()} / {remaining.toLocaleString()}{' '}
          characters available
        </span>
        <div>
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!chosen.length || characters > remaining || characters < 1}
            onClick={() => onUse(chosen)}
          >
            <Check size={16} /> Use selected pages
          </button>
        </div>
      </div>
    </div>
  );
}

export function SourceCitations({
  refs,
  sources,
}: {
  refs?: SourceReference[];
  sources: CurriculumSource[];
}) {
  const [view, setView] = useState<{ source: CurriculumSource; reference: SourceReference } | null>(
    null,
  );
  if (!refs?.length) return null;
  return (
    <div className="source-citations">
      {refs.map((ref, index) => {
        const source = sources.find((source) => source.id === ref.documentId);
        return source ? (
          <button
            type="button"
            className="source-citation"
            key={`${ref.documentId}-${ref.page}-${index}`}
            title="Read the source passage informing this suggestion"
            onClick={() => setView({ source, reference: ref })}
          >
            <BookOpen size={12} />
            <span>
              {source.name} · p. {ref.page}
            </span>
          </button>
        ) : null;
      })}
      {view && (
        <SourceTextDialog
          source={view.source}
          initialPage={view.reference.page}
          quote={view.reference.quote}
          onClose={() => setView(null)}
        />
      )}
    </div>
  );
}

export function SourceTextDialog({
  source,
  initialPage,
  quote,
  onClose,
}: {
  source: CurriculumSource;
  initialPage?: number;
  quote?: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(initialPage ?? source.pages[0].page);
  const [error, setError] = useState('');
  return (
    <Dialog
      title={source.name}
      description="Reviewed PDF text. AI planning suggestions remain interpretations for teacher review."
      onClose={onClose}
      wide
    >
      {quote && <blockquote className="source-quote">{quote}</blockquote>}
      <div className="source-dialog-toolbar">
        <label>
          Source page{' '}
          <select
            aria-label="Source page"
            value={page}
            onChange={(event) => setPage(Number(event.target.value))}
          >
            {source.pages.map((item) => (
              <option key={item.page} value={item.page}>
                {item.page}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            void downloadOriginalPdf(source.id).catch((error) =>
              setError(
                error instanceof Error ? error.message : 'The original could not be opened.',
              ),
            )
          }
        >
          <Download size={15} /> Download original PDF
        </button>
      </div>
      <pre className="source-full-text">
        {source.pages.find((item) => item.page === page)?.text}
      </pre>
      {error && (
        <div className="message warning" role="alert">
          {error}
        </div>
      )}
      <p className="privacy-note">
        Reviewed {new Date(source.reviewedAt).toLocaleDateString()} · {source.pages.length} of{' '}
        {source.pageCount} pages used. Page numbers refer to the PDF, which may differ from printed
        page labels.
      </p>
    </Dialog>
  );
}
