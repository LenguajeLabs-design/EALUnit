import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, FileText, PenLine, Sparkles } from 'lucide-react';
import {
  blueprintSchema,
  contextSchema,
  type Blueprint,
  type Context,
  type Unit,
} from '../../shared/model';
import { blankBlueprint } from '../../shared/example';
import { Eyebrow, Field, Spinner, postJSON } from './ui';
import { CurriculumSourcesPanel } from './CurriculumSources';

export default function UnitForm({
  aiEnabled,
  onCreate,
}: {
  aiEnabled: boolean;
  onCreate: (context: Context, blueprint: Blueprint, mode: Unit['mode']) => void;
}) {
  const [context, setContext] = useState<Context>({
    title: '',
    grade: 'Grade 4',
    strand: 'Reading',
    durationWeeks: 3,
    sessionMinutes: 35,
    curriculum: '',
    groupContext: '',
  });
  const [mode, setMode] = useState<'ai' | 'outline'>(aiEnabled ? 'ai' : 'outline');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const update = <K extends keyof Context>(key: K, value: Context[K]) =>
    setContext((previous) => ({ ...previous, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (pdfBusy) {
      setError('Review and use your PDF pages before creating the blueprint.');
      return;
    }
    const parsed = contextSchema.safeParse(context);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check the required fields.');
      return;
    }
    setBusy(true);
    try {
      const blueprint =
        mode === 'ai'
          ? blueprintSchema.parse(await postJSON('/api/blueprint', parsed.data))
          : blankBlueprint();
      if (active.current) onCreate(parsed.data, blueprint, mode);
    } catch (error) {
      if (active.current)
        setError(
          error instanceof Error
            ? error.message
            : 'The blueprint could not be created. Your input is still here.',
        );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  return (
    <div className="form-page">
      <a className="back-link" href="#/units">
        <ArrowLeft size={16} /> Your units
      </a>
      <header className="page-heading">
        <Eyebrow>A new language journey</Eyebrow>
        <h1 tabIndex={-1}>Start with the workshop.</h1>
        <p>Bring the learning students are working toward. Build the language journey around it.</p>
      </header>
      <div className="create-layout">
        <form onSubmit={submit} className="create-form">
          <fieldset disabled={busy}>
            <section className="form-section">
              <div className="section-number">01</div>
              <div className="section-content">
                <h2>The curriculum connection</h2>
                <p className="muted">
                  A short overview is enough to begin. You can refine the blueprint next.
                </p>
                <Field label="Unit title">
                  <input
                    autoFocus
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder="e.g. How characters change"
                    value={context.title}
                    onChange={(event) => update('title', event.target.value)}
                  />
                </Field>
                <div className="field-row">
                  <Field label="Grade or grade band">
                    <input
                      maxLength={40}
                      value={context.grade}
                      onChange={(event) => update('grade', event.target.value)}
                      placeholder="e.g. Grades 4–5"
                    />
                  </Field>
                  <Field label="Workshop">
                    <select
                      value={context.strand}
                      onChange={(event) =>
                        update('strand', event.target.value as Context['strand'])
                      }
                    >
                      <option>Reading</option>
                      <option>Writing</option>
                    </select>
                  </Field>
                </div>
                <CurriculumSourcesPanel
                  sources={context.curriculumSources ?? []}
                  onChange={(sources) => update('curriculumSources', sources)}
                  disabled={busy}
                  onBusyChange={setPdfBusy}
                />
                <Field
                  label="What will students understand and do?"
                  hint={
                    context.curriculumSources?.length
                      ? 'Optional: give the unit a focus or add context beyond the reviewed PDF pages.'
                      : 'Paste a workshop overview, describe the task, or upload and review a PDF above.'
                  }
                >
                  <textarea
                    required={!context.curriculumSources?.length}
                    minLength={context.curriculumSources?.length ? undefined : 30}
                    maxLength={12000}
                    rows={7}
                    placeholder="Students will… During workshop they will read, discuss, or write…"
                    value={context.curriculum}
                    onChange={(event) => update('curriculum', event.target.value)}
                  />
                  <span className="input-count">
                    {context.curriculum.length.toLocaleString()} / 12,000
                  </span>
                </Field>
              </div>
            </section>
            <section className="form-section">
              <div className="section-number">02</div>
              <div className="section-content">
                <h2>Your teaching context</h2>
                <Field
                  label="What can this group already do?"
                  hint="Optional. Add recent classroom evidence, available languages, or helpful supports. Use group descriptions without names."
                >
                  <textarea
                    rows={4}
                    maxLength={2000}
                    placeholder="Students can explain their ideas orally… In recent workshop discussions I noticed…"
                    value={context.groupContext}
                    onChange={(event) => update('groupContext', event.target.value)}
                  />
                </Field>
                <div className="field-row">
                  <Field label="Approximate duration">
                    <div className="input-suffix">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        required
                        value={context.durationWeeks}
                        onChange={(event) => update('durationWeeks', Number(event.target.value))}
                      />
                      <span>weeks</span>
                    </div>
                  </Field>
                  <Field label="Protected EAL session">
                    <div className="input-suffix">
                      <input
                        type="number"
                        min={10}
                        max={120}
                        required
                        value={context.sessionMinutes}
                        onChange={(event) => update('sessionMinutes', Number(event.target.value))}
                      />
                      <span>minutes</span>
                    </div>
                  </Field>
                </div>
              </div>
            </section>
            <section className="form-section">
              <div className="section-number">03</div>
              <div className="section-content">
                <h2>Choose your starting point</h2>
                <div className="mode-options">
                  <label
                    className={`mode-option ${mode === 'ai' ? 'selected' : ''} ${!aiEnabled ? 'disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === 'ai'}
                      disabled={!aiEnabled}
                      onChange={() => setMode('ai')}
                    />
                    <Sparkles size={20} />
                    <span>
                      <strong>Draft with AI</strong>
                      <small>
                        {aiEnabled
                          ? 'Get a suggested sequence to review and edit.'
                          : import.meta.env.MODE === 'pages'
                            ? 'Use the local app for AI drafting. PDF sources work here.'
                            : 'Available when the local server has an API key.'}
                      </small>
                    </span>
                  </label>
                  <label className={`mode-option ${mode === 'outline' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === 'outline'}
                      onChange={() => setMode('outline')}
                    />
                    <PenLine size={20} />
                    <span>
                      <strong>Build it yourself</strong>
                      <small>Start with an empty, editable blueprint.</small>
                    </span>
                  </label>
                </div>
                {mode === 'ai' && (
                  <p className="privacy-note">
                    Your workshop overview, reviewed PDF pages, and group notes will be sent to
                    OpenAI to draft suggestions. Review what you share before continuing.
                  </p>
                )}
              </div>
            </section>
          </fieldset>
          {error && (
            <div className="message error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <a className="button secondary" href="#/units">
              Cancel
            </a>
            <button className="button primary" disabled={busy || pdfBusy}>
              {busy ? (
                <>
                  <Spinner /> Building your blueprint…
                </>
              ) : (
                <>
                  {pdfBusy ? 'Review PDF pages first' : 'Create unit blueprint'}{' '}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
          {busy && (
            <p className="busy-note" role="status">
              Considering the workshop task, language demands, and a connected sequence. This can
              take a minute.
            </p>
          )}
        </form>
        <aside className="create-aside">
          <FileText size={24} />
          <h3>
            A clear beginning.
            <br />
            Room to adapt.
          </h3>
          <p>
            Your blueprint will connect the workshop task to language goals, learning steps, and
            evidence to look for.
          </p>
          <div className="aside-rule" />
          <p>
            You’ll review the sequence before creating a lesson. Your professional judgment stays at
            the center.
          </p>
          <span className="small-label">No assessment scores required</span>
        </aside>
      </div>
    </div>
  );
}
