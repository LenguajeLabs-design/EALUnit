import type { Blueprint, Context, LearningStep, Lesson, LessonContent, Unit } from './model';
import { contextSchema } from './model';
import { blueprintReferenceIssues, referenceIssues } from './curriculum';

export const newId = () => crypto.randomUUID();

export function blueprintIssues(blueprint: Blueprint): string[] {
  const issues: string[] = [];
  const goalIds = new Set(blueprint.goals.map((goal) => goal.id));
  const stepIds = new Set(blueprint.steps.map((step) => step.id));
  if (goalIds.size !== blueprint.goals.length) issues.push('Goal IDs must be unique.');
  if (stepIds.size !== blueprint.steps.length) issues.push('Learning-step IDs must be unique.');
  if (new Set(blueprint.demands.map((demand) => demand.id)).size !== blueprint.demands.length)
    issues.push('Language-demand IDs must be unique.');
  if (!blueprint.goals.some((goal) => goal.kind === 'content' && goal.text.trim()))
    issues.push('Add a content goal for the workshop task.');
  if (!blueprint.goals.some((goal) => goal.kind === 'language' && goal.text.trim()))
    issues.push('Add an explicit language goal.');
  if (blueprint.goals.some((goal) => !goal.text.trim()))
    issues.push('Complete or remove empty goals.');
  if (blueprint.demands.some((demand) => !demand.text.trim()))
    issues.push('Complete or remove empty language demands.');
  for (const [index, step] of blueprint.steps.entries()) {
    const name = step.title.trim() || `Step ${index + 1}`;
    if (
      ![step.title, step.workshopTask, step.languageFocus, step.evidence, step.transfer].every(
        (value) => value.trim(),
      )
    ) {
      issues.push(`${name}: complete the task, language focus, evidence, and transfer.`);
    }
    if (!step.goalIds.length) issues.push(`${name}: link at least one unit goal.`);
    if (step.goalIds.some((goal) => !goalIds.has(goal)))
      issues.push(`${name}: a linked goal no longer exists.`);
    if (step.prerequisiteIds.some((prerequisite) => !stepIds.has(prerequisite)))
      issues.push(`${name}: a prerequisite no longer exists.`);
    if (step.prerequisiteIds.includes(step.id))
      issues.push(`${name}: a step cannot be its own prerequisite.`);
    if (
      new Set(step.goalIds).size !== step.goalIds.length ||
      new Set(step.prerequisiteIds).size !== step.prerequisiteIds.length
    )
      issues.push(`${name}: remove duplicate links.`);
  }
  const visited = new Set<string>();
  const active = new Set<string>();
  const byId = new Map(blueprint.steps.map((step) => [step.id, step]));
  function cycle(id: string): boolean {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    active.add(id);
    if (byId.get(id)?.prerequisiteIds.some(cycle)) return true;
    active.delete(id);
    visited.add(id);
    return false;
  }
  if (blueprint.steps.some((step) => cycle(step.id)))
    issues.push('Prerequisites form a cycle. Give the sequence a clear starting point.');
  return [...new Set(issues)];
}

