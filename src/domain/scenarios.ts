/**
 * The four enterprise scenarios.
 *
 * A scenario is three things: a topology to draw, a threat mix describing what
 * that shape of estate is actually exposed to, and a relevance map that stops
 * controls from scoring where they do not apply. The relevance map is what makes
 * the simulation non-trivial — without it, enabling everything is always right.
 */

import type { Scenario } from "./types";

export const SCENARIOS: Scenario[] = [
  {
    id: "hybrid-workforce",
    name: "Hybrid Workforce",
    description:
      "Most staff split time between home and office. Applications are mostly SaaS, and the corporate network is no longer where work happens.",
    narrative:
      "The perimeter is the identity, not the building — so controls that only inspect office traffic protect a shrinking fraction of the estate.",
    defaultControls: ["mfa", "email-security"],
    threatMix: {
      phishing: { likelihood: 5, impact: 4 },
      ransomware: { likelihood: 3, impact: 5 },
      ddos: { likelihood: 1, impact: 2 },
      "web-exploit": { likelihood: 2, impact: 3 },
      "lateral-movement": { likelihood: 3, impact: 4 },
      "data-exfiltration": { likelihood: 3, impact: 4 },
      insider: { likelihood: 3, impact: 3 },
      "cloud-misconfig": { likelihood: 2, impact: 3 },
      "supply-chain": { likelihood: 2, impact: 3 },
    },
    controlRelevance: {
      "ddos-mitigation": 0.2,
      cspm: 0.5,
      fwaas: 0.6,
      sdwan: 0.5,
    },
    topology: {
      nodes: [
        { id: "internet", label: "Internet", kind: "internet", x: 50, y: 8 },
        { id: "users", label: "Remote & Office Staff", kind: "user", x: 18, y: 38 },
        { id: "edge", label: "Office Edge", kind: "edge", x: 50, y: 42 },
        { id: "saas", label: "SaaS Suite", kind: "saas", x: 82, y: 38 },
        { id: "datacentre", label: "Legacy Apps", kind: "datacentre", x: 50, y: 76 },
        { id: "soc", label: "Monitoring", kind: "cloud", x: 82, y: 76 },
      ],
      links: [
        { from: "internet", to: "users" },
        { from: "internet", to: "edge" },
        { from: "internet", to: "saas" },
        { from: "users", to: "saas" },
        { from: "users", to: "edge" },
        { from: "edge", to: "datacentre" },
        { from: "saas", to: "soc" },
        { from: "datacentre", to: "soc" },
      ],
    },
  },

  {
    id: "public-web-app",
    name: "Public Web Application",
    description:
      "A revenue-generating application exposed directly to the internet, with a database behind it and a small operations team.",
    narrative:
      "Availability is the business metric here — an outage is lost revenue per minute, which changes the ranking of every control.",
    defaultControls: ["fwaas"],
    threatMix: {
      phishing: { likelihood: 2, impact: 3 },
      ransomware: { likelihood: 2, impact: 4 },
      ddos: { likelihood: 5, impact: 5 },
      "web-exploit": { likelihood: 5, impact: 5 },
      "lateral-movement": { likelihood: 2, impact: 4 },
      "data-exfiltration": { likelihood: 4, impact: 5 },
      insider: { likelihood: 1, impact: 3 },
      "cloud-misconfig": { likelihood: 3, impact: 4 },
      "supply-chain": { likelihood: 3, impact: 4 },
    },
    controlRelevance: {
      ztna: 0.4,
      casb: 0.3,
      "awareness-training": 0.4,
      sdwan: 0.3,
      "email-security": 0.5,
    },
    topology: {
      nodes: [
        { id: "internet", label: "Internet", kind: "internet", x: 50, y: 8 },
        { id: "edge", label: "Application Edge", kind: "edge", x: 50, y: 34 },
        { id: "cloud", label: "App Tier", kind: "cloud", x: 30, y: 62 },
        { id: "datacentre", label: "Database", kind: "datacentre", x: 66, y: 62 },
        { id: "users", label: "Operations Team", kind: "user", x: 14, y: 34 },
        { id: "saas", label: "Third-Party APIs", kind: "saas", x: 86, y: 34 },
        { id: "soc", label: "Monitoring", kind: "cloud", x: 50, y: 88 },
      ],
      links: [
        { from: "internet", to: "edge" },
        { from: "edge", to: "cloud" },
        { from: "cloud", to: "datacentre" },
        { from: "users", to: "edge" },
        { from: "internet", to: "saas" },
        { from: "saas", to: "cloud" },
        { from: "cloud", to: "soc" },
        { from: "datacentre", to: "soc" },
      ],
    },
  },

  {
    id: "multi-cloud",
    name: "Multi-Cloud Estate",
    description:
      "Workloads across two public clouds plus remaining on-premises systems, with separate teams and no single configuration standard.",
    narrative:
      "Nobody can name every asset, so the first problem is discovery — you cannot protect an estate you have not finished enumerating.",
    defaultControls: ["mfa", "cspm"],
    threatMix: {
      phishing: { likelihood: 4, impact: 4 },
      ransomware: { likelihood: 3, impact: 5 },
      ddos: { likelihood: 2, impact: 3 },
      "web-exploit": { likelihood: 3, impact: 4 },
      "lateral-movement": { likelihood: 4, impact: 5 },
      "data-exfiltration": { likelihood: 4, impact: 5 },
      insider: { likelihood: 3, impact: 4 },
      "cloud-misconfig": { likelihood: 5, impact: 5 },
      "supply-chain": { likelihood: 3, impact: 4 },
    },
    controlRelevance: {
      "ddos-mitigation": 0.5,
    },
    topology: {
      nodes: [
        { id: "internet", label: "Internet", kind: "internet", x: 50, y: 8 },
        { id: "users", label: "Engineering Teams", kind: "user", x: 14, y: 40 },
        { id: "edge", label: "Shared Edge", kind: "edge", x: 50, y: 36 },
        { id: "cloud", label: "Cloud A", kind: "cloud", x: 30, y: 66 },
        { id: "cloud-b", label: "Cloud B", kind: "cloud", x: 58, y: 66 },
        { id: "datacentre", label: "On-Premises", kind: "datacentre", x: 86, y: 66 },
        { id: "saas", label: "SaaS", kind: "saas", x: 86, y: 40 },
        { id: "soc", label: "Central Monitoring", kind: "cloud", x: 50, y: 90 },
      ],
      links: [
        { from: "internet", to: "edge" },
        { from: "internet", to: "users" },
        { from: "internet", to: "saas" },
        { from: "users", to: "edge" },
        { from: "edge", to: "cloud" },
        { from: "edge", to: "cloud-b" },
        { from: "edge", to: "datacentre" },
        { from: "cloud", to: "cloud-b" },
        { from: "cloud", to: "soc" },
        { from: "cloud-b", to: "soc" },
        { from: "datacentre", to: "soc" },
      ],
    },
  },

  {
    id: "ma-integration",
    name: "M&A Integration",
    description:
      "A recently acquired business is being connected to the parent estate before its security posture has been assessed.",
    narrative:
      "You have inherited an unknown network and connected it to a known one — every trust relationship is now a question mark.",
    defaultControls: [],
    threatMix: {
      phishing: { likelihood: 4, impact: 4 },
      ransomware: { likelihood: 4, impact: 5 },
      ddos: { likelihood: 2, impact: 3 },
      "web-exploit": { likelihood: 3, impact: 4 },
      "lateral-movement": { likelihood: 5, impact: 5 },
      "data-exfiltration": { likelihood: 3, impact: 4 },
      insider: { likelihood: 4, impact: 4 },
      "cloud-misconfig": { likelihood: 4, impact: 4 },
      "supply-chain": { likelihood: 5, impact: 5 },
    },
    controlRelevance: {
      "ddos-mitigation": 0.3,
      dlp: 0.7,
    },
    topology: {
      nodes: [
        { id: "internet", label: "Internet", kind: "internet", x: 50, y: 8 },
        { id: "users", label: "Combined Workforce", kind: "user", x: 16, y: 40 },
        { id: "edge", label: "Interconnect", kind: "edge", x: 50, y: 40 },
        { id: "datacentre", label: "Parent Estate", kind: "datacentre", x: 28, y: 70 },
        { id: "acquired", label: "Acquired Estate", kind: "datacentre", x: 72, y: 70 },
        { id: "saas", label: "Duplicated SaaS", kind: "saas", x: 84, y: 40 },
        { id: "soc", label: "Monitoring (Parent Only)", kind: "cloud", x: 50, y: 92 },
      ],
      links: [
        { from: "internet", to: "edge" },
        { from: "internet", to: "users" },
        { from: "internet", to: "saas" },
        { from: "users", to: "edge" },
        { from: "edge", to: "datacentre" },
        { from: "edge", to: "acquired" },
        { from: "datacentre", to: "acquired" },
        { from: "saas", to: "edge" },
        { from: "datacentre", to: "soc" },
      ],
    },
  },
];

export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s]),
);
