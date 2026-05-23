---
mode: ask
description: "Generate requirement-to-test-to-metric traceability for a feature, change request, or PR using project specs as source of truth."
---

# PRD Traceability Prompt

Create a complete traceability map for the requested change using the repository specs as authoritative references.

## Source of truth
- [AGENTS.md](AGENTS.md)
- [.SPECS/PRD.md](.SPECS/PRD.md)
- [.SPECS/test_design.md](.SPECS/test_design.md)
- [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md)
- [.SPECS/idea.md](.SPECS/idea.md)

## Execution rule
- Respect specialized instructions when relevant:
  - [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md)
  - [.github/instructions/compliance.instructions.md](.github/instructions/compliance.instructions.md)

## Inputs
- Change summary: ${input:changeSummary:Describe the change in one paragraph}
- Scope type: ${input:scopeType:feature|bugfix|refactor|integration|compliance}
- Affected areas: ${input:affectedAreas:List modules/pages/components}
- Risk level: ${input:riskLevel:low|medium|high}

## Required output
Provide all sections below.

### 1. Requirement Mapping
- Identify impacted requirement IDs from [.SPECS/PRD.md](.SPECS/PRD.md).
- For each requirement, explain why it is in scope.
- If no existing requirement applies, propose a new requirement candidate with rationale.

### 2. Test Strategy Mapping
- For each mapped requirement, specify test layers:
  - Unit
  - Integration
  - Component
  - E2E
- Keep alignment with the quality distribution and strategy in [.SPECS/test_design.md](.SPECS/test_design.md).
- Explicitly call out contract tests when external integration is involved.

### 3. Metric and Telemetry Mapping
- Define one primary success metric and supporting guardrail metrics.
- Map each metric to concrete telemetry events or signals.
- Include expected movement direction and validation window.

### 4. Compliance and Privacy Impact
- Evaluate LGPD impact using [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md).
- State whether consent, retention, data sharing, cookies, analytics, or DSAR flows are affected.
- List additional controls required before merge.

### 5. Delivery Checklist
- Requirements traceability confirmed.
- Tests updated for all critical behavior changes.
- Metrics and telemetry updates defined.
- Compliance impact assessed.
- Residual risks documented.

### 6. Output Table (Mandatory)
Return a table in this format:

| Requirement ID | Change Element | Test Layers | Metric/Event | Compliance Impact | Risk | Status |
|---|---|---|---|---|---|---|

Use values:
- Status: planned|implemented|validated|blocked
- Risk: low|medium|high

## Constraints
- Do not invent requirements that contradict existing specs.
- Use concise technical language.
- Prefer links to spec files instead of long copied excerpts.
- If ambiguity exists, list clarifying questions at the end.
