# Duplicate college correction

Date: 2026-11-13. Local branch: `dev-justine`. Scope: source correction and verified synthetic recovery-1 only; no production/original database, schema migration, manuscript, WRMR policy, deployment or Git publication changes.

## Confirmed cause and safe data correction

Department codes were unique, but names were not checked. Creating a college with another code, or importing a draft that used a different code from an existing college, could create two records with the same name. The administration selector displayed every department, including inactive records.

The verified sandbox had two duplicate pairs. Inspection established one unused copy and one referenced record in each pair:

| College | Retained active code | Archived unused code | Existing links preserved |
| --- | --- | --- | --- |
| College of Arts and Sciences | `CAS` | `COLLEGE_ARTS_SCIENCES` | BS PSYCH, including existing validation evidence |
| College of Computer Studies | `COLLEGE_COMPUTER_STUDIES` | `CCS` | BSCS and BSIT; existing student/program associations |

The archive transaction required both records to have the exact expected name, the retained record to be active and referenced, and the archived record to have no program links. It changed only the unused records' `isActive` fields to false. It did not delete or merge IDs, reassign programs, change validation dates/notes/reviewer/version, or award institutional approval. All 19 program records were compared before/after and remained identical. Existing user-entered mapping updates made after the previous audit were retained.

An exclusive backup of department/program configuration was saved privately before the transaction:
`C:\Users\Admin\AppData\Local\Knoxite\sandbox\recovery-1\academic-options-before-archive-1794576598090.json`.
It remains outside Git. Restoration, if ever needed, must review current references and duplicate-name conflicts first; do not blindly reactivate both copies. The archived rows remain available in administrator API metadata for inspection.

## Prevention and presentation

- `knoxite-backend/services/departmentNames.ts`: normalize names by trimming/collapsing whitespace and case folding. Resolve draft colleges only when one active record has the same normalized name; conflicting codes, multiple active matches or inactive-only matches require review. Different names are not fuzzy-merged.
- `knoxite-backend/routes/admin.ts`: department creation rejects an existing normalized name even under another code, including archived records. The check/create uses the existing serializable transaction helper. Current ADMIN authorization remains required; transaction conflicts retain the existing safe 409 handling. No database uniqueness migration was added.
- `knoxite-backend/services/departmentDraft.ts`: reuse an unambiguous existing active name even when its code differs from the draft. Resolve conflicts before mutations, retain all existing program assignments/evidence, and keep imported mappings provisional. Archived redundant draft codes cannot cause another copy to be created when an active matching college exists.
- `src/app/pages/AssessmentAdminPage.tsx`: exclude inactive departments from the selection dropdown. The full metadata remains available to administration; this is not visual deduplication of unresolved active IDs.
- `knoxite-backend/tests/department-names.test.ts`: five tests cover normalization, legacy-code reuse, conflicts/archives, repeated imports/evidence preservation, and authorized creation rejecting duplicates.
- `tests/browser/workflows.spec.ts`: add desktop/mobile regression coverage for selecting only retained active college records while preserving the previous tests.

No WRMR formula, department category, completion rule, institutional eligibility rule or assessment behavior changed. Because only unreferenced copies were archived, students' actual department IDs and academic proximity inputs remain unchanged.

## Validation and activation

- `npm --prefix knoxite-backend test`: **88 passed, 0 failed**, including five new department regressions; backend build and current Prisma Client check passed without generation/migration.
- `npm run typecheck` and `npm run build`: passed. The existing bundle-size advisory remains.
- Focused Edge desktop/mobile browser checks: **4 passed, 0 failed** after correcting the new test to inspect native option elements directly. The first run passed two existing import checks and failed two new selector assertions; this was a test locator issue, not missing dropdown entries.
- `git diff --check`: passed.

The frontend filter is served by the local Vite server. The user successfully restarted the compiled backend from the original PowerShell terminal using the commands below. A new signed backend start was verified; no force-stop or process-ownership bypass was attempted:

```powershell
cd C:\KNOXITE\SkillSwap
npm run sandbox:stop
npm run sandbox:start
```

An actual Edge browser check after restart confirmed each affected college appears **once**, with all selectable names unique. A normalized duplicate-creation request to the running API returned **409** without creating a row. Repeating the provisional import returned zero new mappings; all program and department records were identical before/after that check. `sandbox:check` confirmed the expected database/API identity and all four seeded accounts/password hashes/verification/roles remain intact. The manual live check is additional to the 88 backend and four desktop/mobile automated tests, not counted as another automated test.

Refresh `/admin/assessments` to load the corrected choices. The original database and all production resources remain untouched. No unverified Docker resource was reset or removed.
