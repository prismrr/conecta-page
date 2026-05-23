---
applyTo: "**/*.{md,html,js,ts,tsx,jsx,json,yml,yaml}"
description: "Use when working on personal data, consent, cookies, analytics, marketing, third-party integrations, privacy policy changes, LGPD requirements, or security/compliance behavior."
---

# Compliance Instruction (LGPD)

## Relationship to Other Instructions
- Use [AGENTS.md](AGENTS.md) for global project guardrails.
- Use this file only for privacy and compliance decisions.
- For test strategy and flakiness control, use [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md).

## Scope
- Apply this instruction when a change affects personal data collection, storage, processing, sharing, retention, consent, user tracking, analytics, marketing communications, or incident handling.
- Source of truth for compliance decisions:
  - [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md)
  - [.SPECS/PRD.md](.SPECS/PRD.md)
  - [.SPECS/test_design.md](.SPECS/test_design.md)

## Mandatory Rules
1. Do not add personal data fields without explicit purpose, lawful basis, and retention policy.
2. Keep consent granular by purpose. Never bundle essential and non-essential consent.
3. Ensure consent is revocable and changes propagate to tracking and downstream services.
4. Do not activate non-essential cookies, marketing tags, or personalized ads before explicit opt-in.
5. Treat third-party integrations as high-risk boundaries: minimize payload and document purpose.
6. Keep auditable records for consent, revocation, sensitive operations, and policy version changes.
7. Prefer anonymization or pseudonymization when full identification is not required.
8. Preserve DSAR operability: access, correction, deletion, export, and consent revocation flows must remain possible.

## Required Implementation Checks
- Lawful basis check:
  - Every new data operation maps to a lawful basis and user-facing purpose statement.
- Data minimization check:
  - New fields are strictly necessary for the declared function.
- Consent check:
  - Consent capture includes version reference, timestamp, and status.
- Cookie and analytics check:
  - Non-essential telemetry is gated by opt-in.
- Third-party check:
  - Integration purpose, data scope, and risk controls are explicit.

## Required Validation Before Completion
1. Confirm traceability to at least one relevant requirement in [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md).
2. Confirm no PRD invariant is violated in [.SPECS/PRD.md](.SPECS/PRD.md).
3. Confirm test impact and quality gates remain aligned with [.SPECS/test_design.md](.SPECS/test_design.md).
4. If policy-visible behavior changed, update or reference the relevant policy content and changelog.

## Blockers (Stop and Ask)
- The change introduces personal data processing but lawful basis is unclear.
- A request asks to bypass consent, logging, or retention controls.
- A new third-party service is added without defined purpose and data minimization.
- There is conflict between implementation request and compliance requirements in .SPECS.

## Writing and Documentation Standard
- Prefer concise, user-comprehensible language for any privacy-facing text.
- Link to existing specification files instead of duplicating long legal sections.
- Use fictitious data only in examples and test fixtures.
