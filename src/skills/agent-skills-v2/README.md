# Marketing Agent Skills

This folder contains six production-oriented agent skill definitions:

1. `agent-strategy.md`
2. `agent-copywriter.md`
3. `agent-design.md`
4. `agent-publisher.md`
5. `agent-ads.md`
6. `agent-crm.md`

## Recommended orchestration

The agents should not all run in one uninterrupted chain.

Recommended primary flow:

```text
Campaign Brief
→ Strategy Agent
→ Human Approval
→ Copywriter Agent
→ Human Approval
→ Design Agent
→ Asset Generation / Human Design
→ Human Approval
→ Publisher Agent
```

Paid-media branch:

```text
Approved Copy + Approved Asset + Budget
→ Ads Agent
→ Human Approval
→ Ads Platform Adapter
```

Analytics and CRM branch:

```text
Performance Logs
→ CRM Agent: Campaign Evaluation
→ Strategy Revision Decision
```

```text
New Lead Trigger
→ CRM Agent: Lead Follow-Up
→ Human or Workflow Approval
→ CRM Message Adapter
```

## Important architectural rule

The LLM agent should produce a recommendation or structured payload.

Deterministic application services should handle:

- authentication;
- authorization;
- budget enforcement;
- file validation;
- scheduling;
- publishing;
- webhooks;
- database writes;
- API calls;
- idempotency;
- retries;
- audit logs.

## Schema recommendation

The JSON examples inside each skill are semantic contracts.

In the Node.js application, create a separate strict JSON Schema or Zod schema for each output. Do not rely only on prompt instructions.
