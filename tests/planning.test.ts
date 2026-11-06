import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankBlueprint, exampleBlueprint, exampleContext } from '../shared/example';
import {
  approveUnit,
  blueprintIssues,
  createLesson,
  createUnit,
  currentApproval,
  editBlueprint,
  lessonOutline,
  unitInsights,
} from '../shared/planning';
import {
  STORAGE_KEY,
  mergeBackup,
  parseBackup,
  readLibrary,
  serializeLibrary,
  writeLibrary,
} from '../shared/storage';
import { lessonContentSchema } from '../shared/model';

function unit() {
  return createUnit(structuredClone(exampleContext), exampleBlueprint(), 'example');
}
function connected() {
  const approved = approveUnit(unit());
  const lesson = createLesson(
    approved,
    ['step-1', 'step-2'],
    lessonOutline(approved, approved.blueprint.steps.slice(0, 2)),
    'outline',
  );
  return { ...approved, lessons: [lesson] };
}

test('a connected lesson requires explicit approval of the current blueprint', () => {
  const draft = unit();
  assert.equal(currentApproval(draft), undefined);
  assert.throws(
    () =>
      createLesson(draft, ['step-1'], lessonOutline(draft, [draft.blueprint.steps[0]]), 'outline'),
    /Approve/,
  );
  assert.throws(() => approveUnit(createUnit(exampleContext, blankBlueprint(), 'outline')), /goal/);
  assert.equal(currentApproval(approveUnit(draft))?.revision, 1);
});

test('learning steps and scheduled lessons support many-to-many links', () => {
  const approved = approveUnit(unit());
  const first = createLesson(
    approved,
    ['step-1', 'step-2'],
    lessonOutline(approved, approved.blueprint.steps.slice(0, 2)),
    'outline',
  );
  const second = createLesson(
    approved,
    ['step-2'],
    lessonOutline(approved, [approved.blueprint.steps[1]]),
    'outline',
  );
  assert.deepEqual(first.stepIds, ['step-1', 'step-2']);
  assert.deepEqual(first.goalIds, ['content-1', 'language-1']);
  assert.ok(second.stepIds.includes('step-2'));
  assert.throws(
    () => createLesson(approved, ['missing'], lessonOutline(approved, []), 'outline'),
    /valid learning steps/,
  );
});

test('editing an approved unit creates one draft revision and preserves earlier approvals and lessons', () => {
  const original = connected();
  const savedLesson = structuredClone(original.lessons[0]);
  const changed = structuredClone(original.blueprint);
  changed.goals[0].text = 'A revised teacher goal.';
  const revision2 = editBlueprint(original, changed);
  assert.equal(revision2.revision, 2);
  assert.equal(currentApproval(revision2), undefined);
  assert.equal(original.approvals[0].blueprint.goals[0].text, exampleBlueprint().goals[0].text);
  assert.deepEqual(revision2.lessons[0], savedLesson);
  const changedAgain = structuredClone(revision2.blueprint);
  changedAgain.summary = 'Another change in the same draft.';
  assert.equal(editBlueprint(revision2, changedAgain).revision, 2);
  const approved2 = approveUnit(revision2);
  assert.equal(approved2.approvals.length, 2);
  assert.deepEqual(parseBackup(serializeLibrary([approved2]))[0].lessons[0], savedLesson);
  assert.ok(unitInsights(approved2).some((insight) => insight.id === `revision-${savedLesson.id}`));
});

test('approval snapshots cannot be changed through a mutable draft reference', () => {
  const approved = approveUnit(unit());
  const original = approved.approvals[0].blueprint.goals[0].text;
  approved.blueprint.goals[0].text = 'An accidental mutation';
  assert.equal(approved.approvals[0].blueprint.goals[0].text, original);
  assert.throws(() => serializeLibrary([approved]), /differs/);
});

test('blueprint checks identify broken links, duplicate IDs, and prerequisite cycles', () => {
  const blueprint = exampleBlueprint();
  blueprint.steps[0].prerequisiteIds = ['step-2'];
  blueprint.steps[1].goalIds.push('missing-goal');
  blueprint.goals[1].id = blueprint.goals[0].id;
  const issues = blueprintIssues(blueprint);
  assert.ok(issues.some((issue) => issue.includes('unique')));
  assert.ok(issues.some((issue) => issue.includes('no longer exists')));
  assert.ok(issues.some((issue) => issue.includes('cycle')));
  assert.throws(() => approveUnit(createUnit(exampleContext, blueprint, 'example')));
});

