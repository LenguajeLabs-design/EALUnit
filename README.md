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

1. Creating a unit from a short brief, pasted curriculum, or reviewed curriculum PDF pages.
2. Reviewing and editing a paired workshop/EAL blueprint.
3. Editing goals, language demands, learning steps, prerequisites, evidence, and workshop transfer.
4. Approving a versioned blueprint and creating lessons linked to its goals and learning steps.
5. Saving and reopening units and lessons in the browser.
6. Exporting and restoring JSON backups, and printing a connected lesson.
7. Checking goal coverage, prerequisite order, timing, missing language purposes, and lessons affected by unit changes.
8. Reusing saved PDFs, reviewing page text and source citations, and adding curriculum to an existing unit without rewriting earlier approved plans.

AI drafting uses an independent server endpoint. A labeled example and manual blueprint/lesson outlines also work without AI. Generated content always needs teacher review.

The [GitHub Pages edition](https://lenguajelabs-design.github.io/EALUnit/) supports PDF sources, manual planning, examples, and browser backups. AI drafting runs only with the separate local server. Accounts, cloud sync, targeted AI regeneration, and reflection-driven revision proposals are not implemented yet.

## Run locally

Requires Node.js 22.13 or newer and npm.

```bash
npm ci
npm run dev
```

Open [EAL Unit locally](http://127.0.0.1:4173).

For AI drafting, create a local `.env` from `.env.example` and set `OPENAI_API_KEY`. An existing server environment variable also works. `OPENAI_MODEL` defaults to `gpt-5-mini` and can be configured independently. Credentials stay on the server; never put them in `VITE_` variables or commit `.env`.

The generation server binds to loopback only. Shared AI hosting requires an authentication and usage design; the Pages deployment does not expose that server.

## Use curriculum PDFs

Upload a PDF during unit setup, or choose **Add curriculum PDF** on an existing unit's overview. Review the extracted text, select relevant pages, and choose **Use selected pages**. A PDF can supply the curriculum without retyping its content. When local AI drafting is available, those pages inform the suggested blueprint and connected lessons. Source buttons open the supporting passage and its PDF page number; suggestions still need teacher judgment.

Limits are three PDFs per unit, 20 MB and 100 pages per PDF, and 40,000 selected characters across the unit. Searchable PDFs work; scans need text recognition (OCR) first. Review reading order and tables against the original. PDF page numbers can differ from printed page labels.

Adding curriculum to an approved unit creates a draft. Existing approved revisions and lessons retain the source context used when they were planned. **Draft from curriculum** offers a separate suggestion, applied only when the teacher chooses to use it.

## GitHub Pages

This is a React/Vite application published from built `dist/` files through GitHub Actions. In **Settings → Pages → Build and deployment**, the source is **GitHub Actions**. Pushing to `main` runs the tests, builds with the `/EALUnit/` base, checks PDF assets, and deploys through [.github/workflows/pages.yml](.github/workflows/pages.yml).

```bash
npm run build:pages
```

Pages uses hash navigation and includes the PDF worker, fonts, character maps, and WebAssembly resources. It does not run Express or receive an OpenAI key. For AI drafting, run the local app and move planning between origins using JSON backups; original PDFs must be uploaded separately.

If the hosted page fails, check the latest **Deploy EAL Unit to GitHub Pages** run, confirm the Pages source is GitHub Actions, and check that asset URLs begin with `/EALUnit/`. Deployment settings and workflow runs belong to EALUnit only.

## Check and build

```bash
npm run check
npm run build
npm start
```

`check` runs deterministic planning, PDF extraction/storage, backup, and API tests, TypeScript checks, and a production frontend build. `start` serves the normal built app and the local generation API. `build:pages` produces the separate static Pages edition. GitHub Actions verifies pushes and pull requests; the Pages workflow also deploys successful pushes to `main`.

## Where plans are saved

Plans use the browser storage key `eal-unit-library-v1`. Original PDFs and extracted pages use the separate IndexedDB library `eal-unit-curriculum-v1`. Export a JSON backup before clearing browser data or moving devices. Backups include reviewed page text, source identities, citations, revisions, and lessons, but not original PDF files. Keep those originals separately. Restore validates the backup and adds units whose IDs are not already present; existing teacher work is preserved. The hosted and local app have separate browser storage.

GitHub backs up the application source, not the plans or PDFs saved in your browser. PDF extraction happens locally with PDF.js. AI drafting sends the relevant workshop context, reviewed PDF text, and group notes to OpenAI only when requested from the local app; original PDF binaries stay in the browser. Source material is kept separate from generated interpretations, and official WIDA alignment is not claimed.

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
