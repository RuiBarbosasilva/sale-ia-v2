# Sale-IA v2 — AI Coding Agent Rules

## Mission

This repository is a production-oriented TypeScript/Express/Prisma backend. AI coding agents such as Qwen Code may help implement, debug, test and review code.

## Mandatory workflow

1. Inspect the existing architecture before changing code.
2. Never commit secrets, API keys, tokens, cookies or credential values.
3. Work on a feature/fix branch; never modify `main` directly.
4. Prefer small, focused changes.
5. Reuse existing services, routes, types and Prisma models when possible.
6. Before declaring a task complete, run the most relevant checks:
   - `npm run typecheck`
   - relevant Jest tests
   - `npm run build` when applicable
7. Do not silently change database schema or migrations unless the task requires it.
8. Preserve existing API behavior unless the task explicitly changes the contract.
9. For external integrations, use environment variables and fail safely when credentials are absent.
10. Summarize changed files, tests run, remaining risks and any manual setup required.

## Git safety

AI agents must not force-push, rewrite shared history, delete protected branches, or merge their own PR unless explicitly instructed by the project owner.

## Affiliate safety

Affiliate actions that affect external accounts, affiliation approval, publishing, spending, or irreversible external operations remain supervised. Do not bypass the approval workflow.

## Definition of done

A coding task is complete only when:
- the implementation is coherent with the current architecture;
- typechecking/tests pass where applicable;
- no secret is introduced;
- the change is documented when it affects configuration or external integrations;
- the final response reports what was actually verified.