test('unit insights identify absent evidence and preparation placed after its use', () => {
  const draft = unit();
  draft.blueprint.goals.push({
    id: 'uncovered',
    text: 'Explain a language choice.',
    kind: 'language',
    origin: 'teacher_entered',
    reviewStatus: 'edited',
  });
  [draft.blueprint.steps[0], draft.blueprint.steps[1]] = [
    draft.blueprint.steps[1],
    draft.blueprint.steps[0],
  ];
  const insights = unitInsights(draft);
  assert.ok(insights.some((insight) => insight.id === 'evidence-uncovered'));
  assert.ok(insights.some((insight) => insight.id === 'order-step-2'));
});

test('lesson timing and language purpose produce explainable checks', () => {
  const current = connected();
  current.lessons[0].activities[0].minutes = 80;
  current.lessons[0].languagePurpose = '';
  assert.ok(unitInsights(current).some((insight) => insight.title === 'A lesson needs more time'));
  assert.ok(
    unitInsights(current).some((insight) => insight.title === 'Make the language purpose explicit'),
  );
  const short = { ...current, context: { ...current.context, sessionMinutes: 10 } };
  assert.equal(
    lessonOutline(short, [short.blueprint.steps[0]]).activities.reduce(
      (sum, activity) => sum + activity.minutes,
      0,
    ),
    10,
  );
});

test('backup round trips preserve sources, goals, revision history, and lesson relationships', () => {
  const saved = connected();
  const store = new Map<string, string>();
  const adapter = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
  writeLibrary(adapter, [saved]);
  assert.deepEqual(readLibrary(adapter), { units: [saved], error: null });
  assert.ok(store.has(STORAGE_KEY));
});

test('corrupt or inaccessible storage is reported without overwriting the original', () => {
  let writes = 0;
  const store = {
    getItem: () => '{unreadable',
    setItem: () => {
      writes++;
    },
  };
  assert.ok(readLibrary(store).error);
  assert.equal(writes, 0);
  assert.throws(
    () =>
      writeLibrary(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error('quota');
          },
        },
        [unit()],
      ),
    /quota/,
  );
});

test('restore rejects unsupported versions, duplicate units, and orphan lesson links', () => {
  const saved = connected();
  assert.throws(() =>
    parseBackup(
      JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString(), units: [] }),
    ),
  );
  assert.throws(() => serializeLibrary([saved, saved]), /duplicate unit IDs/);
  saved.lessons[0].goalIds = ['missing-goal'];
  assert.throws(() => serializeLibrary([saved]), /broken goal/);
});

test('restoring adds missing units without replacing existing teacher work', () => {
  const existing = connected();
  const earlierCopy = structuredClone(existing);
  earlierCopy.context.title = 'Older title';
  const another = unit();
  const result = mergeBackup([existing], [earlierCopy, another]);
  assert.equal(result.length, 2);
  assert.equal(result[0].context.title, existing.context.title);
});

test('long selected steps produce an editable outline without losing the links or failing the contract', () => {
  const current = unit();
  current.blueprint.steps[0].workshopTask = 'A'.repeat(1900);
  current.blueprint.steps[1].workshopTask = 'B'.repeat(1900);
  const approved = approveUnit(current);
  const content = lessonContentSchema.parse(
    lessonOutline(approved, approved.blueprint.steps.slice(0, 2)),
  );
  assert.ok(content.purpose.includes('See the linked learning steps'));
  const lesson = createLesson(approved, ['step-1', 'step-2'], content, 'outline');
  assert.deepEqual(lesson.stepIds, ['step-1', 'step-2']);
});

test('duplicate and broken links in draft backups are rejected without requiring approval', () => {
  const draft = unit();
  draft.blueprint.goals[1].id = draft.blueprint.goals[0].id;
  assert.throws(() => serializeLibrary([draft]), /duplicate IDs/);
  const broken = unit();
  broken.blueprint.steps[0].goalIds = ['missing'];
  assert.throws(() => serializeLibrary([broken]), /broken goal/);
});
