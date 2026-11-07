# Deployment facts and unresolved release requirements

The thesis team supplied the following deployment information on 2026-11-07. It was not independently verified by connecting to the live application or provider dashboards.

| Component | Team-confirmed information |
| --- | --- |
| Frontend | React/TypeScript hosted on Vercel. |
| Backend | Render service `skillswap-50cf`, with base URL `https://skillswap-50cf.onrender.com`. |
| Backend deployment branch | `main`; pushing there automatically builds and redeploys on Render. |
| Deployment operator | A developer groupmate controls logs, environment variables, and manual redeployment. This user's dashboard access is not confirmed. |
| Local database | MySQL at localhost:3306, database `knoxite`. This is not assumed to be production. |
| Production database | MySQL/Prisma; hosting provider, credentials/access permissions, backups, restore capability, and migration readiness remain unconfirmed. |

Current authorization is local source development and isolated MySQL testing on `dev-justine`. Do not connect to production resources, change provider settings or secrets, push/merge to `main`, or trigger deployment. No deployment operation, production secret rotation, or production database access has been performed here.

Before a release is authorized, the team must identify the actual production database and accountable owner, confirm access boundaries, obtain a backup and demonstrate restoration on an isolated sanitized clone, rehearse the reviewed migration against that clone, reconcile legacy records, and approve a deployment/rollback procedure compatible with the actual schema. Do not point development or test commands at the production URL. Do not treat a localhost database or synthetic rehearsal as evidence of production readiness.

The previously exposed signing key remains an operator security action. When the team authorizes containment/release, the Render operator must replace the effective running key on all instances and verify that old tokens fail. An old hardcoded build does not rotate merely because an environment variable changes. Never deploy the entire schema-dependent upgrade against an unreconciled database as a shortcut. See `SECURITY_RELEASE_REVIEW.md` for containment considerations.

Institutional domain/campus confirmation, actual mail delivery, officially validated department mappings, subject-reviewed question banks, and approved study privacy arrangements remain separate release gates. The newly supplied college mapping is provisional; adviser approval of the metric policy does not validate campus assignments or email conventions.
