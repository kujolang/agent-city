/* Generated from event.schema.json. Run npm run generate. */

export type CityEvent =
  | {
      schema: "agent-city.event.v1";
      eventId: string;
      workspace: "local-agent-city";
      source: string;
      order: number;
      occurredAt: number | null;
      observedAt: number;
      completeness: "complete" | "partial" | "unknown";
      /**
       * @minItems 1
       * @maxItems 24
       */
      evidence: [
        {
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        },
        ...{
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        }[],
      ];
      type: "operation.started";
      instance: string;
      profile: string;
      run: {
        namespace: string;
        id: string;
      };
      task: {
        namespace: string;
        id: string;
      };
      operation: {
        id: string;
        attempt: number;
        capability:
          | "agent.run"
          | "rag.query"
          | "tool.execute"
          | "evaluation.run"
          | "agent.handoff"
          | "execution.run";
        collection:
          | "kujo-docs"
          | "repo-source"
          | "project-rag"
          | "previous-runs"
          | "external-research"
          | "unknown";
        outcome:
          | "unset"
          | "succeeded"
          | "failed"
          | "canceled"
          | "skipped"
          | "unknown";
        relatedAgent?: string;
      };
    }
  | {
      schema: "agent-city.event.v1";
      eventId: string;
      workspace: "local-agent-city";
      source: string;
      order: number;
      occurredAt: number | null;
      observedAt: number;
      completeness: "complete" | "partial" | "unknown";
      /**
       * @minItems 1
       * @maxItems 24
       */
      evidence: [
        {
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        },
        ...{
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        }[],
      ];
      type: "operation.finished";
      instance: string;
      profile: string;
      run: {
        namespace: string;
        id: string;
      };
      task: {
        namespace: string;
        id: string;
      };
      operation: {
        id: string;
        attempt: number;
        capability:
          | "agent.run"
          | "rag.query"
          | "tool.execute"
          | "evaluation.run"
          | "agent.handoff"
          | "execution.run";
        collection:
          | "kujo-docs"
          | "repo-source"
          | "project-rag"
          | "previous-runs"
          | "external-research"
          | "unknown";
        outcome:
          | "unset"
          | "succeeded"
          | "failed"
          | "canceled"
          | "skipped"
          | "unknown";
        relatedAgent?: string;
      };
    }
  | {
      schema: "agent-city.event.v1";
      eventId: string;
      workspace: "local-agent-city";
      source: string;
      order: number;
      occurredAt: number | null;
      observedAt: number;
      completeness: "complete" | "partial" | "unknown";
      /**
       * @minItems 1
       * @maxItems 24
       */
      evidence: [
        {
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        },
        ...{
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        }[],
      ];
      type: "operation.failed";
      instance: string;
      profile: string;
      run: {
        namespace: string;
        id: string;
      };
      task: {
        namespace: string;
        id: string;
      };
      operation: {
        id: string;
        attempt: number;
        capability:
          | "agent.run"
          | "rag.query"
          | "tool.execute"
          | "evaluation.run"
          | "agent.handoff"
          | "execution.run";
        collection:
          | "kujo-docs"
          | "repo-source"
          | "project-rag"
          | "previous-runs"
          | "external-research"
          | "unknown";
        outcome:
          | "unset"
          | "succeeded"
          | "failed"
          | "canceled"
          | "skipped"
          | "unknown";
        relatedAgent?: string;
      };
    }
  | {
      schema: "agent-city.event.v1";
      eventId: string;
      workspace: "local-agent-city";
      source: string;
      order: number;
      occurredAt: number | null;
      observedAt: number;
      completeness: "complete" | "partial" | "unknown";
      /**
       * @minItems 1
       * @maxItems 24
       */
      evidence: [
        {
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        },
        ...{
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        }[],
      ];
      type: "source.gap";
      reason:
        | "disconnect"
        | "overflow"
        | "schema"
        | "retention"
        | "manual-reset"
        | "reconciled";
    }
  | {
      schema: "agent-city.event.v1";
      eventId: string;
      workspace: "local-agent-city";
      source: string;
      order: number;
      occurredAt: number | null;
      observedAt: number;
      completeness: "complete" | "partial" | "unknown";
      /**
       * @minItems 1
       * @maxItems 24
       */
      evidence: [
        {
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        },
        ...{
          recordId: string;
          hash: string;
          sourceSequence: number;
          origin: "canonical" | "gateway-diagnostic";
        }[],
      ];
      type: "source.reconciled";
      reason:
        | "disconnect"
        | "overflow"
        | "schema"
        | "retention"
        | "manual-reset"
        | "reconciled";
    };
