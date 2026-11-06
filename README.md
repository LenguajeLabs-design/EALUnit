# EAL Unit

EAL Unit helps teachers turn homeroom curriculum into coherent language learning units, connected lessons, and adaptable supports, with classroom evidence and teacher judgment guiding next steps.

## What it is for

Homeroom workshop establishes what students are learning as readers and writers. EAL Unit helps teachers identify the language those tasks require and plan a complementary sequence for protected EAL instruction.

The planning journey is:

```text
Workshop curriculum
→ review content and language demands
→ plan a complementary EAL unit
→ develop connected lessons
→ collect evidence of participation and language development
→ review next steps and transfer back to workshop
```

A unit holds the shared goals and learning sequence. Learning steps describe capabilities to develop; lessons are scheduled teaching sessions. A learning step may span several lessons, and a lesson may address several learning steps.

## Status

The first local prototype is implemented. It supports:

1. Creating a unit from a short brief or pasted curriculum.
2. Reviewing and editing a paired workshop/EAL blueprint.
3. Editing goals, language demands, learning steps, prerequisites, evidence, and workshop transfer.
4. Approving a versioned blueprint and creating lessons linked to its goals and learning steps.
5. Saving and reopening units and lessons in the browser.
6. Exporting and restoring JSON backups, and printing a connected lesson.
7. Checking goal coverage, prerequisite order, timing, missing language purposes, and lessons affected by unit changes.

AI drafting uses an independent server endpoint. A labeled example and manual blueprint/lesson outlines also work without AI. Generated content always needs teacher review.

This is a personal, local prototype. Accounts, cloud sync, public deployment, targeted AI regeneration, and reflection-driven revision proposals are not implemented yet.

## Run locally

Requires Node.js 22.12 or newer and npm.

```bash
npm ci
npm run dev
```

Open [EAL Unit locally](http://127.0.0.1:4173).

For AI drafting, create a local `.env` from `.env.example` and set `OPENAI_API_KEY`. An existing server environment variable also works. `OPENAI_MODEL` defaults to `gpt-5-mini` and can be configured independently. Credentials stay on the server; never put them in `VITE_` variables or commit `.env`.

The app binds to loopback only. Add authentication and an appropriate data policy before enabling shared hosting.

## Check and build

```bash
npm run check
npm run build
npm start
```

`check` runs deterministic planning, backup, and API tests, TypeScript checks, and a production frontend build. `start` serves the built app and the local generation API. GitHub Actions runs the same checks on pushes and pull requests; it does not deploy the app.

## Where plans are saved

Plans use the browser storage key `eal-unit-library-v1`. Export a JSON backup before clearing browser data or moving devices. Restore validates the backup and adds units whose IDs are not already present; existing teacher work is preserved.

GitHub backs up the application source, not the plans saved in your browser. AI drafting sends the relevant workshop and group context to OpenAI only when requested. Source material is kept separate from generated interpretations, and official WIDA alignment is not claimed.

## Planning commitments

- Keep the intellectual goal ambitious while adjusting language supports.
- Give protected EAL lessons an explicit language development purpose.
- Distinguish teacher input, source material, AI suggestions, and approved decisions.
- Use classroom evidence alongside assessment information; a score is not a complete learner profile.
- Keep approved plans intact when proposing revisions.
- Support anonymized group planning without requiring identifiable student information.
- Make missing information visible. Never invent curriculum standards, WIDA codes, or verified alignments.

## Relationship to Scaffold

EAL Unit is an independent project. Scaffold App V.2.0 is a read-only reference for useful design patterns and instructional principles, including its development-only unit-planning preview.

EAL Unit uses its own storage and configuration. Work in this repository must not modify Scaffold or use its production services.

## Project documents

- [Product brief](docs/product-brief.md)
- [Implementation plan](docs/implementation-plan.md)
- [Architecture and data handling](docs/architecture.md)
- [Verification and remaining limits](docs/verification.md)
- [Contributor and agent instructions](AGENTS.md)
