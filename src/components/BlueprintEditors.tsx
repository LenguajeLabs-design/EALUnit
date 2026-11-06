import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Blueprint, LearningStep } from '../../shared/model';
import { blueprintSchema, originLabel, stepSchema } from '../../shared/model';
import { newId } from '../../shared/planning';
import { Dialog, Field } from './ui';

export function GoalsEditor({
  blueprint,
  onSave,
  onClose,
}: {
  blueprint: Blueprint;
  onSave: (blueprint: Blueprint) => boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(blueprint));
  const [error, setError] = useState('');
  function save(event: FormEvent) {
    event.preventDefault();
    const parsed = blueprintSchema.safeParse(draft);
    if (!parsed.success) {
      setError('Check the text limits and keep between 2 and 12 goals. Your edits are still here.');
      return;
    }
    if (onSave(parsed.data)) onClose();
  }
  return (
    <Dialog
      title="Refine the unit blueprint"
      description="Keep a focused set of goals and prioritize the language demands that matter for this task."
      onClose={onClose}
      wide
    >
      <form onSubmit={save}>
        <Field label="The language journey in a few sentences">
          <textarea
            rows={3}
            maxLength={2000}
            value={draft.summary}
            onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          />
        </Field>
        <div className="editor-heading">
          <h3>Content and language goals</h3>
          <button
            type="button"
            className="text-button"
            disabled={draft.goals.length >= 12}
            onClick={() =>
              setDraft({
                ...draft,
                goals: [
                  ...draft.goals,
                  {
                    id: newId(),
                    kind: 'language',
                    text: '',
                    origin: 'teacher_entered',
                    reviewStatus: 'edited',
                  },
                ],
              })
            }
          >
            <Plus size={16} /> Add goal
          </button>
        </div>
        {draft.goals.map((goal, index) => (
          <div className="editor-row" key={goal.id}>
            <div className="field-row">
              <Field label={`Goal ${index + 1} type`}>
                <select
                  value={goal.kind}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      goals: draft.goals.map((item) =>
                        item.id === goal.id
                          ? {
                              ...item,
                              kind: event.target.value as typeof goal.kind,
                              reviewStatus: 'edited',
                            }
                          : item,
                      ),
                    })
                  }
                >
                  <option value="content">Content goal</option>
                  <option value="language">Language goal</option>
                </select>
              </Field>
              <span className="source-label">{originLabel[goal.origin]}</span>
            </div>
            <Field label={`Goal ${index + 1}`}>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder={
                  goal.kind === 'content'
                    ? 'What will students understand or do in workshop?'
                    : 'What will students learn to do with language?'
                }
                value={goal.text}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    goals: draft.goals.map((item) =>
                      item.id === goal.id
                        ? { ...item, text: event.target.value, reviewStatus: 'edited' }
                        : item,
                    ),
                  })
                }
              />
            </Field>
            <button
              type="button"
              className="text-button danger"
              disabled={draft.goals.length <= 2}
              onClick={() =>
                setDraft({
                  ...draft,
                  goals: draft.goals.filter((item) => item.id !== goal.id),
                  steps: draft.steps.map((step) => ({
                    ...step,
                    goalIds: step.goalIds.filter((id) => id !== goal.id),
                  })),
                })
              }
            >
              <Trash2 size={14} /> Remove goal
            </button>
          </div>
        ))}
        <div className="editor-heading">
          <h3>Language demands</h3>
          <button
            type="button"
            className="text-button"
            disabled={draft.demands.length >= 12}
            onClick={() =>
              setDraft({
                ...draft,
                demands: [
                  ...draft.demands,
                  {
                    id: newId(),
                    text: '',
                    domain: 'Expression',
                    priority: 'Teach explicitly',
                    origin: 'teacher_entered',
                    reviewStatus: 'edited',
                  },
                ],
              })
            }
          >
            <Plus size={16} /> Add demand
          </button>
        </div>
        {!draft.demands.length && (
          <p className="muted">
            Add the listening, reading, speaking, writing, or interaction demands of the task.
          </p>
        )}
        {draft.demands.map((demand, index) => (
          <div className="editor-row" key={demand.id}>
            <Field label={`Language demand ${index + 1}`}>
              <textarea
                rows={2}
                maxLength={2000}
                value={demand.text}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    demands: draft.demands.map((item) =>
                      item.id === demand.id
                        ? { ...item, text: event.target.value, reviewStatus: 'edited' }
                        : item,
                    ),
                  })
                }
              />
            </Field>
            <div className="field-row">
              <Field label="Language use">
                <select
                  value={demand.domain}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      demands: draft.demands.map((item) =>
                        item.id === demand.id
                          ? {
                              ...item,
                              domain: event.target.value as typeof demand.domain,
                              reviewStatus: 'edited',
                            }
                          : item,
                      ),
                    })
                  }
                >
                  <option>Understanding</option>
                  <option>Expression</option>
                  <option>Interaction</option>
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={demand.priority}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      demands: draft.demands.map((item) =>
                        item.id === demand.id
                          ? {
                              ...item,
                              priority: event.target.value as typeof demand.priority,
                              reviewStatus: 'edited',
                            }
                          : item,
                      ),
                    })
                  }
                >
                  <option>Teach explicitly</option>
                  <option>Support participation</option>
                  <option>Later</option>
                </select>
              </Field>
            </div>
            <button
              type="button"
              className="text-button danger"
              onClick={() =>
                setDraft({
                  ...draft,
                  demands: draft.demands.filter((item) => item.id !== demand.id),
                })
              }
            >
              <Trash2 size={14} /> Remove demand
            </button>
          </div>
        ))}
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">Save blueprint changes</button>
        </div>
      </form>
    </Dialog>
  );
}

