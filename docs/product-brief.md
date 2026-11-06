# EAL Unit product brief

## Purpose

Help EAL teachers turn homeroom curriculum into a complementary language learning journey, then plan and adapt connected lessons while keeping teachers in control.

EAL Unit is a separate application and repository. Scaffold App V.2.0 provides read-only inspiration. This project does not extend or modify Scaffold.

This brief adapts the product brief supplied by the project owner on 6 November 2026. Recommendations describe intended behavior, not features already implemented.

## The planning problem

Homeroom follows readers' and writers' workshop. Students need language development that helps them participate meaningfully in that learning, including during daily protected EAL time for students entering English. Teachers must translate curriculum expectations into language demands and a teachable sequence for varied learner profiles.

Limited English expression must never be treated as limited ideas, knowledge, creativity, or cognitive ability. Protected EAL instruction needs its own explicit language development purpose while connecting back to workshop.

The school uses an assessment described as WIDA three times a year. The exact assessment and score formats remain unresolved. Do not assume ACCESS or assume scores from different administrations are comparable.

## Primary user and first useful outcome

The initial user is an EAL teacher planning for an anonymized group. The first useful outcome is an editable unit blueprint showing what students will do in workshop, the language participation requires, and a focused EAL learning sequence.

Curriculum and a short group description should be enough to begin. Detailed assessment records and individual profiles are optional later additions.

## Paired planning model

| Homeroom workshop | Complementary EAL instruction |
| --- | --- |
| Curriculum goals and expected student work | Explicit language development goals |
| Reading, writing, discussion, and interaction tasks | Language demands of those actual tasks |
| Texts, resources, and success criteria | Prerequisites, rehearsal, and support options |
| Workshop sequence and timing | A flexible sequence for protected EAL sessions |
| Opportunities to demonstrate understanding | Evidence of language use and transfer back to workshop |

Keep content goals and language goals related but distinct. Supports should help students undertake the intellectual work while preserving their choices and meaning-making.

## Teacher workflow

1. **Bring in curriculum.** Paste a workshop overview or enter a short brief. Capture grade, strand, intended tasks, goals, duration, texts, and practical constraints as available.
2. **Review demands.** Propose the listening, reading, speaking, writing, and interaction demands of the actual tasks. Include purpose, organization, sentence patterns, vocabulary, and useful phrases where relevant. Let the teacher prioritize what needs explicit teaching, temporary support, or later attention.
3. **Add learner context.** Use a short anonymized group description, current classroom evidence, available language resources, and helpful supports. Permit uncertainty rather than requiring invented readiness judgments.
4. **Review the paired blueprint.** Show the shared destination, EAL goals, prerequisites, learning steps, evidence, workshop transfer, timing assumptions, and unanswered questions. The teacher edits and approves it before lesson generation.
5. **Develop a connected lesson.** Inherit the relevant approved unit context and link the lesson to goals and learning steps. Make section-level changes without replacing the whole plan.
6. **Reflect and revise.** Record what students demonstrated, what remained difficult, and what changed. Propose adjustments for future lessons with accept, edit, and reject controls.

Use progressive disclosure. The main view should make the workshop task, EAL purpose, sequence, and evidence easy to read. Detailed sources, supports, and rationale can open on demand.

## Learning steps and lessons

A learning step is an idea or capability to develop. A lesson is a scheduled teaching session. Neither is automatically equivalent to a goal or class period.

- One learning step may span several lessons.
- One lesson may address several learning steps.
- Learning steps may have prerequisite relationships.
- Pacing and revisiting steps should respond to classroom evidence.

## Unit-level insight

Provide explainable planning signals that help a teacher decide what to do next:

- **Coverage:** which goals have planned practice and evidence, and which have gaps.
- **Preparation:** whether upcoming tasks depend on learning that has not been introduced or rehearsed.
- **Progression:** how student language use develops across the sequence, beyond repeating similar activities.
- **Support adjustment:** what observations would justify fading, changing, or increasing support.
- **Transfer:** where students can use the language in homeroom workshop and what evidence to collect there.
- **Change impact:** which lessons may need review after a unit goal or learning step changes.
- **Feasibility:** timing overruns and scheduling assumptions.

