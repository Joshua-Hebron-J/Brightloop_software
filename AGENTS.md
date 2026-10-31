# Brightloop project instructions

The official Subscription Management System statement is authoritative; REQUIREMENTS.md maps it. Master-prompt enhancements are secondary.

Architecture: frontend/ is Lakshitha's React 18, Vite, Tailwind and Recharts visual foundation. backend/ is Joshua's Express, TypeScript and native node:sqlite business layer. Preserve both; do not add a second backend or database. Joshua owns delivery; Lakshitha owns the original UI; Kai is technical advisor.

Use Node 22.13+. From this root run npm run typecheck, npm run lint, npm test and npm run build. npm run dev starts both apps; npm start serves the built app. Tests force DATABASE_PATH=:memory: and must never touch user databases.

Use frontend/src/services/api.ts for HTTP contracts and mappings. Never restore operational mock data, persona switching, fake success or client-side billing. Surface server errors and refresh data after mutation. Server authorization and customer ownership guards must cover lists, direct IDs, invoice HTML and actions.

Preserve the money representation, rounding results to two decimal places. Transactions protect billing, discount uses, payment allocations and refunds. Preserve cycle idempotency and reference uniqueness. Add migrations instead of rewriting applied migrations. Archive catalog/customer data rather than destroying financial history.

Distinguish queued, failed and provider-accepted email. Do not send live emails or charge cards in tests. Use environment secrets; demo credentials are fictional test fixtures.

Git: retain original history, use main and the approved Joshua-Hebron-J/brightloop-backup remote. Never force-push or overwrite unrelated remote work. Verify before commits/pushes and record milestones at least hourly while actively developing. Ignore databases, .env, node_modules and dist. Continue independent local work if the remote is unavailable; report the blocker precisely.

Done means mandatory behavior is implemented, relevant tests/typechecks/lint/build pass, the financial journey is verified, selected browser checks and limits are documented, and README/DEMO_GUIDE/REQUIREMENTS/VERIFICATION match reality. Never call queued email delivered or simulated bookkeeping a live payment.
