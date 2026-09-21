/**
 * The scoring engine.
 *
 * Every number the UI displays comes from `evaluate()`. It is a pure function of
 * (scenario, enabled controls) with no clock, no randomness and no I/O, which is
 * why it can be tested exhaustively — see `scoring.test.ts`.
 *
 * ## The model
 *
 * Each threat has a baseline risk of `likelihood x impact` within a scenario.
 * Controls are treated as **independent partial mitigations** composed
 * multiplicatively:
 *
 *     residual(threat) = baseline(threat) * PRODUCT over enabled controls of
 *                        (1 - effectiveness[control][threat] * relevance[control])
 *
 * Multiplicative composition is the important choice. Adding effectiveness would
 * let three mediocre controls sum past 100% mitigation and claim a threat was
 * eliminated. Multiplying cannot exceed 100%, and produces diminishing returns
 * automatically: the second overlapping control is worth less than the first,
 * which is how defence in depth actually behaves.
 *
 * Relevance is the scenario's veto. A control with 0.2 relevance contributes at
 * most a fifth of its nominal strength, so spending on DDoS scrubbing to defend a
 * hybrid workforce scores poorly — correctly.
 */

import { CONTROLS, CONTROL_BY_ID, THREATS, THREAT_BY_ID } from "./catalogue";
import type {
  Control,
  ControlId,
  LikelihoodBand,
  Metrics,
  Scenario,
  ThreatId,
  ThreatOutcome,
} from "./types";

/** Mean time to detect, in hours, with no detection capability at all. */
export const BASE_MTTD_HOURS = 168; // one week
/** Mean time to respond, in hours, once something has been detected. */
export const BASE_MTTR_HOURS = 72;
/** Floors — no control set makes detection or response instantaneous. */
export const MIN_MTTD_HOURS = 0.5;
export const MIN_MTTR_HOURS = 2;
/** A threat is "covered" once this fraction of its baseline risk is removed. */
export const COVERAGE_THRESHOLD = 0.2;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** How applicable a control is in a scenario, 0..1. Defaults to fully relevant. */
export function relevanceOf(scenario: Scenario, control: ControlId): number {
  const r = scenario.controlRelevance?.[control];
  return r === undefined ? 1 : clamp(r, 0, 1);
}

function enabledControls(ids: ControlId[]): Control[] {
  // Deduplicate and ignore unknown ids rather than throwing: the UI should never
  // send them, but a stale saved state should degrade instead of crashing.
  const seen = new Set<ControlId>();
  const out: Control[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const c = CONTROL_BY_ID[id];
    if (c) out.push(c);
  }
  return out;
}

/** Baseline (unmitigated) risk for one threat in one scenario. */
export function baselineRisk(scenario: Scenario, threat: ThreatId): number {
  const w = scenario.threatMix[threat];
  if (!w) return 0;
  return w.likelihood * w.impact;
}

/**
 * The surviving fraction of a threat's risk after the enabled controls apply.
 * Returns 1 when nothing mitigates it, approaching 0 as coverage deepens.
 */
export function residualFactor(
  scenario: Scenario,
  threat: ThreatId,
  ids: ControlId[],
): number {
  let factor = 1;
  for (const c of enabledControls(ids)) {
    const eff = c.effectiveness[threat];
    if (!eff) continue;
    factor *= 1 - clamp(eff, 0, 1) * relevanceOf(scenario, c.id);
  }
  return clamp(factor, 0, 1);
}

/** Compose "fraction of time removed" gains the same multiplicative way. */
function timeAfterGains(
  base: number,
  floor: number,
  gains: number[],
): number {
  let remaining = 1;
  for (const g of gains) remaining *= 1 - clamp(g, 0, 1);
  return Math.max(floor, base * remaining);
}

function bandFor(residualRatio: number): LikelihoodBand {
  if (residualRatio < 0.2) return "Low";
  if (residualRatio < 0.45) return "Moderate";
  if (residualRatio < 0.7) return "Elevated";
  return "High";
}

/**
 * Operational burden of running a control set, 1..10.
 *
 * Costs sum, because running more tools genuinely is more work — but a
 * consolidating control (a managed service) discounts the total, since somebody
 * else is carrying the day-to-day load.
 */
