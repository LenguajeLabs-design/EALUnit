# EAL Unit architecture

## Application

- React and TypeScript provide the teacher interface.
- Vite handles development and the production frontend build.
- One Express server serves the Vite development middleware or the built frontend alongside the API. The default address is `http://127.0.0.1:4173`.
- Shared Zod schemas validate context, blueprints, lesson content, revisions, and backups.
- Browser persistence and JSON backup avoid an account or database requirement in this prototype.

The repository has no build dependency, API connection, database connection, or deployment connection to Scaffold.

## Source structure

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Unit library, hash navigation, local save state, backup and restore |
| `src/components/` | Unit setup, blueprint editors, learning journey, lesson editing, insights |
| `shared/model.ts` | Runtime schemas and TypeScript types |
| `shared/planning.ts` | Approval, revision, lesson-linking, and deterministic insight rules |
| `shared/storage.ts` | Versioned serialization, validation, and non-overwriting restore |
| `shared/example.ts` | Labeled illustrative curriculum and a blank blueprint |
| `server/app.ts` | Validated local endpoints, request limits, and safe errors |
| `server/generation.ts` | Independent AI instructions and structured generation |
| `tests/` | Deterministic behavior and API contract checks |

## Approval and relationships

Each unit has a draft blueprint and immutable approved snapshots. Approving the draft records its revision and approval time. Editing an approved blueprint creates a new draft revision; further edits remain in that draft until approval.

A lesson records the exact approved revision it used, plus stable goal and learning-step IDs. Multiple lessons may refer to the same learning step, and a lesson may refer to several steps. A later unit change produces a review notice rather than rewriting the lesson or its original goals.

Backups retain draft content, approved snapshots, lessons, provenance, and relationships. Import validation rejects orphaned lesson links, invalid approved blueprints, duplicate IDs, and unsupported schema versions.

## Generation

The endpoints are:

- `GET /api/config`: whether server-side drafting is configured; no credentials are returned.
- `POST /api/blueprint`: context to a structured blueprint proposal.
- `POST /api/lesson`: an approved unit and selected learning steps to a structured lesson proposal.

Generation uses the OpenAI Responses API with [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) and server-side response validation. The server defaults to `gpt-5-mini`; `OPENAI_MODEL` can override it. Requests use `store: false`, a timeout, a token limit, and no automatic retries.

All generated goals, demands, and steps are marked as unreviewed AI proposals. User source text is supplied separately as JSON data. Instructions prohibit fabricated standards, scores, story details, and verified alignments. These prompt rules support review; they do not establish factual or instructional correctness by themselves.

The manual starting point is an empty blueprint, not simulated analysis. A lesson outline is explicitly labeled and carries approved purposes, evidence, and transfer into a generic structure for teacher adaptation.

## Storage and data handling

- Plans are saved in local storage under `eal-unit-library-v1`.
- The app reports failed saves and allows exporting the working in-memory library.
- Unreadable stored data is kept until the teacher explicitly starts a new library or restores a backup. Original data can be downloaded for recovery.
- Restore merges missing unit IDs; it does not overwrite existing units with older copies.
- Backups are limited to 5 MB. This prototype supports up to 50 units, 12 learning steps per blueprint, and 80 lessons per unit.
- Relevant curriculum and group notes are sent to OpenAI when the teacher chooses AI drafting. The local server does not log planning request bodies or keep a server-side library.
- The frontend bundle contains no API credentials. `.env` is ignored by Git.
- No analytics or assessment integrations are included.

GitHub backups contain code and documentation, not browser-saved teaching plans. Teachers should use anonymized group descriptions and keep exported plans in their normal teaching-document storage.

## Local access boundary

The server binds only to `127.0.0.1`, `localhost`, or `::1`. It checks the origin of planning requests, requires JSON, limits request size and frequency, and returns generic provider errors. It has no authentication and is not configured for public hosting. Shared deployment needs an explicit authentication, usage, and persistence design.

## Current limits

Unit insights check relationships in a plan. They do not assess student proficiency, certify readiness, or demonstrate learning impact. Full curriculum extraction with page-level citations, section-level AI alternatives, reflection-driven revision proposals, cloud sync, and assessment interpretation remain future work.