export function StepEditor({
  step,
  blueprint,
  onSave,
  onRemove,
  onClose,
}: {
  step: LearningStep;
  blueprint: Blueprint;
  onSave: (step: LearningStep) => boolean;
  onRemove?: () => boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(step));
  const [supports, setSupports] = useState(step.supports.join('\n'));
  const [error, setError] = useState('');
  function update<K extends keyof LearningStep>(key: K, value: LearningStep[K]) {
    setDraft({ ...draft, [key]: value, reviewStatus: 'edited' });
  }
  function toggle(key: 'goalIds' | 'prerequisiteIds', id: string) {
    update(
      key,
      draft[key].includes(id) ? draft[key].filter((item) => item !== id) : [...draft[key], id],
    );
  }
  function save(event: FormEvent) {
    event.preventDefault();
    const parsed = stepSchema.safeParse({
      ...draft,
      supports: supports
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(
        'Use up to eight supports, each under 400 characters, and check the other text limits. Your edits are still here.',
      );
      return;
    }
    if (onSave(parsed.data)) onClose();
  }
  return (
    <Dialog
      title="Edit learning step"
      description="A learning step may span several lessons. Describe the capability students are developing."
      onClose={onClose}
      wide
    >
      <form onSubmit={save}>
        <Field label="Learning step">
          <input
            maxLength={160}
            value={draft.title}
            onChange={(event) => update('title', event.target.value)}
          />
        </Field>
        <Field label="Workshop task">
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="What does this connect to in workshop?"
            value={draft.workshopTask}
            onChange={(event) => update('workshopTask', event.target.value)}
          />
        </Field>
        <Field label="Protected EAL language focus">
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="What will students learn to do with language?"
            value={draft.languageFocus}
            onChange={(event) => update('languageFocus', event.target.value)}
          />
        </Field>
        <fieldset className="check-group">
          <legend>Connected unit goals</legend>
          {blueprint.goals.map((goal) => (
            <label className="checkbox-row" key={goal.id}>
              <input
                type="checkbox"
                checked={draft.goalIds.includes(goal.id)}
                onChange={() => toggle('goalIds', goal.id)}
              />
              <span>
                <small>{goal.kind === 'content' ? 'Content' : 'Language'}</small>
                {goal.text || 'Untitled goal'}
              </span>
            </label>
          ))}
        </fieldset>
        <Field label="Evidence to look for">
          <textarea
            rows={2}
            maxLength={2000}
            placeholder="What will students demonstrate? What prompting will you notice?"
            value={draft.evidence}
            onChange={(event) => update('evidence', event.target.value)}
          />
        </Field>
        <Field label="Transfer back to workshop">
          <textarea
            rows={2}
            maxLength={2000}
            value={draft.transfer}
            onChange={(event) => update('transfer', event.target.value)}
          />
        </Field>
        <Field
          label="Possible supports"
          hint="One per line, up to eight and 400 characters each. Choose supports in response to evidence."
        >
          <textarea
            rows={3}
            maxLength={3208}
            value={supports}
            onChange={(event) => setSupports(event.target.value)}
          />
        </Field>
        {blueprint.steps.length > 1 && (
          <fieldset className="check-group">
            <legend>Preparation this step depends on</legend>
            {blueprint.steps
              .filter((item) => item.id !== step.id)
              .map((item) => (
                <label className="checkbox-row" key={item.id}>
                  <input
                    type="checkbox"
                    checked={draft.prerequisiteIds.includes(item.id)}
                    onChange={() => toggle('prerequisiteIds', item.id)}
                  />
                  <span>{item.title}</span>
                </label>
              ))}
          </fieldset>
        )}
        {onRemove && (
          <p className="muted small">
            Removing a step also removes its prerequisite links. Previously approved revisions and
            lessons are kept.
          </p>
        )}
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          {onRemove && (
            <button
              type="button"
              className="text-button danger push-left"
              onClick={() => {
                if (onRemove()) onClose();
              }}
            >
              <Trash2 size={15} /> Remove step
            </button>
          )}
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary">Save learning step</button>
        </div>
      </form>
    </Dialog>
  );
}