export function createUnit(context: Context, blueprint: Blueprint, mode: Unit['mode']): Unit {
  const now = new Date().toISOString();
  return {
    id: newId(),
    context,
    blueprint,
    mode,
    revision: 1,
    approvals: [],
    lessons: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const currentApproval = (unit: Unit) =>
  unit.approvals.find((approval) => approval.revision === unit.revision);

export function editUnitContext(unit: Unit, next: Context): Unit {
  const context = contextSchema.parse(next);
  if (JSON.stringify(unit.context) === JSON.stringify(context)) return unit;
  const sources = context.curriculumSources ?? [];
  const clean = <T extends { sourceRefs?: import('./curriculum').SourceReference[] }>(
    item: T,
  ): T =>
    item.sourceRefs
      ? {
          ...item,
          sourceRefs: item.sourceRefs.filter((ref) => !referenceIssues([ref], sources).length),
        }
      : item;
  return {
    ...unit,
    context,
    revision: currentApproval(unit) ? unit.revision + 1 : unit.revision,
    blueprint: {
      ...unit.blueprint,
      goals: unit.blueprint.goals.map(clean),
      demands: unit.blueprint.demands.map(clean),
      steps: unit.blueprint.steps.map(clean),
    },
    approvals: unit.approvals.map((approval) => ({
      ...approval,
      context: approval.context ?? structuredClone(unit.context),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function editBlueprint(unit: Unit, blueprint: Blueprint): Unit {
  if (JSON.stringify(unit.blueprint) === JSON.stringify(blueprint)) return unit;
  return {
    ...unit,
    blueprint,
    revision: currentApproval(unit) ? unit.revision + 1 : unit.revision,
    updatedAt: new Date().toISOString(),
  };
}

export function approveUnit(unit: Unit): Unit {
  const issues = [
    ...blueprintIssues(unit.blueprint),
    ...blueprintReferenceIssues(unit.blueprint, unit.context.curriculumSources ?? []),
  ];
  if (issues.length) throw new Error(issues[0]);
  if (currentApproval(unit)) return unit;
  const blueprint: Blueprint = {
    ...structuredClone(unit.blueprint),
    goals: unit.blueprint.goals.map((goal) => ({ ...goal, reviewStatus: 'approved' })),
    demands: unit.blueprint.demands.map((demand) => ({ ...demand, reviewStatus: 'approved' })),
    steps: unit.blueprint.steps.map((step) => ({ ...step, reviewStatus: 'approved' })),
  };
  const now = new Date().toISOString();
  return {
    ...unit,
    blueprint,
    approvals: [
      ...unit.approvals,
      {
        revision: unit.revision,
        approvedAt: now,
        blueprint: structuredClone(blueprint),
        context: structuredClone(unit.context),
      },
    ],
    updatedAt: now,
  };
}

export function createLesson(
  unit: Unit,
  stepIds: string[],
  content: LessonContent,
  origin: Lesson['origin'],
): Lesson {
  const approval = currentApproval(unit);
  if (!approval) throw new Error('Approve the current blueprint before planning a lesson.');
  const steps = approval.blueprint.steps.filter((step) => stepIds.includes(step.id));
  if (!steps.length || steps.length !== new Set(stepIds).size)
    throw new Error('Choose valid learning steps from the approved unit.');
  const now = new Date().toISOString();
  return {
    ...content,
    id: newId(),
    unitId: unit.id,
    unitRevision: approval.revision,
    stepIds: [...new Set(stepIds)],
    goalIds: [...new Set(steps.flatMap((step) => step.goalIds))],
    sessionMinutes: (approval.context ?? unit.context).sessionMinutes,
    origin,
    createdAt: now,
    updatedAt: now,
  };
}

export function lessonOutline(unit: Unit, steps: LearningStep[]): LessonContent {
  const minutes = unit.context.sessionMinutes;
  const first = Math.max(2, Math.floor(minutes * 0.15));
  const rehearsal = Math.max(3, Math.floor(minutes * 0.55));
  const evidence = Math.max(2, Math.floor(minutes * 0.15));
  const refs = [
    ...new Map(
      steps
        .flatMap((step) => step.sourceRefs ?? [])
        .map((ref) => [`${ref.documentId}:${ref.page}:${ref.quote}`, ref]),
    ).values(),
  ].slice(0, 12);
  function concise(values: string[]) {
    const combined = values.join('\n');
    return combined.length <= 2000
      ? combined
      : `${combined.slice(0, 1900)}\nSee the linked learning steps for the remaining detail.`;
  }
  return {
    title: steps
      .map((step) => step.title)
      .join(' & ')
      .slice(0, 160),
    purpose: concise(steps.map((step) => step.workshopTask)),
    languagePurpose: concise(steps.map((step) => step.languageFocus)),
    startingCheck:
      'Invite students to show or explain what they already understand about this task. Use their available languages, sketches, or talk to distinguish content understanding from English expression.',
    activities: [
      {
        id: newId(),
        title: 'Connect and notice',
        minutes: first,
        teacherMove:
          'Choose a short shared example from the unit. Invite observations before introducing language support.',
        studentMove:
          'Share what you notice and explain an idea using talk, drawing, gesture, or your available languages.',
      },
      {
        id: newId(),
        title: 'Rehearse and make meaning',
        minutes: rehearsal,
        teacherMove:
          'Offer a short model and invite different ways to express the intended meaning. Use the linked language focus to guide partner rehearsal.',
        studentMove:
          'Try out an explanation with a partner. Choose wording and examples that convey your own meaning.',
      },
      {
        id: newId(),
        title: 'Try the workshop connection',
        minutes: minutes - first - rehearsal - evidence,
        teacherMove:
          'Invite a related application from the workshop task. Keep useful supports available and observe what students choose independently.',
        studentMove:
          'Use the language with a new example from workshop. Keep ownership of the interpretation and wording.',
      },
      {
        id: newId(),
        title: 'Notice what changed',
        minutes: evidence,
        teacherMove:
          'Collect a short sample of language use and note the kind of prompting needed.',
        studentMove: 'Share one choice you made and what helped you express your idea.',
      },
    ],
    supportNotes:
      concise([...new Set(steps.flatMap((step) => step.supports))]) ||
      'Choose a temporary support based on observed need. Note what evidence would let you reduce it.',
    evidence: concise(steps.map((step) => step.evidence)),
    transfer: concise(steps.map((step) => step.transfer)),
    ...(refs.length ? { sourceRefs: refs } : {}),
  };
}

export type Insight = {
  id: string;
  kind: 'review' | 'notice';
  title: string;
  detail: string;
  action: string;
};
export function unitInsights(unit: Unit): Insight[] {
  const insights: Insight[] = [];
  for (const [index, issue] of blueprintIssues(unit.blueprint).entries()) {
    insights.push({
      id: `blueprint-${index}`,
      kind: 'review',
      title: 'Blueprint needs attention',
      detail: issue,
      action: 'Review the unit goals and learning sequence.',
    });
  }
  for (const goal of unit.blueprint.goals) {
    if (
      !unit.blueprint.steps.some((step) => step.goalIds.includes(goal.id) && step.evidence.trim())
    ) {
      insights.push({
        id: `evidence-${goal.id}`,
        kind: 'review',
        title: 'A goal needs planned evidence',
        detail: goal.text || 'An empty unit goal has no evidence.',
        action: 'Link this goal to a learning step and describe what you will observe.',
      });
    }
  }
  const order = new Map(unit.blueprint.steps.map((step, index) => [step.id, index]));
  for (const step of unit.blueprint.steps) {
    if (step.prerequisiteIds.some((id) => (order.get(id) ?? -1) >= (order.get(step.id) ?? 0))) {
      insights.push({
        id: `order-${step.id}`,
        kind: 'review',
        title: 'Preparation comes after the task',
        detail: `${step.title} depends on a step placed later in the sequence.`,
        action: 'Reorder the sequence or review the prerequisite link.',
      });
    }
  }
  for (const lesson of unit.lessons) {
    const minutes = lesson.activities.reduce((sum, activity) => sum + activity.minutes, 0);
    if (minutes > lesson.sessionMinutes)
      insights.push({
        id: `time-${lesson.id}`,
        kind: 'review',
        title: 'A lesson needs more time',
        detail: `${lesson.title} plans ${minutes} minutes in a ${lesson.sessionMinutes}-minute session.`,
        action: 'Shorten an activity or spread the learning across sessions.',
      });
    if (!lesson.languagePurpose.trim())
      insights.push({
        id: `purpose-${lesson.id}`,
        kind: 'review',
        title: 'Make the language purpose explicit',
        detail: lesson.title,
        action: 'Describe the language students will develop during this protected EAL session.',
      });
    if (lesson.unitRevision !== unit.revision)
      insights.push({
        id: `revision-${lesson.id}`,
        kind: 'review',
        title: 'A connected lesson may need review',
        detail: `${lesson.title} uses approved revision ${lesson.unitRevision}; the current blueprint is revision ${unit.revision}.`,
        action:
          'Compare its goals with the current blueprint. The saved lesson has not been changed.',
      });
  }
  if (!unit.lessons.length)
    insights.push({
      id: 'no-lessons',
      kind: 'notice',
      title: 'The journey is ready for lesson planning',
      detail:
        'Learning steps describe the progression. Scheduled lessons will show where it happens in practice.',
      action: currentApproval(unit)
        ? 'Choose one or more learning steps to plan the first lesson.'
        : 'Review and approve the blueprint, then plan a connected lesson.',
    });
  if (unit.blueprint.assumptions.length)
    insights.push({
      id: 'assumptions',
      kind: 'notice',
      title: 'Check the planning assumptions',
      detail: unit.blueprint.assumptions.join(' '),
      action: 'Confirm these against your curriculum and classroom context.',
    });
  return insights;
}
