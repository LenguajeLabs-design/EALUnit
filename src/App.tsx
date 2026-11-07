import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FolderOpen,
  HelpCircle,
  Layers3,
  Leaf,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { blueprintSchema, type Blueprint, type Context, type Unit } from '../shared/model';
import { createUnit, currentApproval } from '../shared/planning';
import { exampleBlueprint, exampleContext } from '../shared/example';
import {
  MAX_BACKUP_BYTES,
  STORAGE_KEY,
  mergeBackup,
  parseBackup,
  readLibrary,
  serializeLibrary,
} from '../shared/storage';
import UnitForm from './components/UnitForm';
import Workspace, { type Tab } from './components/Workspace';
import { Dialog, Empty, Eyebrow, Tag, downloadJSON } from './components/ui';

function readRoute() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const tab = ['overview', 'journey', 'lessons', 'insights'].includes(parts[2])
    ? (parts[2] as Tab)
    : 'overview';
  return {
    page: parts[0] === 'new' ? 'new' : parts[0] === 'unit' ? 'unit' : 'library',
    unitId: parts[1],
    tab,
    lessonId: parts[3],
  };
}
function loadLibrary() {
  try {
    return readLibrary(window.localStorage);
  } catch {
    return {
      units: [] as Unit[],
      error:
        'Device storage is unavailable. You can continue in this tab and export your plans as a backup.',
    };
  }
}
function readableDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(iso),
  );
}

