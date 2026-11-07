# Safe local development

Use Node 22 and an isolated local MySQL 8 database. All implementation work belongs on `dev-justine` and requires review before merging into `main`.

1. Run `npm ci --ignore-scripts` in the repository root and backend.
2. Copy the appropriate `.env.example` files into local `.env` files without overwriting existing credentials. Generate a new unpredictable JWT secret of at least 32 characters. Never reuse the exposed historical key.
3. Set an explicit local `DATABASE_URL` and run `npm run db:generate` in the backend. Development blocks remote databases.
4. Follow the guarded bootstrap/upgrade procedure in [IMPLEMENTATION_NOTES.md](../IMPLEMENTATION_NOTES.md). Do not use `prisma db push` or reset an existing database. Real-data upgrades require a sanitized clone audit first.
5. Configure institutional mail delivery. The campus/domain rule remains provisional until officially confirmed. Program labels and years are initialized from the team-approved catalogue; department mappings are not guessed.
6. Run `npm run dev` in the backend and frontend. The frontend defaults to localhost and never falls back to the deployed API. Production builds require an explicit `VITE_API_BASE_URL`.
7. Run type checks, builds, backend unit/integration tests, and browser tests before requesting review. Integration tests require an acknowledged isolated `_test` database.

No real assessment banks are enabled by default. Administrators must import, validate, and publish curated content. OAuth remains deferred pending feasibility and institutional approval.
