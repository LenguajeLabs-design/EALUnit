import { useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Clock3, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import {
  lessonContentSchema,
  lessonSchema,
  originLabel,
  type Lesson,
  type Unit,
} from '../../shared/model';
import { createLesson, currentApproval, lessonOutline, newId } from '../../shared/planning';
import { Dialog, Field, Spinner, Tag, postJSON } from './ui';
import { SourceCitations } from './CurriculumSources';

export function LessonCreator({
  unit,
  aiEnabled,
  onCreate,
  onClose,
}: {
  unit: Unit;
  aiEnabled: boolean;
  onCreate: (lesson: Lesson) => void;
  onClose: () => void;
}) {
  const approval = currentApproval(unit)!;
  const [stepIds, setStepIds] = useState<string[]>([approval.blueprint.steps[0].id]);
  const [mode, setMode] = useState<'ai' | 'outline'>(
    aiEnabled && unit.mode === 'ai' ? 'ai' : 'outline',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const steps = approval.blueprint.steps.filter((step) => stepIds.includes(step.id));
      const content =
        mode === 'ai'
          ? lessonContentSchema.parse(
              await postJSON('/api/lesson', {
                unit: { ...unit, approvals: [approval], lessons: [] },
                stepIds,
              }),
            )
          : lessonOutline(unit, steps);
      onCreate(createLesson(unit, stepIds, content, mode === 'ai' ? 'ai_proposed' : 'outline'));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The lesson could not be created.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Plan a connected lesson"
      description={`Choose the learning steps for this ${unit.context.sessionMinutes}-minute session. You can return to a step across several lessons.`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <fieldset className="check-group" disabled={busy}>
          <legend>Learning steps · approved revision {approval.revision}</legend>
          {approval.blueprint.steps.map((step, index) => (
            <label className="checkbox-row lesson-choice" key={step.id}>
              <input
                type="checkbox"
                checked={stepIds.includes(step.id)}
                onChange={() =>
                  setStepIds((previous) =>
                    previous.includes(step.id)
                      ? previous.filter((id) => id !== step.id)
                      : [...previous, step.id],
                  )
                }
              />
              <span>
                <small>Step {index + 1}</small>
                <strong>{step.title}</strong>
                <small>{step.languageFocus}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <Field label="Starting point">
          <select
            disabled={busy}
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
          >
            <option value="outline">Editable lesson outline</option>
            <option value="ai" disabled={!aiEnabled}>
              AI draft for review{!aiEnabled ? ' · not configured' : ''}
            </option>
          </select>
        </Field>
        <p className="privacy-note">
          {mode === 'ai'
            ? 'The approved unit context and selected steps will be sent to OpenAI. Your existing lessons will be kept.'
            : 'An outline carries over the approved purposes, evidence, and transfer. Its suggested activities need your adaptation.'}
        </p>
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy || !stepIds.length}>
            {busy ? (
              <>
                <Spinner /> Drafting lesson…
              </>
            ) : (
              <>
                Create lesson <Plus size={16} />
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function LessonView({
  unit,
  lesson,
  onUpdate,
  onBack,
}: {
  unit: Unit;
  lesson: Lesson;
  onUpdate: (lesson: Lesson) => boolean;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => structuredClone(lesson));
  const [error, setError] = useState('');
  const approval = unit.approvals.find((item) => item.revision === lesson.unitRevision)!;
  const steps = approval.blueprint.steps.filter((step) => lesson.stepIds.includes(step.id));
  const total = (editing ? draft : lesson).activities.reduce(
    (sum, activity) => sum + activity.minutes,
    0,
  );
  function update<K extends keyof Lesson>(key: K, value: Lesson[K]) {
    setDraft({ ...draft, [key]: value });
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const parsed = lessonSchema.safeParse({ ...draft, updatedAt: new Date().toISOString() });
    if (!parsed.success) {
      setError('Complete the lesson title and check activity lengths and text limits.');
      return;
    }
    if (onUpdate(parsed.data)) {
      setEditing(false);
      setError('');
    }
  }
  return (
    <section className="lesson-page">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> All connected lessons
      </button>
      <div className="lesson-heading">
        <div>
          <p className="eyebrow">Protected EAL · {lesson.sessionMinutes} minutes</p>
          <h2>{lesson.title}</h2>
          <p className="muted">
            {originLabel[lesson.origin]} · Based on approved unit revision {lesson.unitRevision}
          </p>
        </div>
        <div className="button-group no-print">
          {!editing && (
            <>
              <button className="button secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setDraft(structuredClone(lesson));
                  setEditing(true);
                }}
              >
                <Pencil size={16} /> Edit lesson
              </button>
            </>
          )}
        </div>
      </div>
      {lesson.unitRevision !== unit.revision && (
        <div className="message warning">
          The unit blueprint has changed. This lesson still uses its original approved goals.
          Compare it with the new sequence before teaching.
        </div>
      )}
      <div className="lesson-context">
        <SourceCitations
          refs={lesson.sourceRefs}
          sources={(approval.context ?? unit.context).curriculumSources ?? []}
        />
        <span className="small-label">Connected learning steps</span>
        <div className="tag-row">
          {steps.map((step) => (
            <Tag key={step.id}>{step.title}</Tag>
          ))}
        </div>
        <details>
          <summary>View the approved goals for this lesson</summary>
          <ul>
            {approval.blueprint.goals
              .filter((goal) => lesson.goalIds.includes(goal.id))
              .map((goal) => (
                <li key={goal.id}>
                  <strong>{goal.kind === 'content' ? 'Content' : 'Language'}:</strong> {goal.text}
                </li>
              ))}
          </ul>
        </details>
      </div>
      {editing ? (
        <form onSubmit={save} className="lesson-edit">
          <Field label="Lesson title">
            <input
              required
              maxLength={160}
              value={draft.title}
              onChange={(event) => update('title', event.target.value)}
            />
          </Field>
          {(['purpose', 'languagePurpose', 'startingCheck'] as const).map((key, index) => (
            <Field
              key={key}
              label={
                ['Purpose in the unit', 'Explicit language purpose', 'Starting-point check'][index]
              }
            >
              <textarea
                rows={3}
                maxLength={2000}
                value={draft[key]}
                onChange={(event) => update(key, event.target.value)}
              />
            </Field>
          ))}
          <div className="editor-heading">
            <h3>Student learning sequence</h3>
            <button
              type="button"
              className="text-button"
              disabled={draft.activities.length >= 10}
              onClick={() =>
                update('activities', [
                  ...draft.activities,
                  {
                    id: newId(),
                    title: 'New activity',
                    minutes: 5,
                    teacherMove: '',
                    studentMove: '',
                  },
                ])
              }
            >
              <Plus size={16} /> Add activity
            </button>
          </div>
          {draft.activities.map((activity, index) => (
            <div className="editor-row" key={activity.id}>
              <div className="field-row">
                <Field label={`Activity ${index + 1}`}>
                  <input
                    maxLength={160}
                    value={activity.title}
                    onChange={(event) =>
                      update(
                        'activities',
                        draft.activities.map((item) =>
                          item.id === activity.id ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Minutes">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={activity.minutes}
                    onChange={(event) =>
                      update(
                        'activities',
                        draft.activities.map((item) =>
                          item.id === activity.id
                            ? { ...item, minutes: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="Teacher move">
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={activity.teacherMove}
                  onChange={(event) =>
                    update(
                      'activities',
                      draft.activities.map((item) =>
                        item.id === activity.id
                          ? { ...item, teacherMove: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Student language use and thinking">
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={activity.studentMove}
                  onChange={(event) =>
                    update(
                      'activities',
                      draft.activities.map((item) =>
                        item.id === activity.id
                          ? { ...item, studentMove: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <button
                type="button"
                className="text-button danger"
                disabled={draft.activities.length <= 1}
                onClick={() =>
                  update(
                    'activities',
                    draft.activities.filter((item) => item.id !== activity.id),
                  )
                }
              >
                <Trash2 size={14} /> Remove activity
              </button>
            </div>
          ))}
          {(['supportNotes', 'evidence', 'transfer'] as const).map((key, index) => (
            <Field
              key={key}
              label={
                [
                  'Supports and when to adjust them',
                  'Evidence to collect',
                  'Transfer back to workshop',
                ][index]
              }
            >
              <textarea
                rows={3}
                maxLength={2000}
                value={draft[key]}
                onChange={(event) => update(key, event.target.value)}
              />
            </Field>
          ))}
          <p className={total > lesson.sessionMinutes ? 'timing over' : 'timing'}>
            <Clock3 size={16} /> {total} / {lesson.sessionMinutes} minutes planned
            {total > lesson.sessionMinutes ? ' · adjust timing before teaching' : ''}
          </p>
          {error && (
            <div className="message error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="button primary">
              <Check size={17} /> Save lesson changes
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="lesson-purpose-grid">
            <div>
              <h3>Purpose in the unit</h3>
              <p>{lesson.purpose}</p>
            </div>
            <div>
              <h3>The language students will use</h3>
              <p>{lesson.languagePurpose || 'Add an explicit language purpose before teaching.'}</p>
            </div>
          </div>
          <section className="lesson-section">
            <h3>Begin with what students can do</h3>
            <p>{lesson.startingCheck}</p>
          </section>
          <section className="lesson-section">
            <div className="section-title-row">
              <h3>The learning sequence</h3>
              <span className={total > lesson.sessionMinutes ? 'timing over' : 'timing'}>
                <Clock3 size={15} /> {total} / {lesson.sessionMinutes} min
              </span>
            </div>
            <div className="activity-list">
              {lesson.activities.map((activity, index) => (
                <article className="activity" key={activity.id}>
                  <div className="activity-index">{String(index + 1).padStart(2, '0')}</div>
                  <div className="activity-body">
                    <div className="section-title-row">
                      <h4>{activity.title}</h4>
                      <span className="minutes">{activity.minutes} min</span>
                    </div>
                    <div className="paired-columns">
                      <div>
                        <span className="small-label">Teacher move</span>
                        <p>{activity.teacherMove}</p>
                      </div>
                      <div>
                        <span className="small-label">Student language & thinking</span>
                        <p>{activity.studentMove}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="lesson-section">
            <h3>Supports, with room to grow</h3>
            <p className="preserve-lines">{lesson.supportNotes}</p>
          </section>
          <div className="lesson-purpose-grid evidence-grid">
            <div>
              <h3>Evidence to collect</h3>
              <p className="preserve-lines">{lesson.evidence}</p>
            </div>
            <div>
              <h3>Back in workshop</h3>
              <p className="preserve-lines">{lesson.transfer}</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