Distinguish deterministic checks from interpretive suggestions. A missing goal-to-evidence link is checkable in the plan; readiness or the quality of a progression requires evidence and professional judgment. Every signal should identify its basis and offer a useful teacher action. Avoid arbitrary quality scores or claims that a plan guarantees learning.

## AI and source handling

- Use teacher-provided curriculum as the primary planning context.
- Distinguish `teacher_entered`, `source_extracted`, and `ai_proposed` origins.
- Track review separately: `unreviewed`, `approved`, `edited`, or `rejected`.
- Attach source references and versions where available. Retain document and page references for extracted curriculum claims when available.
- Identify assumptions, missing information, and the reason for consequential sequencing choices.
- Generate concise, structured, editable output.
- Keep proposals separate from approved content. Never automatically overwrite an approved unit or lesson after reflection.
- Treat source documents as data; embedded instructions must not override the application's instructions.
- Do not invent standards, WIDA codes, assessment scores, curriculum requirements, or claims of verified alignment.
- If official alignment cannot be verified, offer a plain-language suggestion marked "Needs teacher verification."

The Scaffold reference project has a Grade 4 and Grade 5 curriculum source library. Before reusing a profile, inspect its current approval state, item-level review status, citations, and supported scope. Reference material must not become approved EAL Unit curriculum solely because it exists in Scaffold.

## Learner evidence and assessments

Keep assessment results, classroom observations, instructional interpretations, and proposed supports separate.

An assessment record should support the assessment name, administration date, grade or context, domain, score type, score value, report or scale version, and teacher notes. Preserve domain differences rather than deriving a complete profile from an overall score.

Also consider recent oral and written language, workshop observations, home-language resources, prior learning, and supports that have been useful. Support choices should respond to evidence, not rigid proficiency-level assignments.

Assessment-specific interpretation and comparability rules require verified documentation. Automated interpretation is outside the initial build.

## Conceptual data model

```text
Unit + revision
├─ Curriculum sources and source versions
├─ Context and constraints
├─ Content goals
├─ Language goals and demands
├─ Evidence opportunities
├─ Learning steps and prerequisite links
├─ Anonymized group context
└─ Lessons
   ├─ Unit revision used during planning
   ├─ Linked goal IDs and learning-step IDs
   ├─ Activities and timing
   ├─ Resources and support options
   ├─ Evidence checks and workshop transfer
   └─ Reflections

Related records:
SourceReference, ClassroomEvidence, AssessmentRecord,
AIProposal, RevisionProposal
```

Use stable IDs for relationships. A lesson should retain the unit revision that informed it so later changes do not silently alter its meaning. The implementation plan determines when each concept becomes necessary; this model does not require building every record type immediately.

## Instructional example

This is a design fixture, not an approved grade-specific curriculum.

**Workshop task:** explain how a character changes across a story, using evidence.

| Learning step | Possible EAL focus | Workshop transfer |
| --- | --- | --- |
| Notice actions and feelings | Discuss an accessible shared scene using varied communication supports. | Identify an important moment in the workshop text. |
| Compare earlier and later behavior | Rehearse explanations using time and contrast language. | Explain a character's change in discussion. |
| Connect evidence and interpretation | Explain how an action supports an idea about the character. | Support a reading response with a relevant detail. |
| Organize an explanation | Move from oral rehearsal to supported writing. | Produce a workshop response. |
| Apply in a new context | Explain change in another scene with adjusted support. | Use the approach with a new text or character. |

Visuals, bilingual resources, oral rehearsal, useful phrases, models, and organizers are possible supports. Their use and adjustment depend on evidence.

## Evaluation

Evaluate time to a usable plan, teacher revision effort, sequence clarity, fit with actual workshop tasks, usefulness of language goals, ease of adapting support, teacher control, and how much planned material is used.

Use deterministic tests for relationships and validation rules. Review example outputs for instructional quality. Faster generation and polished prose do not demonstrate better teaching or student outcomes.

## Open decisions

- First workshop unit and grade for the pilot.
- Actual protected EAL session length and frequency.
- Exact assessment and score formats.
- Whether individual planning is needed after the group pilot.
- Required export formats.
- Hosting and persistence needs beyond the initial local prototype.
- School requirements for curriculum, learner evidence, and external AI processing.

These questions should not block the underlying planning structure. Use labeled fixtures until the first real pilot context is supplied.