export default function App() {
  const [initial] = useState(loadLibrary);
  const [units, setUnits] = useState<Unit[]>(initial.units);
  const unitsRef = useRef(units);
  const [blocked, setBlocked] = useState(Boolean(initial.error));
  const [storageError, setStorageError] = useState(initial.error);
  const saveFailed = useRef(false);
  const [route, setRoute] = useState(readRoute);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);
  const currentUnit = units.find((unit) => unit.id === route.unitId);

  useEffect(() => {
    function onHash() {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    }
    window.addEventListener('hashchange', onHash);
    if (import.meta.env.MODE !== 'pages')
      void fetch('/api/config')
        .then((response) => (response.ok ? response.json() : null))
        .then((config) => setAiEnabled(config?.generationEnabled === true))
        .catch(() => {});
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    document.title = `${currentUnit?.context.title || (route.page === 'new' ? 'New unit' : 'Your units')} · EAL Unit`;
    document.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [route.page, route.unitId, route.tab, route.lessonId, currentUnit?.context.title]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 6500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if ((event.key !== STORAGE_KEY && event.key !== null) || saveFailed.current) return;
      const next = loadLibrary();
      unitsRef.current = next.units;
      setUnits(next.units);
      setBlocked(Boolean(next.error));
      setStorageError(next.error);
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function notify(message: string) {
    setToast(
      saveFailed.current
        ? 'Your changes are kept in this tab, but device storage failed. Export a backup now.'
        : message,
    );
  }
  function persist(next: Unit[], force = false): boolean {
    if (blocked && !force) {
      setToast('Restore a backup or explicitly start a new library before making changes.');
      return false;
    }
    let raw: string;
    try {
      raw = serializeLibrary(next);
    } catch {
      setToast(
        'These changes could not be saved. Check text limits and planning links; the existing library has been kept.',
      );
      return false;
    }
    unitsRef.current = next;
    setUnits(next);
    setBlocked(false);
    try {
      if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES)
        throw new Error('library_too_large');
      window.localStorage.setItem(STORAGE_KEY, raw);
      saveFailed.current = false;
      setStorageError(null);
    } catch {
      saveFailed.current = true;
      setStorageError(
        'Changes are available in this tab but could not be saved on this device. Export a backup before closing.',
      );
    }
    return true;
  }
  function updateUnit(unit: Unit) {
    return persist(unitsRef.current.map((item) => (item.id === unit.id ? unit : item)));
  }
  function addUnit(context: Context, blueprint: Blueprint, mode: Unit['mode']) {
    const unit = createUnit(context, blueprintSchema.parse(blueprint), mode);
    if (persist([unit, ...unitsRef.current])) {
      window.location.hash = `#/unit/${unit.id}/overview`;
      notify(
        mode === 'ai'
          ? 'Your suggested blueprint is ready for review.'
          : 'Unit created. Refine the blueprint before approving.',
      );
    }
  }
  function explore() {
    const existing = unitsRef.current.find((unit) => unit.mode === 'example');
    if (existing) window.location.hash = `#/unit/${existing.id}/overview`;
    else addUnit(structuredClone(exampleContext), exampleBlueprint(), 'example');
  }
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRestoreError('');
    setRestoring(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('large');
      const incoming = parseBackup(await file.text());
      const before = unitsRef.current.length;
      const next = mergeBackup(unitsRef.current, incoming);
      if (persist(next, true)) {
        const count = next.length - before;
        setBackupOpen(false);
        notify(
          `Backup restored. ${count} new ${count === 1 ? 'unit' : 'units'} added; existing units were kept.`,
        );
      } else setRestoreError('The backup could not be saved. The existing library has been kept.');
    } catch {
      setRestoreError(
        'This is not a valid EAL Unit backup, or it exceeds 5 MB. Your existing library has been kept.',
      );
    } finally {
      event.target.value = '';
      setRestoring(false);
    }
  }
  function removeUnit(unit: Unit) {
    setConfirm({
      title: `Remove “${unit.context.title}”?`,
      description:
        'This removes the unit, its approved revisions, and its lessons from this browser. Export a backup first if you want to keep them.',
      action: () => {
        if (persist(unitsRef.current.filter((item) => item.id !== unit.id))) {
          if (route.unitId === unit.id) window.location.hash = '#/units';
          notify('Unit removed from this device.');
        }
        setConfirm(null);
      },
    });
  }
  const visibleUnits = [...units]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((unit) =>
      `${unit.context.title} ${unit.context.grade} ${unit.context.strand}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar no-print">
        <a href="#/units" className="brand" aria-label="EAL Unit home">
          <img src={`${import.meta.env.BASE_URL}mark.svg?v=2`} alt="" width="44" height="44" />
          <span>
            EAL <span className="brand-unit">Unit</span><small>BY LENGUAJE LABS</small>
          </span>
        </a>
        <div className="sidebar-nav">
          <span className="nav-label">Your workspace</span>
          <a className={`nav-item ${route.page !== 'new' ? 'active' : ''}`} href="#/units">
            <FolderOpen size={19} /> Your units <span>{units.length}</span>
          </a>
          <a className={`nav-item ${route.page === 'new' ? 'active' : ''}`} href="#/new">
            <Plus size={19} /> New unit
          </a>
        </div>
        {units.length > 0 && (
          <div className="recent-units">
            <span className="nav-label">Recent units</span>
            {[...units]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 4)
              .map((unit) => (
                <a
                  key={unit.id}
                  className={currentUnit?.id === unit.id ? 'selected' : ''}
                  href={`#/unit/${unit.id}/overview`}
                >
                  <span className="recent-dot" />
                  <span>
                    {unit.context.title}
                    <small>{unit.context.grade || unit.context.strand + ' workshop'}</small>
                  </span>
                </a>
              ))}
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-thought">
            <Leaf size={22} strokeWidth={1.4} />
            <p>
              Curriculum in.
              <br />
              <em>Language forward.</em>
            </p>
            <span>
              A connected journey,
              <br />
              guided by your judgment.
            </span>
          </div>
          <button className="text-button" onClick={() => setAboutOpen(true)}>
            <HelpCircle size={17} /> About this workspace
          </button>
          <span className="version-label">EAL Unit · Early preview</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar no-print">
          <div className="breadcrumbs">
            <a href="#/units">Workspace</a>
            <ChevronRight size={14} />
            <span>
              {route.page === 'new'
                ? 'New unit'
                : currentUnit
                  ? currentUnit.context.title
                  : 'Your units'}
            </span>
          </div>
          <div className="topbar-actions">
            <span className={`save-status ${storageError ? 'unsaved' : ''}`}>
              <span />
              {storageError
                ? 'Backup recommended'
                : units.length
                  ? 'Saved on this device'
                  : 'Local workspace'}
            </span>
            <button
              className="button quiet"
              onClick={() => {
                setRestoreError('');
                setBackupOpen(true);
              }}
            >
              <Download size={16} />
              <span>Backup & restore</span>
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {storageError && (
            <div className="storage-alert message warning" role="alert">
              <p>{storageError}</p>
              <div>
                <button className="text-button" onClick={() => setBackupOpen(true)}>
                  Backup & restore <ArrowRight size={15} />
                </button>
                {blocked && (
                  <button
                    className="text-button"
                    onClick={() =>
                      setConfirm({
                        title: 'Start a new library?',
                        description:
                          'Any unreadable saved library will be replaced. Download the existing saved data from Backup & restore first if you want to recover it later.',
                        action: () => {
                          persist([], true);
                          setConfirm(null);
                        },
                      })
                    }
                  >
                    Start a new library
                  </button>
                )}
              </div>
            </div>
          )}
          {route.page === 'library' && (
            <div className={`library-page ${units.length ? 'has-units' : ''}`}>
              <section className="library-hero">
                <div className="hero-copy">
                  <Eyebrow>A little more connected</Eyebrow>
                  <h1 tabIndex={-1}>
                    Make the language
                    <br />
                    journey <em>visible.</em>
                  </h1>
                  <p>
                    Turn workshop learning into a purposeful EAL unit. See what connects, plan the
                    next lesson, and leave room for what students show you.
                  </p>
                  <div className="hero-actions">
                    <a className="button primary" href="#/new">
                      <Plus size={18} /> Create a unit
                    </a>
                    <button className="text-button" onClick={explore}>
                      Explore an example <ArrowRight size={17} />
                    </button>
                  </div>
                  <div className="hero-footnote">
                    <ShieldCheck size={15} /> Your curriculum. Your decisions. One connected plan.
                  </div>
                </div>
                <div className="hero-journey">
                  <div className="hero-journey-top">
                    <span className="small-label">The shape of a language journey</span>
                    <GitJourneyMark />
                  </div>
                  <h2>
                    From noticing
                    <br />
                    to explaining.
                  </h2>
                  <p>A reading workshop example</p>
                  <div className="mini-journey">
                    {[
                      'Notice actions & feelings',
                      'Compare then & now',
                      'Connect ideas to evidence',
                      'Shape an explanation',
                      'Transfer to a new moment',
                    ].map((label, index) => (
                      <div key={label}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <p>{label}</p>
                      </div>
                    ))}
                  </div>
                  <button className="sample-link" onClick={explore}>
                    Open the example unit <ArrowRight size={16} />
                  </button>
                </div>
              </section>
              <section className="library-section">
                <div className="section-title-row">
                  <div>
                    <Eyebrow>Your planning, in one place</Eyebrow>
                    <h2>
                      Your units <span className="heading-count">{units.length}</span>
                    </h2>
                  </div>
                  {units.length > 0 && (
                    <label className="search-field">
                      <Search size={17} />
                      <input
                        type="search"
                        aria-label="Search units"
                        placeholder="Find a unit…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </label>
                  )}
                </div>
                {visibleUnits.length ? (
                  <div className="unit-library">
                    {visibleUnits.map((unit) => (
                      <article className="unit-card" key={unit.id}>
                        <a href={`#/unit/${unit.id}/overview`} className="unit-card-link">
                          <div className="unit-card-top">
                            <span className="unit-card-icon">
                              <BookOpen size={21} strokeWidth={1.6} />
                            </span>
                            <Tag tone={currentApproval(unit) ? 'approved-tag' : ''}>
                              {currentApproval(unit) ? 'Approved blueprint' : 'Draft blueprint'}
                            </Tag>
                          </div>
                          <span className="small-label">
                            {unit.context.strand} workshop
                            {unit.context.grade ? ` · ${unit.context.grade}` : ''}
                          </span>
                          <h3>{unit.context.title}</h3>
                          <p>
                            {unit.blueprint.summary ||
                              'An editable blueprint, ready for your goals and learning sequence.'}
                          </p>
                          <div className="unit-card-stats">
                            <span>{unit.blueprint.steps.length} learning steps</span>
                            <span>
                              {unit.lessons.length}{' '}
                              {unit.lessons.length === 1 ? 'lesson' : 'lessons'}
                            </span>
                            {unit.mode === 'example' && (
                              <span className="example-text">Example</span>
                            )}
                          </div>
                          <div className="unit-card-bottom">
                            <span>Updated {readableDate(unit.updatedAt)}</span>
                            <ArrowRight size={19} />
                          </div>
                        </a>
                        <button
                          className="unit-delete icon-button"
                          onClick={() => removeUnit(unit)}
                          aria-label={`Remove ${unit.context.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : units.length ? (
                  <Empty title="No units match your search">
                    Try a different title, grade, or workshop.
                  </Empty>
                ) : (
                  <div className="library-empty">
                    <span className="library-empty-icon">
                      <Layers3 size={26} strokeWidth={1.4} />
                    </span>
                    <div>
                      <h3>A home for the whole learning journey.</h3>
                      <p>Your units, connected lessons, and approved plans will live here.</p>
                    </div>
                    <a className="text-button" href="#/new">
                      Start your first unit <ArrowRight size={17} />
                    </a>
                  </div>
                )}
              </section>
              <footer className="workspace-footer">
                <span>Thoughtful planning. Connected learning.</span>
                <span>Plans save in this browser. Export a backup to keep a separate copy.</span>
              </footer>
            </div>
          )}
          {route.page === 'new' && <UnitForm aiEnabled={aiEnabled} onCreate={addUnit} />}
          {route.page === 'unit' &&
            (currentUnit ? (
              <Workspace
                key={currentUnit.id}
                unit={currentUnit}
                tab={route.tab}
                lessonId={route.lessonId}
                aiEnabled={aiEnabled}
                onUpdate={updateUnit}
                notify={notify}
              />
            ) : (
              <div className="not-found">
                <h1 tabIndex={-1}>This unit isn’t in this library.</h1>
                <p>
                  It may have been removed or saved in another browser. Restore its backup, or
                  return to your units.
                </p>
                <a className="button primary" href="#/units">
                  Your units <ArrowRight size={17} />
                </a>
              </div>
            ))}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <p>{toast}</p>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {backupOpen && (
        <Dialog
          title="Keep a copy of your planning"
          description="Plans are saved in this browser. A JSON backup preserves unit revisions, lesson links, edits, and reviewed PDF text. Keep original PDF files separately."
          onClose={() => {
            if (!restoring) setBackupOpen(false);
          }}
        >
          <div className="backup-option">
            <Download size={23} />
            <div>
              <h3>Export your library</h3>
              <p>Download all {units.length} units and their connected lessons.</p>
              <button
                className="button primary"
                disabled={!units.length}
                onClick={() =>
                  downloadJSON(
                    serializeLibrary(units),
                    `eal-unit-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  )
                }
              >
                Download backup
              </button>
            </div>
          </div>
          <div className="backup-option">
            <Upload size={23} />
            <div>
              <h3>Restore a backup</h3>
              <p>
                New units are added. Units already in this library are kept as they are. Choose an
                EAL Unit JSON file up to 5 MB.
              </p>
              <label className={`button secondary file-button ${restoring ? 'disabled' : ''}`}>
                <Upload size={16} />
                {restoring ? 'Reading backup…' : 'Choose backup file'}
                <input
                  type="file"
                  accept=".json,application/json"
                  aria-label="Choose backup file"
                  disabled={restoring}
                  onChange={restore}
                />
              </label>
            </div>
          </div>
          {restoreError && (
            <div className="message error" role="alert">
              {restoreError}
            </div>
          )}
          {blocked && (
            <div className="recovery-option">
              <h3>Recover unreadable saved data</h3>
              <p>Download the original data before starting a new library.</p>
              <button
                className="button secondary"
                onClick={() => {
                  try {
                    downloadJSON(
                      window.localStorage.getItem(STORAGE_KEY) || 'null',
                      'eal-unit-recovery.json',
                    );
                  } catch {
                    setRestoreError('The browser did not allow access to the saved data.');
                  }
                }}
              >
                Download saved data
              </button>
            </div>
          )}
          <p className="privacy-note">
            Backups may contain your curriculum notes and group descriptions. Store them where you
            normally keep your teaching plans. GitHub stores the app’s code; it does not receive
            your plans.
          </p>
        </Dialog>
      )}
      {aboutOpen && (
        <Dialog title="A workspace for connected EAL planning" onClose={() => setAboutOpen(false)}>
          <p>
            EAL Unit connects workshop tasks with explicit language goals, flexible learning steps,
            and protected EAL lessons.
          </p>
          <div className="about-list">
            <p>
              <strong>You review the plan.</strong> Approve the blueprint before creating connected
              lessons. Changing a blueprint creates a new draft; earlier approved revisions are
              kept.
            </p>
            <p>
              <strong>Your plans stay local.</strong> Units save in this browser. Export a backup to
              move them between devices.
            </p>
            <p>
              <strong>AI suggestions need judgment.</strong> When you choose AI drafting, the
              relevant context is sent to OpenAI. Use anonymized descriptions. The app does not
              verify official curriculum or WIDA alignment.
            </p>
            <p>
              <strong>Early preview.</strong>{' '}
              {import.meta.env.MODE === 'pages'
                ? 'This GitHub Pages edition supports PDF sources, manual planning, and examples. AI drafting requires the separate local server.'
                : aiEnabled
                  ? 'AI drafting is configured on this local server.'
                  : 'AI drafting is unavailable here; examples and editable outlines still work.'}{' '}
              School accounts, cloud sync, and reflection-driven revisions are not included yet.
            </p>
          </div>
          <div className="dialog-actions">
            <button className="button primary" onClick={() => setAboutOpen(false)}>
              Back to planning
            </button>
          </div>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title={confirm.title}
          description={confirm.description}
          onClose={() => setConfirm(null)}
        >
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setConfirm(null)}>
              Keep existing library
            </button>
            <button className="button danger-button" onClick={confirm.action}>
              Confirm
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function GitJourneyMark() {
  return (
    <span className="journey-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
