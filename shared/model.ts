import { z } from 'zod';
import {
  curriculumSourceSchema,
  MAX_CURRICULUM_SOURCES,
  MAX_SOURCE_TEXT,
  sourceCharacterCount,
  sourceReferenceSchema,
} from './curriculum';

const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/);
const text = z.string().max(2000);
export const originSchema = z.enum([
  'teacher_entered',
  'source_extracted',
  'ai_proposed',
  'example',
  'outline',
]);
export const reviewSchema = z.enum(['unreviewed', 'approved', 'edited']);

export const contextSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    grade: z.string().max(40),
    strand: z.enum(['Reading', 'Writing']),
    durationWeeks: z.number().int().min(1).max(12),
    sessionMinutes: z.number().int().min(10).max(120),
    curriculum: z.string().trim().max(12000),
    groupContext: z.string().max(2000),
    curriculumSources: z.array(curriculumSourceSchema).max(MAX_CURRICULUM_SOURCES).optional(),
  })
  .superRefine((context, ctx) => {
    const sources = context.curriculumSources ?? [];
    if (context.curriculum.length < 30 && sourceCharacterCount(sources) < 30)
      ctx.addIssue({
        code: 'custom',
        path: ['curriculum'],
        message: 'Add a short workshop overview or review the relevant PDF pages.',
      });
    if (sourceCharacterCount(sources) > MAX_SOURCE_TEXT)
      ctx.addIssue({
        code: 'custom',
        path: ['curriculumSources'],
        message: 'Choose no more than 40,000 characters across your PDF sources.',
      });
    if (new Set(sources.map((source) => source.id)).size !== sources.length)
      ctx.addIssue({
        code: 'custom',
        path: ['curriculumSources'],
        message: 'Use each PDF source only once in this unit.',
      });
  });

export const goalSchema = z.object({
  id,
  kind: z.enum(['content', 'language']),
  text,
  origin: originSchema,
  reviewStatus: reviewSchema,
  sourceRefs: z.array(sourceReferenceSchema).max(6).optional(),
});
export const demandSchema = z.object({
  id,
  text,
  domain: z.enum(['Understanding', 'Expression', 'Interaction']),
  priority: z.enum(['Teach explicitly', 'Support participation', 'Later']),
  origin: originSchema,
  reviewStatus: reviewSchema,
  sourceRefs: z.array(sourceReferenceSchema).max(6).optional(),
});
export const stepSchema = z.object({
  id,
  title: z.string().max(160),
  workshopTask: text,
  languageFocus: text,
  goalIds: z.array(id).max(12),
  prerequisiteIds: z.array(id).max(12),
  evidence: text,
  transfer: text,
  supports: z.array(z.string().max(400)).max(8),
  origin: originSchema,
  reviewStatus: reviewSchema,
  sourceRefs: z.array(sourceReferenceSchema).max(6).optional(),
});
export const blueprintSchema = z.object({
  summary: text,
  goals: z.array(goalSchema).min(2).max(12),
  demands: z.array(demandSchema).max(12),
  steps: z.array(stepSchema).min(1).max(12),
  assumptions: z.array(z.string().max(500)).max(10),
  questions: z.array(z.string().max(500)).max(10),
});
export const activitySchema = z.object({
  id,
  title: z.string().max(160),
  minutes: z.number().int().min(1).max(120),
  teacherMove: text,
  studentMove: text,
});
export const lessonContentSchema = z.object({
  title: z.string().min(1).max(160),
  purpose: text,
  languagePurpose: text,
  startingCheck: text,
  activities: z.array(activitySchema).min(1).max(10),
  supportNotes: text,
  evidence: text,
  transfer: text,
  sourceRefs: z.array(sourceReferenceSchema).max(12).optional(),
});
export const lessonSchema = lessonContentSchema.extend({
  id,
  unitId: id,
  unitRevision: z.number().int().min(1),
  goalIds: z.array(id).min(1).max(12),
  stepIds: z.array(id).min(1).max(12),
  sessionMinutes: z.number().int().min(10).max(120),
  origin: originSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export const approvalSchema = z.object({
  revision: z.number().int().min(1),
  approvedAt: z.iso.datetime(),
  blueprint: blueprintSchema,
  context: contextSchema.optional(),
});
export const unitSchema = z.object({
  id,
  context: contextSchema,
  mode: z.enum(['example', 'outline', 'ai']),
  revision: z.number().int().min(1),
  blueprint: blueprintSchema,
  approvals: z.array(approvalSchema).max(100),
  lessons: z.array(lessonSchema).max(80),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Context = z.infer<typeof contextSchema>;
export type Origin = z.infer<typeof originSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type LearningStep = z.infer<typeof stepSchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type LessonContent = z.infer<typeof lessonContentSchema>;
export type Unit = z.infer<typeof unitSchema>;

export const originLabel: Record<Origin, string> = {
  teacher_entered: 'Teacher entered',
  source_extracted: 'From source · unverified',
  ai_proposed: 'AI suggestion',
  example: 'Example content',
  outline: 'Editable outline',
};
