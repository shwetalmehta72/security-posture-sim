/**
 * Domain model for the security posture simulator.
 *
 * The model is deliberately small and data-driven: threats, controls, scenarios
 * and personas are plain data, and every number the UI shows is derived from
 * them by pure functions in `scoring.ts`. Nothing is hardcoded in a component.
 */

export type ThreatId =
  | "phishing"
  | "ransomware"
  | "ddos"
  | "web-exploit"
  | "lateral-movement"
  | "data-exfiltration"
  | "insider"
  | "cloud-misconfig"
  | "supply-chain";

export type ControlId =
  | "sdwan"
  | "swg"
  | "fwaas"
  | "ddos-mitigation"
  | "ztna"
  | "casb"
  | "cspm"
  | "dlp"
  | "email-security"
  | "mfa"
  | "edr"
  | "mdr"
  | "siem"
  | "asm"
  | "awareness-training";

export type ScenarioId =
  | "hybrid-workforce"
  | "public-web-app"
  | "multi-cloud"
  | "ma-integration";

export type PersonaId = "ciso" | "cfo" | "network-architect" | "soc-manager";

export type ControlCategory =
  | "network-edge"
  | "cloud-data"
  | "identity-endpoint"
  | "detection-response"
  | "governance";

export type NodeKind =
  | "internet"
  | "user"
  | "edge"
  | "datacentre"
  | "cloud"
  | "saas";

export interface Threat {
  id: ThreatId;
  name: string;
  description: string;
  /** True when the threat's primary business consequence is downtime rather than loss or exposure. */
  affectsAvailability: boolean;
  /** Token key resolved to a colour in the UI, not a raw hex value. */
  tone: "red" | "amber" | "violet" | "cyan" | "lime";
}

export interface Control {
  id: ControlId;
  name: string;
  shortName: string;
  category: ControlCategory;
  description: string;
  /** Topology node this control visibly attaches to. */
  placement: string;
  /**
   * Mitigation strength against each threat, 0..1. An absent threat means the
   * control does nothing for it. These are illustrative judgements, not
   * measured efficacy — see the README.
   */
  effectiveness: Partial<Record<ThreatId, number>>;
  /** Operational burden this control adds, 0..3. Managed options cost less. */
  complexityCost: number;
  /** Fraction of mean time to detect this control removes, 0..1. */
  detectionGain?: number;
  /** Fraction of mean time to respond this control removes, 0..1. */
  responseGain?: number;
  /** Set when the control consolidates operations rather than adding to them. */
  consolidates?: boolean;
}

/** Baseline exposure for one threat inside one scenario. Both 1..5. */
export interface ThreatWeighting {
  likelihood: number;
  impact: number;
}

export interface TopologyNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Layout coordinates in an abstract 0..100 space. */
  x: number;
  y: number;
}

export interface TopologyLink {
  from: string;
  to: string;
}

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  /** One sentence on what makes this estate hard to defend. */
  narrative: string;
  defaultControls: ControlId[];
  threatMix: Record<ThreatId, ThreatWeighting>;
  topology: { nodes: TopologyNode[]; links: TopologyLink[] };
  /**
   * How applicable each control is here, 0..1. Omitted controls default to 1.
   * This is what stops a cloud control from scoring well in an on-premises estate.
   */
  controlRelevance?: Partial<Record<ControlId, number>>;
}

export type LikelihoodBand = "Low" | "Moderate" | "Elevated" | "High";

export interface ThreatOutcome {
  threat: ThreatId;
  baseline: number;
  residual: number;
  /** Percentage of baseline risk removed, 0..100. */
  reductionPct: number;
}

export interface Metrics {
  /** 0..100. Share of baseline risk removed by the enabled control set. */
  postureScore: number;
  /** 0..1. Residual risk as a fraction of the unprotected baseline. */
  residualRiskRatio: number;
  incidentLikelihood: LikelihoodBand;
  mttdHours: number;
  mttrHours: number;
  /** 0..100. Weighted residual risk of the availability-affecting threats. */
  downtimeRiskPct: number;
  /** 1..10. Operational burden of running this control set. */
  operationalComplexity: number;
  perThreat: ThreatOutcome[];
  /** Threats with at least a 20% risk reduction. */
  coveredThreats: number;
  /** Threats with less than a 20% risk reduction, worst first. */
  uncoveredThreats: ThreatId[];
}

export interface Persona {
  id: PersonaId;
  name: string;
  role: string;
  /** What this stakeholder actually cares about. */
  focus: string;
  /** Metrics surfaced first for this persona. */
  focusMetrics: Array<keyof Metrics>;
  /** The same simulation state, argued in this stakeholder's terms. */
  narrative: (ctx: NarrativeContext) => string;
}

export interface NarrativeContext {
  metrics: Metrics;
  scenario: Scenario;
  enabled: ControlId[];
  /** Resolved names of the biggest remaining gaps, already sorted worst-first. */
  topGaps: string[];
}
