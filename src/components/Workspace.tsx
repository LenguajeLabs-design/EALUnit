import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  FileText,
  GitBranch,
  Lightbulb,
  Pencil,
  Plus,
} from 'lucide-react';
import { originLabel, type Blueprint, type LearningStep, type Unit } from '../../shared/model';
import {
  approveUnit,
  blueprintIssues,
  currentApproval,
  editBlueprint,
  newId,
  unitInsights,
} from '../../shared/planning';
import { serializeLibrary } from '../../shared/storage';
import { GoalsEditor, StepEditor } from './BlueprintEditors';
import { LessonCreator, LessonView } from './Lessons';
import { Empty, Eyebrow, Tag, downloadJSON } from './ui';

export type Tab = 'overview' | 'journey' | 'lessons' | 'insights';
const tabs = [
  { id: 'overview' as Tab, label: 'Unit overview', icon: FileText },
  { id: 'journey' as Tab, label: 'Language journey', icon: GitBranch },
  { id: 'lessons' as Tab, label: 'Connected lessons', icon: BookOpen },
  { id: 'insights' as Tab, label: 'Unit insights', icon: Lightbulb },
];

export default function Workspace({
  unit,
  tab,
  lessonId,
  aiEnabled,
  onUpdate,
  notify,
}: {
  unit: Unit;
  tab: Tab;
  lessonId?: string;
  aiEnabled: boolean;
  onUpdate: (unit: Unit) => boolean;
  notify: (message: string) => void;
}) {
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<LearningStep | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const approval = currentApproval(unit);
  const issues = blueprintIssues(unit.blueprint);
  const insights = unitInsights(unit);
  const reviewCount = insights.filter((insight) => insight.kind === 'review').length;
  const base = `#/unit/${unit.id}`;
  const lesson = unit.lessons.find((item) => item.id === lessonId);
  const tabBar = useRef<HTMLElement>(null);
  useEffect(() => {
    const bar = tabBar.current;
    const active = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!bar || !active) return;
    const barBox = bar.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    if (activeBox.right > barBox.right) bar.scrollLeft += activeBox.right - barBox.right + 16;
    else if (activeBox.left < barBox.left) bar.scrollLeft -= barBox.left - activeBox.left + 16;
  }, [tab]);

  function saveBlueprint(blueprint: Blueprint) {
    const saved = onUpdate(editBlueprint(unit, blueprint));
    if (saved)
      notify(
        approval
          ? 'Changes saved as a new draft. Previous approved revisions and lessons are kept.'
          : 'Blueprint changes saved.',
      );
    return saved;
  }
  function approve() {
    try {
      if (onUpdate(approveUnit(unit)))
        notify('Blueprint approved. You can now plan connected lessons.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Review the blueprint before approving.');
    }
  }
  function moveStep(index: number, direction: number) {
    const steps = [...unit.blueprint.steps];
    [steps[index], steps[index + direction]] = [steps[index + direction], steps[index]];
    saveBlueprint({ ...unit.blueprint, steps });
  }
  function addStep() {
    setEditingStep({
      id: newId(),
      title: 'New learning step',
      workshopTask: '',
      languageFocus: '',
      evidence: '',
      transfer: '',
      supports: [],
      goalIds: [],
      prerequisiteIds: [],
      origin: 'teacher_entered',
      reviewStatus: 'edited',
    });
  }

  return (
    <div className="workspace">
      <header className="unit-heading">
        <div>
          <div className="unit-metadata">
            <Eyebrow>{unit.context.strand} workshop</Eyebrow>
            {unit.mode === 'example' && <Tag tone="example">Example unit</Tag>}
          </div>
          <h1 tabIndex={-1}>{unit.context.title}</h1>
          <p className="unit-meta">
            {unit.context.grade || 'Grade not specified'}
            <span>·</span>
            {unit.context.durationWeeks} weeks<span>·</span>
            {unit.context.sessionMinutes}-minute EAL sessions
          </p>
        </div>
        <div className="unit-actions">
          <button
            className="button secondary icon-on-mobile"
            onClick={() =>
              downloadJSON(serializeLibrary([unit]), `eal-unit-${unit.id.slice(0, 8)}.json`)
            }
            aria-label="Export this unit"
          >
            <Download size={17} />
            <span>Export unit</span>
          </button>
          {approval ? (
            <button className="button primary" onClick={() => setLessonOpen(true)}>
              <Plus size={17} /> Plan a lesson
            </button>
          ) : (
            <button className="button primary" disabled={issues.length > 0} onClick={approve}>
              <Check size={17} /> Approve blueprint
            </button>
          )}
        </div>
      </header>
      <div className={`review-strip ${approval ? 'approved' : ''}`}>
        <div>
          {approval ? <CheckCircle2 size={18} /> : <Eye size={18} />}
          <p>
            {approval ? (
              <>
                Blueprint approved{' '}
                <span>· revision {unit.revision}. Your linked lessons keep this context.</span>
              </>
            ) : (
              <>
                Review your blueprint{' '}
                <span>
                  ·{' '}
                  {unit.approvals.length
                    ? 'Changes are a new draft; earlier approved plans are kept.'
                    : 'Refine the goals and sequence before planning a lesson.'}
                </span>
              </>
            )}
          </p>
        </div>
        {!approval && issues.length > 0 && (
          <a href={`${base}/insights`}>
            {issues.length} {issues.length === 1 ? 'item' : 'items'} to complete{' '}
            <ChevronRight size={15} />
          </a>
        )}
        {!approval && issues.length === 0 && (
          <a href={`${base}/journey`}>
            Review the sequence <ChevronRight size={15} />
          </a>
        )}
      </div>
      {unit.mode === 'example' && (
        <p className="example-note">
          Illustrative curriculum and a fictional group. Adapt the unit to your own workshop before
          teaching.
        </p>
      )}
      <nav ref={tabBar} className="workspace-tabs" aria-label="Unit sections">
        {tabs.map((item) => (
          <a
            key={item.id}
            href={`${base}/${item.id}`}
            aria-current={tab === item.id ? 'page' : undefined}
            className={tab === item.id ? 'active' : ''}
          >
            <item.icon size={17} />
            <span>{item.label}</span>
            {item.id === 'lessons' && <span className="tab-count">{unit.lessons.length}</span>}
            {item.id === 'insights' && reviewCount > 0 && (
              <span className="tab-count needs-review">{reviewCount}</span>
            )}
          </a>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="overview-content">
          <section className="destination">
            <div>
              <Eyebrow>The shared destination</Eyebrow>
              <h2>
                Workshop learning.
                <br />
                <em>Language that opens it up.</em>
              </h2>
            </div>
            <div>
              <p>
                {unit.blueprint.summary ||
                  'Describe how the workshop learning and protected EAL sequence connect. Start by adding your content and language goals.'}
              </p>
              <button className="text-button" onClick={() => setGoalsOpen(true)}>
                <Pencil size={15} /> Refine the blueprint
              </button>
            </div>
          </section>
          <section className="goals-section">
            <div className="section-title-row">
              <h2>A focused set of goals</h2>
              <button className="text-button" onClick={() => setGoalsOpen(true)}>
                <Pencil size={15} /> Edit goals & demands
              </button>
            </div>
            <div className="goals-grid">
              {(['content', 'language'] as const).map((kind) => (
                <div className={`goal-column ${kind}`} key={kind}>
                  <span className="small-label">
                    {kind === 'content' ? 'In homeroom workshop' : 'In protected EAL'}
                  </span>
                  <h3>
                    {kind === 'content'
                      ? 'What students will understand & do'
                      : 'What students will learn to do with language'}
                  </h3>
                  {unit.blueprint.goals
                    .filter((goal) => goal.kind === kind)
                    .map((goal) => (
                      <div className="goal-item" key={goal.id}>
                        <span className="goal-dot" />
                        <div>
                          <p>{goal.text || 'Add a goal to give the sequence a clear purpose.'}</p>
                          <small className="source-label">
                            {originLabel[goal.origin]}
                            {goal.reviewStatus === 'edited' ? ' · teacher edited' : ''}
                          </small>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </section>
          <section className="demands-section">
            <div className="section-title-row">
              <div>
                <Eyebrow>Look beneath the task</Eyebrow>
                <h2>The language participation requires</h2>
              </div>
              <span className="muted small">
                {unit.blueprint.demands.length} prioritized demands
              </span>
            </div>
            {unit.blueprint.demands.length ? (
              <div className="demand-list">
                {unit.blueprint.demands.map((demand) => (
                  <div className="demand" key={demand.id}>
                    <span className="demand-domain">{demand.domain}</span>
                    <p>{demand.text}</p>
                    <Tag tone={demand.priority === 'Teach explicitly' ? 'teaching' : ''}>
                      {demand.priority}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Start with the actual workshop task">
                Add the language students will need to understand, express, and discuss their ideas.
              </Empty>
            )}
          </section>
          <a className="journey-invitation" href={`${base}/journey`}>
            <div className="invitation-icon">
              <GitBranch size={24} />
            </div>
            <div>
              <span className="small-label">From goals to a sequence</span>
              <h3>
                {unit.blueprint.steps.length} learning{' '}
                {unit.blueprint.steps.length === 1 ? 'step' : 'steps'}, one connected journey
              </h3>
              <p>See how language develops and transfers back into workshop.</p>
            </div>
            <ArrowRight size={23} />
          </a>
          <div className="context-grid">
            <details className="context-detail">
              <summary>
                <span>
                  <FileText size={17} /> Your curriculum overview
                </span>
                <Tag>{unit.mode === 'example' ? 'Example context' : 'Teacher entered'}</Tag>
              </summary>
              <p className="preserve-lines">{unit.context.curriculum}</p>
              <p className="privacy-note">
                {unit.mode === 'example'
                  ? 'Illustrative planning context, not an approved curriculum.'
                  : 'Planning context supplied by the teacher; not independently verified curriculum alignment.'}
              </p>
            </details>
            <details className="context-detail">
              <summary>
                <span>
                  <BookOpen size={17} /> Learner & group context
                </span>
              </summary>
              <p className="preserve-lines">
                {unit.context.groupContext ||
                  'No group evidence added yet. Gather a short oral or written response before judging readiness or assigning support.'}
              </p>
            </details>
          </div>
          {(unit.blueprint.assumptions.length > 0 || unit.blueprint.questions.length > 0) && (
            <div className="assumptions-grid">
              <div>
                <h3>Assumptions to check</h3>
                {unit.blueprint.assumptions.length ? (
                  <ul>
                    {unit.blueprint.assumptions.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No assumptions recorded.</p>
                )}
              </div>
              <div>
                <h3>Keep these questions open</h3>
                <ul>
                  {unit.blueprint.questions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'journey' && (
        <section className="journey-section">
          <div className="section-title-row section-intro">
            <div>
              <Eyebrow>A progression, not a timetable</Eyebrow>
              <h2>One journey. Flexible pacing.</h2>
              <p className="muted">
                A step can span several lessons. Revisit it when classroom evidence calls for it.
              </p>
            </div>
            <button
              className="button secondary"
              disabled={unit.blueprint.steps.length >= 12}
              onClick={addStep}
            >
              <Plus size={16} /> Add step
            </button>
          </div>
          <div className="journey-list">
            {unit.blueprint.steps.map((step, index) => (
              <article className="journey-step" key={step.id}>
                <div className="step-rail">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="step-body">
                  <div className="step-heading">
                    <div>
                      <h3>{step.title}</h3>
                      <span className="source-label">{originLabel[step.origin]}</span>
                    </div>
                    <div className="step-controls">
                      <button
                        className="icon-button"
                        aria-label={`Move ${step.title} up`}
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Move ${step.title} down`}
                        disabled={index === unit.blueprint.steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        className="button small secondary"
                        aria-label={`Edit ${step.title}`}
                        onClick={() => setEditingStep(step)}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    </div>
                  </div>
                  <div className="paired-columns">
                    <div>
                      <span className="small-label">Workshop task</span>
                      <p>{step.workshopTask || 'Describe the workshop connection.'}</p>
                    </div>
                    <div>
                      <span className="small-label">Protected EAL focus</span>
                      <p>{step.languageFocus || 'Describe the language students will develop.'}</p>
                    </div>
                  </div>
                  <details className="step-details">
                    <summary>
                      Evidence, transfer & supports <ChevronRight size={14} />
                    </summary>
                    <div className="paired-columns">
                      <div>
                        <span className="small-label">Evidence to look for</span>
                        <p>{step.evidence || 'Add an observable evidence check.'}</p>
                      </div>
                      <div>
                        <span className="small-label">Back in workshop</span>
                        <p>{step.transfer || 'Name an opportunity to transfer the learning.'}</p>
                      </div>
                    </div>
                    <div className="support-row">
                      <span className="small-label">Possible supports</span>
                      <p>
                        {step.supports.join(' · ') || 'Choose support in response to evidence.'}
                      </p>
                    </div>
                    <div className="linked-goals">
                      <span className="small-label">Connected goals</span>
                      <ul>
                        {unit.blueprint.goals
                          .filter((goal) => step.goalIds.includes(goal.id))
                          .map((goal) => (
                            <li key={goal.id}>{goal.text || 'Untitled goal'}</li>
                          ))}
                      </ul>
                      {step.prerequisiteIds.length > 0 && (
                        <p className="muted small">
                          Preparation:{' '}
                          {unit.blueprint.steps
                            .filter((item) => step.prerequisiteIds.includes(item.id))
                            .map((item) => item.title)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                  </details>
                </div>
              </article>
            ))}
          </div>
          <div className="journey-footer">
            <p>Use evidence of language use and independence to decide when to move on.</p>
            {approval && (
              <button className="button primary" onClick={() => setLessonOpen(true)}>
                Plan a connected lesson <ArrowRight size={17} />
              </button>
            )}
          </div>
        </section>
      )}

      {tab === 'lessons' &&
        (lesson ? (
          <LessonView
            key={lesson.id}
            unit={unit}
            lesson={lesson}
            onBack={() => {
              window.location.hash = `${base}/lessons`;
            }}
            onUpdate={(updated) => {
              const saved = onUpdate({
                ...unit,
                lessons: unit.lessons.map((item) => (item.id === updated.id ? updated : item)),
                updatedAt: new Date().toISOString(),
              });
              if (saved) notify('Lesson changes saved.');
              return saved;
            }}
          />
        ) : (
          <section className="lessons-section">
            <div className="section-title-row section-intro">
              <div>
                <Eyebrow>Bring the journey into the classroom</Eyebrow>
                <h2>Connected, adaptable lessons.</h2>
                <p className="muted">
                  Every lesson keeps a link to its approved unit goals and learning steps.
                </p>
              </div>
              <button
                className="button primary"
                disabled={!approval || unit.lessons.length >= 80}
                onClick={() => setLessonOpen(true)}
              >
                <Plus size={17} /> Plan a lesson
              </button>
            </div>
            {!approval && (
              <div className="message warning">
                Review and approve the current blueprint before creating a lesson. Existing lessons
                remain available.
              </div>
            )}
            {unit.lessons.length ? (
              <div className="lesson-list">
                {unit.lessons.map((item, index) => (
                  <a className="lesson-card" key={item.id} href={`${base}/lessons/${item.id}`}>
                    <span className="lesson-number">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <div className="tag-row">
                        <span className="small-label">Protected EAL</span>
                        {item.unitRevision !== unit.revision && (
                          <Tag tone="warning">Review unit changes</Tag>
                        )}
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.languagePurpose || 'Add an explicit language purpose.'}</p>
                      <div className="lesson-card-meta">
                        <span>
                          <Clock3 size={14} /> {item.sessionMinutes} minutes
                        </span>
                        <span>
                          {item.stepIds.length} linked{' '}
                          {item.stepIds.length === 1 ? 'step' : 'steps'}
                        </span>
                        <span>Revision {item.unitRevision}</span>
                      </div>
                    </div>
                    <ArrowRight size={20} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="lesson-empty">
                <BookOpen size={34} strokeWidth={1.3} />
                <h3>
                  The sequence comes first.
                  <br />
                  Your first lesson comes next.
                </h3>
                <p>
                  Choose one or more learning steps and turn them into a session with an explicit
                  language purpose, useful supports, and evidence to collect.
                </p>
                {approval && (
                  <button className="text-button" onClick={() => setLessonOpen(true)}>
                    Plan your first lesson <ArrowRight size={17} />
                  </button>
                )}
              </div>
            )}
          </section>
        ))}

      {tab === 'insights' && (
        <section className="insights-section">
          <div className="section-intro">
            <Eyebrow>See the connections and the gaps</Eyebrow>
            <h2>A clearer view of the whole unit.</h2>
            <p className="muted">
              These checks describe your plan. They don’t judge student readiness or measure
              learning.
            </p>
          </div>
          <div className="insight-layout">
            <div className="insight-feed">
              <h3 className="feed-title">
                {reviewCount
                  ? `${reviewCount} ${reviewCount === 1 ? 'connection' : 'connections'} to review`
                  : 'The planning connections are in place'}
              </h3>
              {!reviewCount && (
                <div className="insight success">
                  <CheckCircle2 size={20} />
                  <div>
                    <h4>No structural gaps flagged</h4>
                    <p>
                      Keep checking the sequence against classroom evidence and the actual workshop
                      task.
                    </p>
                  </div>
                </div>
              )}
              {insights.map((insight) => (
                <article className={`insight ${insight.kind}`} key={insight.id}>
                  {insight.kind === 'review' ? (
                    <ClipboardCheck size={20} />
                  ) : (
                    <Lightbulb size={20} />
                  )}
                  <div>
                    <h4>{insight.title}</h4>
                    <p>{insight.detail}</p>
                    <p className="insight-action">{insight.action}</p>
                  </div>
                </article>
              ))}
            </div>
            <aside className="coverage">
              <h3>Goals across the journey</h3>
              <p className="muted small">
                Linked practice and planned evidence, not a proficiency score.
              </p>
              {unit.blueprint.goals.map((goal) => {
                const count = unit.blueprint.steps.filter((step) =>
                  step.goalIds.includes(goal.id),
                ).length;
                const scheduled = unit.lessons.filter(
                  (lesson) =>
                    lesson.unitRevision === unit.revision && lesson.goalIds.includes(goal.id),
                ).length;
                return (
                  <div className="coverage-goal" key={goal.id}>
                    <span className="small-label">
                      {goal.kind === 'content' ? 'Content' : 'Language'}
                    </span>
                    <p>{goal.text || 'Untitled goal'}</p>
                    <div>
                      <span>
                        {count} learning {count === 1 ? 'step' : 'steps'}
                      </span>
                      <span>
                        {scheduled} {scheduled === 1 ? 'lesson' : 'lessons'}
                      </span>
                    </div>
                  </div>
                );
              })}
              <a className="text-button" href={`${base}/journey`}>
                Review learning steps <ArrowRight size={15} />
              </a>
            </aside>
          </div>
        </section>
      )}

      {goalsOpen && (
        <GoalsEditor
          blueprint={unit.blueprint}
          onClose={() => setGoalsOpen(false)}
          onSave={saveBlueprint}
        />
      )}
      {editingStep && (
        <StepEditor
          key={editingStep.id}
          step={editingStep}
          blueprint={
            unit.blueprint.steps.some((step) => step.id === editingStep.id)
              ? unit.blueprint
              : { ...unit.blueprint, steps: [...unit.blueprint.steps, editingStep] }
          }
          onClose={() => setEditingStep(null)}
          onSave={(updated) =>
            saveBlueprint({
              ...unit.blueprint,
              steps: unit.blueprint.steps.some((step) => step.id === updated.id)
                ? unit.blueprint.steps.map((step) => (step.id === updated.id ? updated : step))
                : [...unit.blueprint.steps, updated],
            })
          }
          onRemove={
            unit.blueprint.steps.length > 1 &&
            unit.blueprint.steps.some((step) => step.id === editingStep.id)
              ? () =>
                  saveBlueprint({
                    ...unit.blueprint,
                    steps: unit.blueprint.steps
                      .filter((step) => step.id !== editingStep.id)
                      .map((step) => ({
                        ...step,
                        prerequisiteIds: step.prerequisiteIds.filter((id) => id !== editingStep.id),
                      })),
                  })
              : undefined
          }
        />
      )}
      {lessonOpen && approval && (
        <LessonCreator
          unit={unit}
          aiEnabled={aiEnabled}
          onClose={() => setLessonOpen(false)}
          onCreate={(created) => {
            if (
              onUpdate({
                ...unit,
                lessons: [...unit.lessons, created],
                updatedAt: new Date().toISOString(),
              })
            ) {
              setLessonOpen(false);
              window.location.hash = `${base}/lessons/${created.id}`;
              notify('Connected lesson created. Review and adapt it before teaching.');
            }
          }}
        />
      )}
    </div>
  );
}
