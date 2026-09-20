# Qwen Coding Workflow

## Purpose

Qwen Code is used as an AI pair-programmer for Sale-IA v2. It helps inspect the repository, implement features, debug defects, write tests and review changes.

The Qwen coding agent is intentionally separate from the Sale-IA runtime. This means the production application does not need a Qwen dependency just to be developed with Qwen.

## Recommended local setup

Qwen Code currently requires Node.js 22+ and can be installed with its official npm package:

`npm install -g @qwen-code/qwen-code@latest`

Then open the project:

`cd C:\sale-ia-v2`
`qwen`

Authenticate through Qwen Code's `/auth` flow using an available provider.

## Safe project workflow

Use this sequence:

1. Ask Qwen to inspect the repository and identify the relevant files.
2. Ask for a plan before a substantial change.
3. Create a feature/fix branch.
4. Implement the smallest coherent change.
5. Run typecheck and relevant tests.
6. Review the diff.
7. Commit with a descriptive message.
8. Push the branch and open a PR.
9. Let GitHub Actions validate the PR.
10. Merge only after the checks and review are satisfactory.

## Useful prompts

### Understand the project

`Analyze the Sale-IA v2 architecture. Do not modify files. Identify the modules, services, routes, Prisma models and tests relevant to the requested task.`

### Implement a feature

`Implement [FEATURE]. First inspect the existing architecture and propose a plan. Then make the smallest changes necessary, run typecheck and relevant tests, and summarize the diff.`

### Debug

`Investigate [ERROR]. Reproduce or trace the failure using the existing code. Do not guess. Fix the root cause, add or update a regression test, and run the relevant checks.`

### Review

`Review the current changes for correctness, security, regressions, duplicate logic and missing tests. Do not modify files. Return findings ordered by severity.`

## Division of responsibilities

- Lumi: architecture, task decomposition, integration strategy and final review direction.
- Qwen Code: repository exploration, implementation, debugging, tests and code review assistance.
- GitHub: version control, PR review and CI.
- Sale-IA v2: runtime execution.

## Runtime Qwen integration

A runtime Qwen API adapter should be added separately from this coding-agent workflow. It should be provider-agnostic, use environment variables for credentials, have timeouts/retries, redact secrets from logs, and have tests with mocked HTTP responses.

Do not add an API key to the repository.
