# QWEN.md — SALE-IA-V2

## Mission

SALE-IA-V2 is a modular sales automation platform. Changes must preserve existing working functionality and must be production-oriented, secure, auditable, and compliant with the rules of each external platform.

## Mandatory rules

1. Never expose, commit, print, or hard-code secrets, API keys, OAuth tokens, passwords, webhook secrets, encryption keys, or credentials.
2. Never bypass authentication, authorization, rate limits, platform policies, CAPTCHA, age/identity checks, or terms of service.
3. Use official APIs and documented integration mechanisms whenever an external platform provides them. Do not introduce prohibited scraping or browser automation.
4. Never copy another website, creative, text, code, layout, brand identity, or protected asset. RB Factory Sites must generate original work from design patterns and customer requirements.
5. Do not remove or weaken existing security controls, Guardian checks, authorization boundaries, validation, logging, or error handling merely to make a test pass.
6. Do not delete existing functionality unless the change is explicitly justified, tested, and preserves the intended behavior.
7. Validate all external input at the boundary. Apply bounded pagination, payload sizes, string lengths, enums, and safe error responses.
8. Backend authorization is authoritative. Never trust account IDs, roles, permissions, prices, commissions, or other security-sensitive values supplied by the frontend.
9. Do not log secrets, tokens, authorization headers, personal credentials, or sensitive payloads.
10. Important changes must be made on a branch and delivered through a pull request. Do not push directly to main for substantive changes.
11. Do not claim a feature is complete because it compiles. Run relevant tests, typecheck, build, and Guardian validation.
12. Do not introduce automatic external sending, spending, publishing, affiliate enrollment, marketplace listing changes, or irreversible actions without an explicit authorization/approval boundary unless the existing documented design already provides that authority.
13. Affiliate automation must respect each network's rules. If manual enrollment or approval is required, create a supervised/manual-required workflow instead of pretending enrollment succeeded.
14. Never fabricate sales, commissions, demand, product metrics, customer data, reviews, or research evidence.
15. Preserve idempotency for webhooks, sales, payouts, and other retried external events.

## Guardian is mandatory

Before and after substantive changes, use the project's Guardian checks. Guardian is the safety and transaction layer for repository changes.

Expected commands when applicable:

- npm run guardian:verify
- npm run guardian:health
- npm run guardian:transaction

Do not overwrite or bypass Guardian transaction logic without a specific security justification and tests.

## Validation gate

For substantive changes, the minimum validation is:

- npm run typecheck
- npm run build
- npm test
- npm run guardian:verify

If a command cannot run because an external credential/service is unavailable, document the exact limitation instead of weakening the code or faking the result.

## Architecture principles

- Keep modules separated by responsibility.
- Prefer services/controllers/routes with explicit boundaries.
- Keep external integrations isolated behind services/adapters.
- Keep secrets in environment variables or approved secret stores.
- Use Prisma migrations for schema changes.
- Avoid raw SQL unless there is a documented reason and safe parameterization.
- Prefer small, reviewable commits and PRs.
- Preserve backward compatibility for existing public APIs unless a migration plan is included.

## External platforms

Mercado Livre, Hotmart, Eduzz, Braip, Kiwify, Monetizze, Amazon, Shopee and other networks may change their APIs and policies. Verify current official documentation before implementing new integration behavior.

Never invent an API endpoint, permission, webhook event, affiliate enrollment flow, or policy requirement.

## AI behavior

AI-generated code is subject to the same security and validation requirements as human-written code. AI must inspect the existing implementation before changing it, minimize unnecessary changes, and report assumptions and unresolved blockers.

## Definition of done

A task is done only when:

- the requested behavior exists;
- existing functionality remains intact;
- security boundaries remain enforced;
- inputs and errors are validated safely;
- tests/typecheck/build pass where applicable;
- Guardian validation passes where applicable;
- no secrets or prohibited automation were introduced;
- the change is reviewable and documented when needed.


## STATUS 2026-10-03 — REPARO DEFINITIVO DO SCHEMA AFILIADOS

- Causa identificada: a migration `20260919130000_add_ai_sales_affiliate_intelligence` estava marcada como aplicada, mas o `dev.db` não continha as tabelas/modelos novos de Afiliados.
- O banco local tinha o `AffiliateProduct` legado e o modelo atual do Prisma esperava a versão nova relacionada a `AffiliateNetwork`.
- O `migrate diff` confirmou também diferenças pendentes em `AffiliateClick`, `AffiliateOffer`, estruturas Editorial e `WebsiteImportedTemplate`.
- Correção registrada no GitHub em `prisma/migrations/20261003230000_reconcile_current_schema/migration.sql`.
- A migração preserva os dados existentes de `AffiliateLink`; `AffiliateProduct` estava com 0 registros no banco no momento do reparo, portanto a transição não descartou produtos cadastrados.
- Próxima execução local: aplicar a migration pendente com `npx prisma migrate deploy`, depois `npx prisma generate`.
- Não usar `prisma migrate reset` neste projeto.
- Objetivo do reparo: alinhar o SQLite ao `schema.prisma` atual para que o Dashboard Afiliados IA possa usar `AffiliateNetwork`, `AffiliateOpportunity`, `AffiliateCampaign`, `AffiliateContent` e `AffiliateAction`.
