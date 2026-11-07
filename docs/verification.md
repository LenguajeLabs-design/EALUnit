# Prototype verification

Updated: 7 November 2026.

## Automated checks

`npm run check` runs 33 tests, TypeScript checking, and a production frontend build. `npm run build:pages` also verifies the project asset base, PDF worker, character maps, fonts, and WebAssembly resources in the static output.

The tests cover:

- Approval before lesson generation.
- Many-to-many lesson and learning-step relationships.
- A new draft revision after editing an approved blueprint.
- Preservation of approved snapshots and existing lessons.
- Broken links, duplicate IDs, prerequisite cycles, and order checks.
- Missing goal evidence, missing language purposes, and timing overruns.
- Round-trip storage and backups retaining relationships and provenance.
- Corrupt storage, failed writes, unsupported backup versions, and non-overwriting restore.
- Long selected-step content remaining within the lesson contract.
- Validated API input, approval gates, local host/origin checks, readable errors, and non-disclosure of provider error details.
- Real PDF extraction with page boundaries, original byte preservation, invalid/oversized inputs, and mixed or image-only pages.
- Reviewed page selection, PDF-only context, selected text bounds, and exact source passage checks.
- Original PDF persistence and deduplicated reuse in a separate IndexedDB library.
- Source context snapshots preserving earlier approvals and lessons when curriculum changes, including legacy approvals.
- Backup validation preserving selected text and citations while excluding original binaries.
- PDF-only API input reaching generation and invalid page numbers rejected before provider calls.

AI providers are stubbed in automated API tests. The test suite does not spend API credits or require an API key.

The production server was also started on a separate loopback port. Its HTML, compiled JavaScript asset, and configuration endpoint all returned HTTP 200.

## Browser verification

The local interface was checked at desktop and phone widths, including a 1440-pixel desktop viewport and a 390-pixel phone viewport.

Observed successful workflows:

1. Open the labeled example unit and review the paired goals and learning sequence.
2. Approve the blueprint and select two learning steps for one lesson.
3. Create an editable connected lesson with inherited purposes, evidence, and workshop transfer.
4. Reload the page and reopen the same saved lesson.
5. Edit an approved language goal; see a new draft revision and an insight identifying the older connected lesson, without rewriting it.
6. Download a JSON unit backup containing its approved revision and connected lesson.
7. Restore a validated copy with a new unit ID through the file chooser; see the new unit added while existing units remain intact.
8. Check the mobile insights view for horizontal page overflow. The section navigation intentionally scrolls horizontally and keeps its active section visible.

The preview uses fictional group descriptions. No identifiable student information was used in verification.

For the PDF update, a fictional two-page curriculum was uploaded and reviewed without entering a separate workshop brief. Its selected text supported a live blueprint, exact passage links, approval, and a connected lesson with source references. An image-only PDF produced an OCR message while the existing reviewed attachment remained intact. Reloading retained the unit and source text; reopening page review loaded the saved original. Removing a page from the current curriculum created a draft, while the earlier lesson still opened its original page citation. The PDF review dialog fit a 390-pixel phone viewport without horizontal document overflow.

## Live generation review

Live blueprint drafting and connected lesson generation were exercised with the anonymized character-change example. Structured outputs passed the runtime contracts and produced editable plans linked to approved unit context.

Review of the first outputs identified generic phrase practice, an unsupported assumption about writing readiness, invented illustrative story details, and overly specific timing or writing requirements. The instructions were refined to prioritize meaning-making, distinguish unknown readiness from logistical assumptions, use teacher-selected excerpts, keep internal schema terms out of prose, and avoid invented session frequency.

A subsequent blueprint kept writing readiness explicitly open and proposed a coherent five-step progression. It still introduced a timing assumption, which prompted the final frequency instruction. These are example-based prompt refinements, not proof that generated plans are instructionally accurate. The final frequency refinement needs review in the real curriculum pilot.

The PDF-backed example preserved writing readiness as an open question, cited actual selected passages, and produced a lesson whose activities totaled the supplied 35-minute session. Review still found generic phrase repetition, overly fixed quantities, and teacher-facing activity shorthand in parts of the output. Source checks establish that cited passages exist; teacher review remains necessary for fit, support choices, and instructional quality.

## Remaining verification

- Pilot with one real workshop unit and an anonymized teaching group.
- Teacher review of generated language goals, support choices, transfer opportunities, and pacing.
- School-specific review of curriculum sources and external AI processing.
- Cross-device and authenticated shared use, which are outside this local prototype.
- Physical printing and format-specific export requirements.

Passing structural tests does not demonstrate student learning impact or official curriculum/WIDA alignment.