export function operationalComplexity(ids: ControlId[]): number {
  const controls = enabledControls(ids);
  if (controls.length === 0) return 1;
  const raw = controls.reduce((sum, c) => sum + c.complexityCost, 0);
  const consolidating = controls.filter((c) => c.consolidates).length;
  const discount = consolidating > 0 ? 0.75 : 1;
  return clamp(round(1 + raw * discount, 1), 1, 10);
}

/** Full evaluation of one (scenario, control set) pair. */
export function evaluate(scenario: Scenario, ids: ControlId[]): Metrics {
  const controls = enabledControls(ids);

  const perThreat: ThreatOutcome[] = THREATS.filter(
    (t) => scenario.threatMix[t.id],
  ).map((t) => {
    const baseline = baselineRisk(scenario, t.id);
    const residual = baseline * residualFactor(scenario, t.id, ids);
    const reductionPct = baseline === 0 ? 0 : ((baseline - residual) / baseline) * 100;
    return {
      threat: t.id,
      baseline: round(baseline, 2),
      residual: round(residual, 2),
      reductionPct: round(reductionPct, 1),
    };
  });

  const totalBaseline = perThreat.reduce((s, o) => s + o.baseline, 0);
  const totalResidual = perThreat.reduce((s, o) => s + o.residual, 0);
  const residualRiskRatio = totalBaseline === 0 ? 0 : totalResidual / totalBaseline;

  // Availability-weighted residual, for the downtime figure the CFO cares about.
  const availThreats = perThreat.filter((o) => THREAT_BY_ID[o.threat]?.affectsAvailability);
  const availBaseline = availThreats.reduce((s, o) => s + o.baseline, 0);
  const availResidual = availThreats.reduce((s, o) => s + o.residual, 0);
  const downtimeRiskPct = availBaseline === 0 ? 0 : (availResidual / availBaseline) * 100;

  const detectionGains = controls
    .map((c) => (c.detectionGain ?? 0) * relevanceOf(scenario, c.id))
    .filter((g) => g > 0);
  const responseGains = controls
    .map((c) => (c.responseGain ?? 0) * relevanceOf(scenario, c.id))
    .filter((g) => g > 0);

  const uncovered = perThreat
    .filter((o) => o.reductionPct < COVERAGE_THRESHOLD * 100)
    .sort((a, b) => b.residual - a.residual)
    .map((o) => o.threat);

  return {
    postureScore: clamp(round((1 - residualRiskRatio) * 100), 0, 100),
    residualRiskRatio: round(residualRiskRatio, 4),
    incidentLikelihood: bandFor(residualRiskRatio),
    mttdHours: round(timeAfterGains(BASE_MTTD_HOURS, MIN_MTTD_HOURS, detectionGains), 1),
    mttrHours: round(timeAfterGains(BASE_MTTR_HOURS, MIN_MTTR_HOURS, responseGains), 1),
    downtimeRiskPct: round(downtimeRiskPct, 1),
    operationalComplexity: operationalComplexity(ids),
    perThreat,
    coveredThreats: perThreat.length - uncovered.length,
    uncoveredThreats: uncovered,
  };
}

/**
 * The single control that would remove the most remaining risk.
 * Used for the "best next move" hint — a cheap greedy step, not an optimiser.
 */
export function bestNextControl(
  scenario: Scenario,
  ids: ControlId[],
): { control: ControlId; gain: number } | null {
  const current = evaluate(scenario, ids);
  const currentRisk = current.perThreat.reduce((s, o) => s + o.residual, 0);
  let best: { control: ControlId; gain: number } | null = null;

  for (const c of CONTROLS) {
    if (ids.includes(c.id)) continue;
    const next = evaluate(scenario, [...ids, c.id]);
    const nextRisk = next.perThreat.reduce((s, o) => s + o.residual, 0);
    const gain = currentRisk - nextRisk;
    if (gain > 0 && (!best || gain > best.gain)) {
      best = { control: c.id, gain: round(gain, 2) };
    }
  }
  return best;
}

/** Format an hours figure the way an operator would say it. */
export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${round(hours, 1)} hr`;
  return `${round(hours / 24, 1)} days`;
}
