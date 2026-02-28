# Review Checklists

Use this checklist during the review workflow to ensure coverage and consistent severity.

## Application Context and Integration Overview Checklist

- Current-State Snapshot
- List core modules/services, data stores, queues, jobs, and external providers.
- Identify ownership boundaries (team/service/repo) and deployment/runtime boundaries.

- Flow and Trust Map
- Trace main request and data paths end-to-end.
- Mark trust boundaries and privilege transitions explicitly.

- Change Surface
- Identify which contracts, schemas, interfaces, or operational procedures the plan changes.
- Estimate blast radius and rollback complexity for each changed interface.

## Security Checklist

- Authentication
- Verify identity boundaries, token lifetime, rotation, and revocation strategy.
- Confirm machine-to-machine auth and service identity handling.

- Authorization
- Verify least privilege by endpoint, action, and data scope.
- Check tenant isolation and object-level authorization.

- Data Protection
- Classify sensitive data and confirm encryption in transit and at rest.
- Verify key management ownership and secret rotation.
- Check logging redaction for secrets and personal data.

- Input and Output Safety
- Check validation, normalization, and canonicalization strategy.
- Check injection risks (SQL/NoSQL/template/command/path).
- Check SSRF/open-redirect/file-fetch controls.

- Abuse and Threat Paths
- Check rate limits, quotas, and anti-automation controls.
- Check idempotency and replay protection for critical operations.
- Check privilege escalation and lateral movement possibilities.

- Dependency and Supply Chain
- Check dependency provenance, update strategy, and vulnerability scanning.
- Check third-party API trust assumptions and fallback behavior.

## Architecture and Integration Checklist

- Boundaries and Contracts
- Verify clear service/module boundaries and ownership.
- Verify API/event contract versioning and compatibility strategy.

- Failure Design
- Verify timeout, retry, circuit-breaker, and dead-letter behavior.
- Verify fallback behavior under partial outages.

- Data and State
- Verify consistency model, conflict resolution, and migration safety.
- Verify transaction boundaries and compensating actions.

- Integration Surface
- Map all external systems and credentials required.
- Identify blast radius and rollback strategy for each integration.

## Scalability and Operability Checklist

- Capacity and Performance
- Identify expected load, concurrency, and peak assumptions.
- Identify hot paths and expected bottlenecks.

- Operational Readiness
- Verify metrics, logs, traces, alerts, and SLO/SLA targets.
- Verify runbooks, on-call ownership, and incident response paths.

- Cost and Efficiency
- Estimate cost drivers (compute, storage, network, 3rd-party billing).
- Prefer architecture choices with predictable scaling behavior.

## Reuse, Simplicity, Minimal-Code Checklist

- Reuse First
- Check whether existing internal modules/services already solve the need.
- Check whether platform-native features can replace custom logic.
- Check whether the proposed feature can be composed from existing capabilities with minimal glue code.

- Minimal Code
- Prefer configuration over code where appropriate.
- Prefer deleting or consolidating duplicate logic.
- Reject speculative abstractions without near-term use.

- Maintainability
- Verify complexity growth, coupling, and cognitive load.
- Verify testability and local debuggability.

## OSS and Commercial Build-vs-Buy Checklist

- Candidate Evaluation
- Prefer mature OSS with active maintenance and stable release cadence.
- Verify license is commercially usable for the project.
- Verify security track record and upgrade path.
- Prefer permissive licenses by default (MIT, BSD, Apache-2.0) unless requirements justify otherwise.

- Legal and Compliance
- Flag licenses needing legal review (for example AGPL, strong copyleft cases).
- Record attribution/notice obligations where applicable.

- Operational Fit
- Compare in-house implementation cost vs integration and maintenance cost.
- Prefer solutions with lower long-term operational burden.

## Severity Calibration

- Critical: plausible high-impact compromise/outage with no meaningful compensating control.
- High: significant security or reliability risk likely to materialize under realistic conditions.
- Medium: meaningful weakness with limited blast radius or strong partial controls.
- Low: minor weakness, hygiene gap, or optimization opportunity.

When uncertain between two severities, choose the higher one and state the assumption explicitly.
