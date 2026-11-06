import { z } from 'zod';
import { unitSchema, type Unit } from './model';
import { blueprintIssues } from './planning';

export const STORAGE_KEY = 'eal-unit-library-v1';
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const librarySchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.iso.datetime(),
  units: z.array(unitSchema).max(50),
});
export type Library = z.infer<typeof librarySchema>;
type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function validateLibrary(value: unknown): Library {
  const library = librarySchema.parse(value);
  if (new Set(library.units.map((unit) => unit.id)).size !== library.units.length)
    throw new Error('This backup contains duplicate unit IDs.');
  for (const unit of library.units) {
    const goals = new Set(unit.blueprint.goals.map((goal) => goal.id));
    const steps = new Set(unit.blueprint.steps.map((step) => step.id));
    if (
      goals.size !== unit.blueprint.goals.length ||
      steps.size !== unit.blueprint.steps.length ||
      new Set(unit.blueprint.demands.map((demand) => demand.id)).size !==
        unit.blueprint.demands.length
    )
      throw new Error('A draft blueprint contains duplicate IDs.');
    if (
      unit.blueprint.steps.some(
        (step) =>
          step.goalIds.some((id) => !goals.has(id)) ||
          step.prerequisiteIds.some((id) => !steps.has(id)),
      )
    )
      throw new Error('A draft blueprint contains broken goal or prerequisite links.');
    const revisions = new Set(unit.approvals.map((approval) => approval.revision));
    if (
      revisions.size !== unit.approvals.length ||
      unit.approvals.some((approval) => approval.revision > unit.revision)
    )
      throw new Error('A unit has invalid approval revisions.');
    if (new Set(unit.lessons.map((lesson) => lesson.id)).size !== unit.lessons.length)
      throw new Error('A unit has duplicate lesson IDs.');
    for (const approval of unit.approvals) {
      if (blueprintIssues(approval.blueprint).length)
        throw new Error(
          'An approved blueprint contains invalid relationships or incomplete planning fields.',
        );
      if (
        approval.revision === unit.revision &&
        JSON.stringify(approval.blueprint) !== JSON.stringify(unit.blueprint)
      )
        throw new Error('An approved revision differs from the current blueprint.');
    }
    for (const lesson of unit.lessons) {
      const approval = unit.approvals.find((approval) => approval.revision === lesson.unitRevision);
      if (!approval || lesson.unitId !== unit.id)
        throw new Error('A lesson is missing its approved unit revision.');
      if (
        lesson.goalIds.some((id) => !approval.blueprint.goals.some((goal) => goal.id === id)) ||
        lesson.stepIds.some((id) => !approval.blueprint.steps.some((step) => step.id === id))
      )
        throw new Error('A lesson contains a broken goal or learning-step link.');
      if (
        new Set(lesson.activities.map((activity) => activity.id)).size !== lesson.activities.length
      )
        throw new Error('A lesson has duplicate activity IDs.');
    }
  }
  return library;
}

export function serializeLibrary(units: Unit[]): string {
  return JSON.stringify(
    validateLibrary({ schemaVersion: 1, exportedAt: new Date().toISOString(), units }),
    null,
    2,
  );
}

export function parseBackup(raw: string): Unit[] {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES)
    throw new Error('Choose an EAL Unit backup smaller than 5 MB.');
  return validateLibrary(JSON.parse(raw)).units;
}

export function readLibrary(store: Store): { units: Unit[]; error: string | null } {
  try {
    const raw = store.getItem(STORAGE_KEY);
    return { units: raw ? parseBackup(raw) : [], error: null };
  } catch {
    return {
      units: [],
      error:
        'The saved library could not be opened. Existing data has been kept. Restore a backup or explicitly start a new library.',
    };
  }
}

export function writeLibrary(store: Store, units: Unit[]): void {
  const raw = serializeLibrary(units);
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES)
    throw new Error(
      'Your library is too large for this prototype. Export a backup and remove unused units.',
    );
  store.setItem(STORAGE_KEY, raw);
}

export function mergeBackup(existing: Unit[], incoming: Unit[]): Unit[] {
  // Keep existing work intact. A restored unit with an existing ID is skipped.
  const existingIds = new Set(existing.map((unit) => unit.id));
  const merged = [...existing, ...incoming.filter((unit) => !existingIds.has(unit.id))];
  validateLibrary({ schemaVersion: 1, exportedAt: new Date().toISOString(), units: merged });
  return merged;
}
