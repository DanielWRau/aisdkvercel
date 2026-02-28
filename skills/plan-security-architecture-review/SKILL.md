---
name: plan-security-architecture-review
description: Senior-level plan review for security, architecture, integration, scalability, and code simplicity. Use when Codex must review a plan/RFC/proposal/migration design, identify security risks, assess application-wide integration impact, prioritize reuse over net-new code, prefer commercially usable open-source options, and write a structured report to ./review-planname.md.
---

# Plan Security Architecture Review

## Mission

Review technical plans as a senior security engineer and senior application architect. Deliver actionable findings that reduce risk, simplify implementation, improve reuse, and keep long-term operations scalable.

## Inputs

- Read the target plan first.
- Read only the repository files needed to validate claims in the plan.
- Infer existing architecture and integration boundaries before proposing changes.

## Workflow

1. Collect context.
- Read the target plan and relevant repository files.
- Map the plan to current architecture, integrations, and deployment model.
- Derive `<planname>` from the plan filename: lowercase, replace non-alphanumeric with `-`, collapse repeated `-`, remove extension.
- Use `plan` only when no better source name exists.

2. Build an application and integration overview.
- Summarize the current system in a compact snapshot: core components, data stores, async jobs, external providers, deployment/runtime boundaries.
- Map key data flows and trust boundaries (user entry points, internal service calls, outbound integrations).
- Identify where the proposed plan changes contracts, behavior, ownership, or blast radius.
- Identify entry points, data flows, trust boundaries, and external dependencies.
- Identify security-sensitive assets (credentials, PII, payment, admin paths, internal APIs).
- Identify coupling and blast radius across services and teams.

3. Run focused review passes.
- Run a security pass (auth, authz, secrets, injection, SSRF, supply chain, abuse paths).
- Run an architecture/integration pass (boundaries, contracts, failure modes, observability).
- Run a scalability/operability pass (capacity, bottlenecks, backpressure, SLO impact).
- Run a simplicity/minimal-code/reuse pass (delete duplication, avoid unnecessary custom code, leverage platform capabilities).
- Run a buy-vs-build pass with commercially usable OSS first, then managed/commercial services, then custom code as last resort.

4. Prioritize and harden recommendations.
- Classify findings as `Critical`, `High`, `Medium`, or `Low`.
- Tie every finding to concrete evidence in the plan or repository.
- Recommend the smallest safe change that resolves root cause.
- Always include a reuse option before proposing net-new implementation.
- Call out license and compliance checks for OSS recommendations.

5. Write the report.
- Write the final review to `./review-<planname>.md`.
- Overwrite existing content unless the user explicitly asks to append.

## Output Format

Use this exact section order in `./review-<planname>.md`:

1. `# Review: <planname>`
2. `## Executive Summary`
3. `## Application Context and Integration Overview`
4. `## Findings` (group by severity: Critical, High, Medium, Low)
5. `## Architecture and Integration Assessment`
6. `## Scalability and Operability Assessment`
7. `## Reuse and Code-Reduction Opportunities`
8. `## OSS/Commercial Build-vs-Buy Recommendations`
9. `## Test and Validation Plan`
10. `## Open Questions and Assumptions`
11. `## Top 3 Next Actions`

For each finding, use this structure:
- `ID`: short stable key (`SEC-01`, `ARCH-02`, `SCALE-03`)
- `Severity`: `Critical|High|Medium|Low`
- `Area`: security, architecture, integration, scalability, operability, maintainability
- `Evidence`: precise plan section and/or file path references
- `Impact`: concrete failure, exploit, outage, or business consequence
- `Recommendation`: smallest safe fix
- `Reuse/Buy Option`: existing component, OSS package, or commercial service
- `Validation`: tests or checks proving mitigation

## Decision Heuristics

- Prefer secure defaults over optional hardening.
- Prefer boundaries and contracts that keep failure local.
- Prefer simpler designs with less code and less custom state.
- Prefer reusing existing modules/services/features before adding dependencies.
- Prefer commercially usable OSS with strong maintenance history.
- Prefer managed services when they materially reduce security and operational burden.

## OSS License Guardrails

- Favor permissive licenses (`MIT`, `BSD-2`, `BSD-3`, `Apache-2.0`) by default.
- Flag reciprocal licenses for legal review when commercial distribution is expected (`GPL`, `AGPL`, `LGPL`, `SSPL`).
- Require explicit note on attribution/notice obligations when recommending OSS.

## Writing Rules

- Keep recommendations concrete and implementable.
- Avoid generic advice that cannot be traced to evidence.
- Prefer removing complexity over adding frameworks or abstractions.
- State assumptions explicitly when evidence is incomplete.

## References

- Load `references/review-checklists.md` for detailed criteria and severity calibration.
