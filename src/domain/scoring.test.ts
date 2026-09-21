import { describe, expect, it } from "vitest";

import { CONTROLS, CONTROL_BY_ID, THREATS } from "./catalogue";
import { SCENARIOS, SCENARIO_BY_ID } from "./scenarios";
import {
  BASE_MTTD_HOURS,
  BASE_MTTR_HOURS,
  MIN_MTTD_HOURS,
  bestNextControl,
  evaluate,
  formatDuration,
  operationalComplexity,
  relevanceOf,
  residualFactor,
} from "./scoring";
import type { ControlId } from "./types";

const ALL_CONTROLS = CONTROLS.map((c) => c.id);
const hybrid = SCENARIO_BY_ID["hybrid-workforce"];
const webApp = SCENARIO_BY_ID["public-web-app"];

describe("catalogue integrity", () => {
  it("has unique control ids", () => {
    expect(new Set(ALL_CONTROLS).size).toBe(ALL_CONTROLS.length);
  });

  it("has unique threat ids", () => {
    const ids = THREATS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references known threats in control effectiveness", () => {
    const known = new Set(THREATS.map((t) => t.id));
    for (const c of CONTROLS) {
      for (const threat of Object.keys(c.effectiveness)) {
        expect(known, `${c.id} references unknown threat ${threat}`).toContain(threat);
      }
    }
  });

  it("keeps every effectiveness value inside 0..1", () => {
    for (const c of CONTROLS) {
      for (const [threat, v] of Object.entries(c.effectiveness)) {
        expect(v, `${c.id}/${threat}`).toBeGreaterThan(0);
        expect(v, `${c.id}/${threat}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("gives every scenario a weighting for every threat", () => {
    for (const s of SCENARIOS) {
      for (const t of THREATS) {
        expect(s.threatMix[t.id], `${s.id} missing ${t.id}`).toBeDefined();
      }
    }
  });

  it("only lists known controls as scenario defaults", () => {
    for (const s of SCENARIOS) {
      for (const id of s.defaultControls) {
        expect(CONTROL_BY_ID[id], `${s.id} default ${id}`).toBeDefined();
      }
    }
  });

  it("keeps every topology link pointing at a declared node", () => {
    for (const s of SCENARIOS) {
      const nodes = new Set(s.topology.nodes.map((n) => n.id));
      for (const l of s.topology.links) {
        expect(nodes, `${s.id}: ${l.from}`).toContain(l.from);
        expect(nodes, `${s.id}: ${l.to}`).toContain(l.to);
      }
    }
  });
});

describe("evaluate — boundaries", () => {
  it("scores 0 with no controls and reports every threat uncovered", () => {
    const m = evaluate(hybrid, []);
    expect(m.postureScore).toBe(0);
    expect(m.residualRiskRatio).toBe(1);
    expect(m.incidentLikelihood).toBe("High");
    expect(m.coveredThreats).toBe(0);
    expect(m.uncoveredThreats).toHaveLength(THREATS.length);
  });

  it("never reaches 100 even with every control enabled", () => {
    for (const s of SCENARIOS) {
      const m = evaluate(s, ALL_CONTROLS);
      expect(m.postureScore).toBeLessThan(100);
      expect(m.postureScore).toBeGreaterThan(0);
      expect(m.residualRiskRatio).toBeGreaterThan(0);
    }
  });

  it("keeps posture within 0..100 for every scenario and control subset size", () => {
    for (const s of SCENARIOS) {
      for (let n = 0; n <= ALL_CONTROLS.length; n++) {
        const m = evaluate(s, ALL_CONTROLS.slice(0, n));
        expect(m.postureScore).toBeGreaterThanOrEqual(0);
        expect(m.postureScore).toBeLessThanOrEqual(100);
      }
    }
  });

  it("is monotonic — adding a control never lowers the posture score", () => {
    for (const s of SCENARIOS) {
      let previous = evaluate(s, []).postureScore;
      const acc: ControlId[] = [];
      for (const id of ALL_CONTROLS) {
        acc.push(id);
        const score = evaluate(s, acc).postureScore;
        expect(score, `${s.id} after ${id}`).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    }
  });

  it("is order-independent", () => {
    const forward = evaluate(hybrid, ALL_CONTROLS);
    const reversed = evaluate(hybrid, [...ALL_CONTROLS].reverse());
    expect(reversed.postureScore).toBe(forward.postureScore);
    expect(reversed.residualRiskRatio).toBe(forward.residualRiskRatio);
  });

  it("ignores duplicates rather than double-counting mitigation", () => {
    const once = evaluate(hybrid, ["mfa"]);
    const twice = evaluate(hybrid, ["mfa", "mfa", "mfa"]);
    expect(twice.postureScore).toBe(once.postureScore);
  });

  it("ignores unknown control ids instead of throwing", () => {
    const m = evaluate(hybrid, ["mfa", "not-a-real-control" as ControlId]);
    expect(m.postureScore).toBe(evaluate(hybrid, ["mfa"]).postureScore);
  });
});

describe("residualFactor — multiplicative composition", () => {
  it("cannot be driven below zero by overlapping controls", () => {
    for (const t of THREATS) {
      const f = residualFactor(hybrid, t.id, ALL_CONTROLS);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("composes two controls as (1-a)(1-b), not a+b", () => {
    // email-security is 0.55 against phishing; mfa is 0.60. Additive would be
    // 1.15 -> a claim of total elimination. Multiplicative leaves 18% standing.
    const f = residualFactor(hybrid, "phishing", ["email-security", "mfa"]);
    expect(f).toBeCloseTo((1 - 0.55) * (1 - 0.6), 5);
    expect(f).toBeGreaterThan(0);
  });

  it("shows diminishing returns — the second control adds less than the first", () => {
    const base = residualFactor(hybrid, "phishing", []);
    const one = residualFactor(hybrid, "phishing", ["mfa"]);
    const two = residualFactor(hybrid, "phishing", ["mfa", "email-security"]);
    expect(base - one).toBeGreaterThan(one - two);
  });

  it("leaves a threat untouched when no enabled control addresses it", () => {
    // DDoS mitigation does nothing about insider misuse.
    expect(residualFactor(hybrid, "insider", ["ddos-mitigation"])).toBe(1);
  });
});

describe("scenario relevance", () => {
  it("defaults to fully relevant when unspecified", () => {
    expect(relevanceOf(hybrid, "mfa")).toBe(1);
  });

  it("discounts a control the scenario marks as barely applicable", () => {
    expect(relevanceOf(hybrid, "ddos-mitigation")).toBe(0.2);
  });

  it("makes the same control worth more where it belongs", () => {
    // DDoS scrubbing is near-irrelevant to a hybrid workforce and decisive for a
    // public web application. Same control, same catalogue entry.
    const hybridGain =
      evaluate(hybrid, ["ddos-mitigation"]).postureScore - evaluate(hybrid, []).postureScore;
    const webGain =
      evaluate(webApp, ["ddos-mitigation"]).postureScore - evaluate(webApp, []).postureScore;
    expect(webGain).toBeGreaterThan(hybridGain * 3);
  });
});

describe("detection and response timing", () => {
  it("falls back to the unmonitored baseline with no detective controls", () => {
    const m = evaluate(hybrid, ["mfa"]); // MFA is preventive only
    expect(m.mttdHours).toBe(BASE_MTTD_HOURS);
    expect(m.mttrHours).toBe(BASE_MTTR_HOURS);
  });

  it("shortens detection when a detective control is enabled", () => {
    const before = evaluate(hybrid, []).mttdHours;
    const after = evaluate(hybrid, ["mdr"]).mttdHours;
    expect(after).toBeLessThan(before);
  });

  it("never claims instantaneous detection", () => {
    const m = evaluate(hybrid, ALL_CONTROLS);
    expect(m.mttdHours).toBeGreaterThanOrEqual(MIN_MTTD_HOURS);
    expect(m.mttrHours).toBeGreaterThan(0);
  });
});

describe("operational complexity", () => {
  it("is minimal with nothing enabled", () => {
    expect(operationalComplexity([])).toBe(1);
  });

  it("rises as controls are added", () => {
    expect(operationalComplexity(["siem"])).toBeGreaterThan(operationalComplexity(["mfa"]));
  });

  it("is discounted when a managed service consolidates operations", () => {
    // Same nominal cost, but MDR carries the load, so the total is lower than
    // the sum of the parts would suggest.
    const withManaged = operationalComplexity(["siem", "edr", "mdr"]);
    const unmanagedEquivalent = 1 + (3 + 1.5 + 0.5);
    expect(withManaged).toBeLessThan(unmanagedEquivalent);
  });

  it("stays within 1..10 even with everything enabled", () => {
    const c = operationalComplexity(ALL_CONTROLS);
    expect(c).toBeGreaterThanOrEqual(1);
    expect(c).toBeLessThanOrEqual(10);
  });
});

describe("coverage accounting", () => {
  it("counts covered plus uncovered as the full threat list", () => {
    for (const s of SCENARIOS) {
      const m = evaluate(s, ["mfa", "edr"]);
      expect(m.coveredThreats + m.uncoveredThreats.length).toBe(THREATS.length);
    }
  });

  it("orders remaining gaps by residual risk, worst first", () => {
    const m = evaluate(hybrid, []);
    const residualByThreat = new Map(m.perThreat.map((o) => [o.threat, o.residual]));
    const gaps = m.uncoveredThreats.map((t) => residualByThreat.get(t) ?? 0);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1]).toBeGreaterThanOrEqual(gaps[i]);
    }
  });
});

describe("bestNextControl", () => {
  it("suggests DDoS scrubbing first for an undefended public web application", () => {
    // Highest baseline risk there is volumetric DDoS at 5x5, and scrubbing is
    // 0.85 effective against it. Nothing else removes as much in one step.
    expect(bestNextControl(webApp, [])?.control).toBe("ddos-mitigation");
  });

  it("returns null once every control is enabled", () => {
    expect(bestNextControl(hybrid, ALL_CONTROLS)).toBeNull();
  });

  it("never suggests a control that is already enabled", () => {
    const enabled: ControlId[] = ["mfa", "edr"];
    expect(enabled).not.toContain(bestNextControl(hybrid, enabled)?.control);
  });
});

describe("formatDuration", () => {
  it("uses minutes below an hour", () => {
    expect(formatDuration(0.5)).toBe("30 min");
  });

  it("uses hours in the working range", () => {
    expect(formatDuration(6)).toBe("6 hr");
  });

  it("switches to days beyond two", () => {
    expect(formatDuration(168)).toBe("7 days");
  });
});
