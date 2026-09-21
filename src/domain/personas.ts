/**
 * The four-persona narrative model.
 *
 * This is the core idea of the simulator. The simulation state is computed once;
 * each persona then argues that *same* state in its own terms, surfacing
 * different metrics and reaching a different conclusion about what to do next.
 *
 * A CISO reading "posture 46, four threats uncovered" and a CFO reading
 * "downtime risk 62%, three tools to run" are looking at one set of numbers. The
 * point is that neither framing is the real one — the technical state is the same
 * and the argument that lands depends entirely on who is listening.
 */

import { CONTROL_BY_ID } from "./catalogue";
import { formatDuration } from "./scoring";
import type { NarrativeContext, Persona } from "./types";

function list(items: string[], conjunction = "and"): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

function countOf(ctx: NarrativeContext): number {
  return ctx.enabled.filter((id) => CONTROL_BY_ID[id]).length;
}

export const PERSONAS: Persona[] = [
  {
    id: "ciso",
    name: "CISO",
    role: "Chief Information Security Officer",
    focus:
      "Residual risk and defensibility. Can this posture be explained to a board and survive an incident review?",
    focusMetrics: ["postureScore", "coveredThreats", "uncoveredThreats", "incidentLikelihood"],
    narrative: (ctx) => {
      const { metrics: m, scenario } = ctx;
      const n = countOf(ctx);

      if (n === 0) {
        return `Nothing is deployed, so every one of the ${m.perThreat.length} threats in the ${scenario.name.toLowerCase()} model is running at full baseline risk. This is not a posture I could defend in an incident review — there is no control to point at and no telemetry to reconstruct what happened.`;
      }

      const gapClause =
        m.uncoveredThreats.length === 0
          ? "Every modelled threat now has meaningful coverage, which is a defensible place to be."
          : `${m.uncoveredThreats.length} of ${m.perThreat.length} threats remain effectively uncovered — ${list(ctx.topGaps)}. Those are the answers I do not have yet.`;

      return `Posture is ${m.postureScore} of 100, leaving ${Math.round(m.residualRiskRatio * 100)}% of baseline risk standing and an incident likelihood I would characterise as ${m.incidentLikelihood.toLowerCase()}. ${gapClause} Detection currently sits at ${formatDuration(m.mttdHours)} — the number that decides whether an intrusion becomes an incident or a breach.`;
    },
  },

  {
    id: "cfo",
    name: "CFO",
    role: "Chief Financial Officer",
    focus:
      "Loss exposure against spend. What does an outage cost, and how many things are we paying to run?",
    focusMetrics: ["downtimeRiskPct", "operationalComplexity", "mttrHours", "postureScore"],
    narrative: (ctx) => {
      const { metrics: m } = ctx;
      const n = countOf(ctx);

      if (n === 0) {
        return `We are carrying the full loss exposure with no offsetting spend. Downtime risk sits at ${m.downtimeRiskPct}% of the modelled worst case, and recovery would take ${formatDuration(m.mttrHours)} — that duration is the number that shows up in lost revenue, not the security score.`;
      }

      const burden =
        m.operationalComplexity <= 4
          ? `Operational burden is light at ${m.operationalComplexity} of 10 — this is a posture we can actually staff.`
          : m.operationalComplexity <= 7
            ? `Operational burden is ${m.operationalComplexity} of 10, which is real but manageable; it is worth asking whether every tool is earning its keep.`
            : `Operational burden is ${m.operationalComplexity} of 10. We are buying tools faster than we are buying the capacity to run them, and unmonitored tooling is spend without risk reduction.`;

      const managed = ctx.enabled.includes("mdr")
        ? " Outsourcing monitoring is doing real work here: it is the reason the burden figure is not higher."
        : " There is no managed monitoring in place, so every one of these tools consumes our own people's time.";

      return `Downtime risk is ${m.downtimeRiskPct}% of the modelled worst case and mean recovery is ${formatDuration(m.mttrHours)}, which is the figure that converts directly into lost revenue. ${burden}${managed} We have removed ${m.postureScore}% of baseline risk for ${n} ${n === 1 ? "control" : "controls"}.`;
    },
  },

  {
    id: "network-architect",
    name: "Network Architect",
    role: "Principal Network & Infrastructure Architect",
    focus:
      "Where controls sit, what they actually contain, and whether the topology still makes sense.",
    focusMetrics: ["postureScore", "perThreat", "operationalComplexity"],
    narrative: (ctx) => {
      const { metrics: m, scenario } = ctx;
      const n = countOf(ctx);

      if (n === 0) {
        return `The topology is flat and unmediated: ${scenario.topology.links.length} paths between ${scenario.topology.nodes.length} zones with nothing enforcing policy on any of them. ${scenario.narrative}`;
      }

      const placements = [...new Set(ctx.enabled.map((id) => CONTROL_BY_ID[id]?.placement).filter(Boolean))];
      const lateral = m.perThreat.find((o) => o.threat === "lateral-movement");
      const lateralClause = lateral
        ? lateral.reductionPct < 30
          ? `Lateral movement is only down ${lateral.reductionPct}% — the estate is still effectively flat once an attacker is inside, and that is a segmentation problem, not a detection one.`
          : `Lateral movement is down ${lateral.reductionPct}%, so a foothold no longer implies free reach across the estate.`
        : "";

      return `Controls are enforcing at ${placements.length} of ${scenario.topology.nodes.length} points in the topology (${list(placements)}). ${lateralClause} ${scenario.narrative} Complexity is ${m.operationalComplexity} of 10 — every additional enforcement point is another place a change can break traffic.`;
    },
  },

  {
    id: "soc-manager",
    name: "SOC Manager",
    role: "Security Operations Centre Manager",
    focus:
      "Detection and response time, telemetry coverage, and whether the team can keep up with the alerts.",
    focusMetrics: ["mttdHours", "mttrHours", "operationalComplexity", "uncoveredThreats"],
    narrative: (ctx) => {
      const { metrics: m } = ctx;
      const hasTelemetry = ctx.enabled.some((id) =>
        ["edr", "siem", "mdr", "cspm", "asm"].includes(id),
      );

      if (!hasTelemetry) {
        return `We have no detective capability at all. Mean time to detect is the unmonitored baseline of ${formatDuration(m.mttdHours)}, which in practice means we learn about incidents from someone outside the organisation. Preventive controls without telemetry leave us unable to confirm whether they are working.`;
      }

      const staffing = ctx.enabled.includes("mdr")
        ? "Round-the-clock coverage is in place, so detection does not depend on who is awake."
        : "Coverage is business-hours only in practice — an intrusion starting on Friday evening runs until Monday.";

      const alertLoad =
        m.operationalComplexity >= 7
          ? " Alert volume at this tooling level will exceed what the current team can triage; expect real detections to be lost in the noise."
          : "";

      return `Mean time to detect is ${formatDuration(m.mttdHours)} and mean time to respond is ${formatDuration(m.mttrHours)}. ${staffing}${alertLoad} ${m.uncoveredThreats.length > 0 ? `We have no meaningful visibility into ${list(ctx.topGaps)} — those would reach impact before we saw them.` : "Every modelled threat has some detective coverage."}`;
    },
  },
];

export const PERSONA_BY_ID: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.id, p]),
);
