import { useState, type FormEvent } from 'react';
import { FileText, Sparkles, Upload } from 'lucide-react';
import {
  blueprintSchema,
  contextSchema,
  type Blueprint,
  type Context,
  type Unit,
} from '../../shared/model';
import { pageNumbersLabel, type CurriculumSource } from '../../shared/curriculum';
import { editBlueprint, editUnitContext } from '../../shared/planning';
import { CurriculumSourcesPanel, SourceTextDialog } from './CurriculumSources';
import { Dialog, Field, Spinner, postJSON } from './ui';

export function UnitCurriculum({
  unit,
  aiEnabled,
  onUpdate,
  notify,
}: {
  unit: Unit;
  aiEnabled: boolean;
  onUpdate: (unit: Unit) => boolean;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<CurriculumSource | null>(null);
  const [proposalOpen, setProposalOpen] = useState(false);
  const sources = unit.context.curriculumSources ?? [];
  return (
    <section className="unit-curriculum">
      <div className="section-title-row">
        <div>
          <h3>Curriculum sources</h3>
          <p>
            {sources.length
              ? 'Reviewed PDF pages inform this unit and its connected lessons.'
              : 'Bring a curriculum PDF into the planning conversation.'}
          </p>
        </div>
        <div className="button-group">
          <button className="button secondary" type="button" onClick={() => setEditing(true)}>
            <Upload size={16} /> {sources.length ? 'Manage PDFs' : 'Add curriculum PDF'}
          </button>
          {sources.length > 0 && aiEnabled && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setProposalOpen(true)}
            >
              <Sparkles size={16} /> Draft from curriculum
            </button>
          )}
        </div>
      </div>
      {sources.length > 0 && (
        <div className="unit-source-list">
          {sources.map((source) => (
            <button
              type="button"
              className="unit-source-link"
              key={source.id}
              onClick={() => setView(source)}
            >
              <FileText size={18} />
              <span>
                <strong>{source.name}</strong>
                <small>Reviewed PDF text · pages {pageNumbersLabel(source.pages)}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      {editing && (
        <EditCurriculum
          context={unit.context}
          onClose={() => setEditing(false)}
          onSave={(context) => {
            const saved = onUpdate(editUnitContext(unit, context));
            if (saved)
              notify(
                'Curriculum saved. Review the blueprint or draft an update from the selected PDF pages. Earlier lessons keep their original sources.',
              );
            return saved;
          }}
        />
      )}
      {view && <SourceTextDialog source={view} onClose={() => setView(null)} />}
      {proposalOpen && (
        <CurriculumProposal
          context={unit.context}
          onClose={() => setProposalOpen(false)}
          onApply={(blueprint) => {
            const saved = onUpdate({ ...editBlueprint(unit, blueprint), mode: 'ai' });
            if (saved) {
              setProposalOpen(false);
              notify(
                'Suggested blueprint saved as a draft. Review it before approval; existing lessons are kept.',
              );
            }
            return saved;
          }}
        />
      )}
    </section>
  );
}

function EditCurriculum({
  context,
  onSave,
  onClose,
}: {
  context: Context;
  onSave: (context: Context) => boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(context));
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState('');
  function save(event: FormEvent) {
    event.preventDefault();
    const parsed = contextSchema.safeParse(draft);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message || 'Review the PDF pages or add a short workshop overview.',
      );
      return;
    }
    if (onSave(parsed.data)) onClose();
  }
  return (
    <Dialog
      title="Add curriculum to this unit"
      description="Review the relevant pages. Changing the curriculum creates a draft and preserves earlier approved plans and lessons."
      onClose={onClose}
      wide
    >
      <form onSubmit={save}>
        <CurriculumSourcesPanel
          sources={draft.curriculumSources ?? []}
          onChange={(sources) =>
            setDraft((previous) => ({ ...previous, curriculumSources: sources }))
          }
          onBusyChange={setPdfBusy}
        />
        <Field
          label="Unit focus or workshop overview"
          hint="Optional when you have reviewed PDF pages. Explain what this particular unit should emphasize."
        >
          <textarea
            rows={4}
            maxLength={12000}
            value={draft.curriculum}
            onChange={(event) =>
              setDraft((previous) => ({ ...previous, curriculum: event.target.value }))
            }
          />
        </Field>
        {error && (
          <div className="message error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={pdfBusy}>
            {pdfBusy ? 'Review PDF pages first' : 'Save curriculum'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function CurriculumProposal({
  context,
  onApply,
  onClose,
}: {
  context: Context;
  onApply: (blueprint: Blueprint) => boolean;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Blueprint | null>(null);
  const [error, setError] = useState('');
  async function draft() {
    setBusy(true);
    setError('');
    try {
      setProposal(blueprintSchema.parse(await postJSON('/api/blueprint', context)));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'A draft could not be created. Your current plan is safe.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Draft from your curriculum"
      description="Your current blueprint stays in place until you choose to use this suggestion. Earlier approved plans and lessons are preserved."
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      {proposal ? (
        <div className="curriculum-proposal">
          <p>{proposal.summary}</p>
          <h3>Suggested goals</h3>
          {proposal.goals.map((goal) => (
            <div className="proposal-goal" key={goal.id}>
              <span className="small-label">
                {goal.kind === 'content' ? 'Content' : 'Language'}
              </span>
              <p>{goal.text}</p>
            </div>
          ))}
          <h3>Suggested learning journey</h3>
          <ol>
            {proposal.steps.map((step) => (
              <li key={step.id}>
                <strong>{step.title}</strong>
                <p>{step.languageFocus}</p>
              </li>
            ))}
          </ol>
          <p className="privacy-note">
            Using this suggestion replaces the current editable blueprint with a new draft. It does
            not approve it or rewrite saved lessons.
          </p>
        </div>
      ) : (
        <>
          <p>
            The selected, reviewed PDF pages, workshop notes, and group context will be sent to
            OpenAI to suggest a connected unit blueprint.
          </p>
          <ul className="proposal-source-list">
            {context.curriculumSources?.map((source) => (
              <li key={source.id}>
                {source.name} · pages {pageNumbersLabel(source.pages)}
              </li>
            ))}
          </ul>
        </>
      )}
      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}
      <div className="dialog-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
          {proposal ? 'Keep current blueprint' : 'Cancel'}
        </button>
        {proposal ? (
          <button className="button primary" onClick={() => onApply(proposal)}>
            Use this suggested draft
          </button>
        ) : (
          <button
            type="button"
            className="button primary"
            disabled={busy}
            onClick={() => void draft()}
          >
            {busy ? (
              <>
                <Spinner /> Drafting from your pages…
              </>
            ) : (
              <>
                <Sparkles size={16} /> Create suggested blueprint
              </>
            )}
          </button>
        )}
      </div>
    </Dialog>
  );
}
