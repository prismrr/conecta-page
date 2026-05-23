# AGENTS

## Purpose
- This file is the shared bootstrap for AI coding agents in this repository.
- Treat this document as operational guidance, and treat .SPECS documents as the source of truth for product, engineering, QA/AppSec, and privacy/compliance decisions.

## Source of Truth
- Project overview: [README.md](README.md)
- Product concept and scope: [.SPECS/idea.md](.SPECS/idea.md)
- Technical PRD and traceability: [.SPECS/PRD.md](.SPECS/PRD.md)
- QA and AppSec strategy: [.SPECS/test_design.md](.SPECS/test_design.md)
- LGPD requirements and controls: [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md)

## Customization Map
- Global bootstrap rules: [AGENTS.md](AGENTS.md)
- Privacy and LGPD changes: [.github/instructions/compliance.instructions.md](.github/instructions/compliance.instructions.md)
- Testing and reliability changes: [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md)
- Requirement to test to metric mapping: [.github/prompts/prd-traceability.prompt.md](.github/prompts/prd-traceability.prompt.md)

## Project Context
- Product: static event website for PRISM Conecta.
- Baseline stack direction: static generation flow (Jekyll-oriented), external registration result integration, and optional API-based dynamic helpers.
- Priority pages: Home, Registration Guidance and Results, Schedule and Speakers.

## Mandatory Working Rules for Agents
1. Do not implement features that conflict with invariants in [.SPECS/PRD.md](.SPECS/PRD.md).
2. For any integration payload usage, preserve contract safety and degraded-mode behavior from [.SPECS/test_design.md](.SPECS/test_design.md).
3. For any data collection, consent, cookies, analytics, marketing, or third-party sharing change, enforce LGPD controls from [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md).
4. When applicable, follow specialized instructions in [.github/instructions/compliance.instructions.md](.github/instructions/compliance.instructions.md) and [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md).
5. Prefer minimal and reversible changes. Keep public behavior stable unless requirement explicitly changes.
6. Link to existing docs instead of duplicating long policy text in new files.

## Engineering and Quality Guardrails
- Test effort target: Unit 55%, Integration 25%, Component 15%, E2E 5%.
- E2E tests must prioritize stability: deterministic data, no brittle selectors, no avoidable flakiness.
- Keep compatibility checks for external registration contracts and provide fallback UI states.
- Preserve observability hooks for conversion events and integration failures.

## Privacy and Security Guardrails
- No personal data collection without explicit purpose and legal basis.
- Consent must be granular, versioned, and revocable.
- Non-essential cookies and marketing tracking require explicit opt-in.
- Maintain auditable logs for consent and sensitive operations.
- Treat third-party integrations as high-risk boundaries and require minimization and clear purpose.

## Delivery Checklist Before Finishing a Task
1. Requirement traceability: change mapped to at least one requirement in [.SPECS/PRD.md](.SPECS/PRD.md).
2. Quality impact checked against [.SPECS/test_design.md](.SPECS/test_design.md).
3. LGPD impact assessed using [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md).
4. Documentation links updated if behavior or policy surface changed.

## Out of Scope by Default
- Building a full custom CMS.
- Adding user account systems not requested by requirements.
- Introducing complex real-time dashboards without explicit requirement update.

## If Specs Conflict
1. Prefer the most recent decision in [.SPECS/PRD.md](.SPECS/PRD.md).
2. If conflict remains, stop and ask for clarification before implementation.
