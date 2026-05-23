---
applyTo: "**/*.{md,html,js,ts,tsx,jsx,json,yml,yaml}"
description: "Use when implementing or changing features, integrations, CI quality gates, tests, schemas, contracts, and reliability behavior."
---

# Testing and Quality Instruction

## Relationship to Other Instructions
- Use [AGENTS.md](AGENTS.md) for global project guardrails.
- Use this file for testability, reliability, and quality gate decisions.
- If a change affects personal data, consent, cookies, marketing, or sharing, also apply [.github/instructions/compliance.instructions.md](.github/instructions/compliance.instructions.md).

## Scope
- Apply this instruction to feature work, refactors, integration changes, CI updates, and any behavior that can affect reliability, latency, or user-critical flows.
- Source of truth:
  - [.SPECS/test_design.md](.SPECS/test_design.md)
  - [.SPECS/PRD.md](.SPECS/PRD.md)
  - [.SPECS/idea.md](.SPECS/idea.md)

## Mandatory Rules
1. Preserve the test effort distribution target: Unit 55%, Integration 25%, Component 15%, E2E 5%.
2. Any change touching external registration integration must include contract-safe validation and degraded-mode behavior.
3. E2E tests must be stable by design: deterministic data, robust selectors, and no brittle CSS-path locators.
4. Add or update tests for critical flows before considering task completion.
5. Do not merge logic changes that reduce observability for conversion or failure events.
6. Keep accessibility checks in critical pages as part of quality gates.
7. Avoid introducing flaky tests; if unavoidable, isolate and document remediation immediately.

## Critical Flows That Must Stay Protected
- Home to registration guidance journey.
- Registration result retrieval and fallback states.
- Schedule and speaker rendering integrity.
- Consent-related flow interactions when impacted by feature behavior.

## Required Implementation Checks
- Requirement mapping check:
  - Map each functional change to a PRD requirement in [.SPECS/PRD.md](.SPECS/PRD.md).
- Coverage intent check:
  - Define which test layers are affected (unit/integration/component/E2E).
- Contract check:
  - For external data payload changes, validate compatibility assumptions and fallback handling.
- Accessibility check:
  - Ensure critical page interactions remain keyboard-accessible and semantically valid.
- Reliability check:
  - Confirm no new nondeterminism sources were added to tests.

## Required Validation Before Completion
1. Updated tests exist for all changed critical behavior paths.
2. Risky integration changes include contract-oriented validation.
3. CI quality gates remain aligned with [.SPECS/test_design.md](.SPECS/test_design.md).
4. If user-facing behavior changed, ensure PRD traceability remains explicit in [.SPECS/PRD.md](.SPECS/PRD.md).

## Blockers (Stop and Ask)
- Feature request conflicts with baseline test strategy or removes required quality gates.
- External integration changed but contract assumptions are undefined.
- Requested delivery skips tests for a critical flow without explicit approval.
- There is mismatch between implemented behavior and PRD requirement mapping.

## Documentation Standard
- Keep test rationale concise and linked to requirement IDs when possible.
- Prefer linking to source specs instead of duplicating long sections.
- Use synthetic and fictional test data only.
