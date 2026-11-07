# EAL Unit implementation plan

## Current state

As of 7 November 2026, EAL Unit has an independent application implementing the first planning workflow, versioned approvals, connected lessons, browser persistence, JSON backups, basic unit insights, and locally extracted curriculum PDFs with reviewed pages and checked source passages. A GitHub Pages build supports PDF sources and manual planning; live AI generation remains on the separate local server. See the README for setup and `architecture.md` for the current design and limits.

Scaffold App V.2.0 was inspected read-only. Its source contains a React/Vite/TypeScript frontend, an Express API, validated AI generation, and saved-lesson patterns. Its development-only unit-planning preview demonstrates a unit overview, language journey, lesson focus, and evidence-driven next steps using preset example lessons and local storage. These are reference patterns, not implemented EAL Unit features.

## Technical direction

React, Vite, and TypeScript provide the frontend. A small Express server runs independent AI endpoints and serves the app. The project does not duplicate the Scaffold workspace.

Versioned browser persistence, backup validation, and visible save failures are implemented. Revisit server persistence when cross-device use, accounts, or pilot requirements justify it.

Live AI generation requires an independent server endpoint with request and response validation. Scaffold's Express/Zod patterns are a useful reference. Configure credentials on the server and use separate EAL Unit services. A GitHub repository alone does not provide a running generation service.

Use explicit, labeled fixtures while building interactions. Do not present preset examples as live AI analysis. Do not carry over Scaffold account systems, production endpoints, databases, or deployment configuration by default.

## Stage 1: first complete workflow

Implementation status: the local workflow and independent generation endpoints are built. Deterministic checks and browser verification are recorded in `verification.md`. The first real curriculum/group pilot remains outstanding.

Deliver:

```text
Create unit from a short brief or pasted workshop overview
→ review and edit demands and paired blueprint
→ approve goals and learning steps
→ create one connected lesson
→ save and reopen
```

Build the editable workflow with labeled fixtures first, then connect independent live generation before calling the generation milestone complete. Keep required inputs short: curriculum or task, grade as available, a brief group description, and scheduling constraints.

Implement:

- Unit, source, goal, learning-step, lesson, and proposal schemas with stable IDs.
- Origin labels, assumptions, missing information, and explicit teacher review.
- An approved unit revision that the connected lesson references.
- Editable paired planning and lesson views with a clear primary action.
- Independent local persistence with a schema version and visible save failures.
- A simple backup/export and reopen path before using the prototype for real planning.
- Independent generation endpoints and validated structured output for the blueprint and connected lesson.

Acceptance criteria:

1. A teacher can create a unit from pasted workshop material or a short brief.
2. Teacher-entered context, extracted source facts, and proposed interpretations are distinguishable. Extraction never implies independent verification of the source.
3. Language demands and goals can be edited before lesson generation.
4. The teacher explicitly approves the unit sequence.
5. A lesson references the approved unit revision, goal IDs, and learning-step IDs.
6. Learning steps and lessons support a many-to-many relationship.
7. Saving and reopening preserves edits, links, origin labels, and approvals.
8. Missing assessment information does not prevent planning or produce fabricated alignments.
9. The complete path works with an anonymized group and no identifiable student data.
10. Fixtures and live generation are clearly distinguished; generation failures leave teacher work intact.

Verification should cover the connected workflow, persisted relationships, approval gates, and failure recovery. Review at least one example blueprint and lesson for curricular fit and instructional usefulness.

## Stage 2: unit insight and controlled editing

Implementation status: basic coverage, prerequisite, timing, explicit-language-purpose, and changed-revision checks are included in the prototype. Targeted AI regeneration and reflection-driven revision proposals remain outstanding.

Implement:

- Section-level lesson regeneration as a reviewable proposal.
- Checks for goals without evidence, lessons without linked goals, missing language purpose, and activity timing exceeding the session.
- Prerequisite link validation, including invalid references and cycles.
- Review notices for lessons affected by changed unit goals or learning steps.
- A compact reflection recording what students demonstrated and what remains difficult.
- Revision proposals showing the observation, suggested change, reason, and affected future lessons, with accept, edit, and reject actions.

Acceptance criteria:

1. Regenerating an activity leaves unrelated sections and approved content intact until the teacher accepts a change.
2. A goal without planned evidence and a lesson timing overrun produce explainable flags.
3. A unit change identifies potentially affected lessons without rewriting them.
4. Reflection creates a separate proposal; accepting it applies only the reviewed change.
5. Rejected proposals do not alter approved plans.
6. Readiness and progression suggestions state their evidence and uncertainty rather than appearing as measured student outcomes.

Test deterministic checks and revision behavior. Evaluate interpretive suggestions through reviewed examples, including insufficient evidence and students ready for reduced support.

## Stage 3: pilot and practical refinements

- Select one real workshop unit and one anonymized EAL group.
- Confirm session timing, curriculum source permissions and review status, and school requirements for external AI processing.
- Review the full sequence against actual workshop tasks and collect teacher feedback.
- Refine the unit view, language goals, supports, transfer opportunities, and next-step suggestions based on use.
- Add printing or other exports according to actual needs.
- Choose hosting, accounts, and server persistence only when the pilot requires them.

Pilot evaluation should distinguish instructional usefulness from interface polish and generation speed. Document gaps and limitations rather than claiming learning impact from the prototype.

## Deferred scope

- Assessment-platform integrations and automatic WIDA score interpretation.
- Longitudinal student analytics and school dashboards.
- Autonomous scheduling and automatic changes to approved plans.
- Student-facing tutoring.
- Multi-agent architectures.
- Large-scale document ingestion.
- Deep integrations with Scaffold or shared production services.

## Source-project boundary

All implementation, commits, and deployments belong to EAL Unit. Reading Scaffold for reference does not authorize changing it. Selected patterns can be adapted into this repository without creating a dependency on the source checkout.
