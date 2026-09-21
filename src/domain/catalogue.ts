/**
 * The threat and control catalogue.
 *
 * Control names are the industry-standard category names (SASE components, EDR,
 * MDR, SIEM and so on) — not any vendor's product names. Effectiveness values
 * are illustrative judgements chosen to make the model behave sensibly, not
 * measured efficacy figures. See README, "What the numbers are and aren't".
 */

import type { Control, Threat } from "./types";

export const THREATS: Threat[] = [
  {
    id: "phishing",
    name: "Credential Phishing",
    description:
      "Users are tricked into surrendering credentials or approving a malicious sign-in, giving an attacker a valid identity rather than an exploit.",
    affectsAvailability: false,
    tone: "amber",
  },
  {
    id: "ransomware",
    name: "Ransomware",
    description:
      "Data is encrypted at scale and operations stop until recovery completes or a ransom is paid. Usually the second act, not the first.",
    affectsAvailability: true,
    tone: "red",
  },
  {
    id: "ddos",
    name: "Volumetric DDoS",
    description:
      "Public-facing capacity is exhausted by flood traffic. Cheap to launch, purely an availability problem, and mitigated almost entirely at the edge.",
    affectsAvailability: true,
    tone: "cyan",
  },
  {
    id: "web-exploit",
    name: "Web Application Exploit",
    description:
      "An internet-facing application is attacked directly through injection, deserialisation or an unpatched component.",
    affectsAvailability: true,
    tone: "violet",
  },
  {
    id: "lateral-movement",
    name: "Lateral Movement",
    description:
      "An attacker with an initial foothold moves sideways toward valuable systems. Flat networks make this nearly free.",
    affectsAvailability: false,
    tone: "amber",
  },
  {
    id: "data-exfiltration",
    name: "Data Exfiltration",
    description:
      "Sensitive data leaves the estate, often over sanctioned channels that look like ordinary traffic.",
    affectsAvailability: false,
    tone: "violet",
  },
  {
    id: "insider",
    name: "Insider Misuse",
    description:
      "A legitimate account is used for illegitimate purposes. No perimeter is crossed, so perimeter controls contribute little.",
    affectsAvailability: false,
    tone: "lime",
  },
  {
    id: "cloud-misconfig",
    name: "Cloud Misconfiguration",
    description:
      "An exposed bucket, over-broad role or open management port creates access nobody intended and nobody is watching.",
    affectsAvailability: false,
    tone: "cyan",
  },
  {
    id: "supply-chain",
    name: "Third-Party Compromise",
    description:
      "Access arrives through a supplier, contractor or dependency that sits inside the trust boundary already.",
    affectsAvailability: true,
    tone: "lime",
  },
];

export const CONTROLS: Control[] = [
  // ---------------------------------------------------------------- network edge
  {
    id: "sdwan",
    name: "Software-Defined WAN",
    shortName: "SD-WAN",
    category: "network-edge",
    description:
      "Policy-driven routing between sites and cloud with segmentation between zones. Its security value is mostly containment, not prevention.",
    placement: "edge",
    effectiveness: { "lateral-movement": 0.35, ransomware: 0.15 },
    complexityCost: 1.5,
  },
  {
    id: "swg",
    name: "Secure Web Gateway",
    shortName: "SWG",
    category: "network-edge",
    description:
      "Inspects outbound web traffic, blocking known-bad destinations and enforcing acceptable-use policy.",
    placement: "edge",
    effectiveness: { phishing: 0.3, "data-exfiltration": 0.3, ransomware: 0.2 },
    complexityCost: 1,
  },
  {
    id: "fwaas",
    name: "Firewall as a Service",
    shortName: "FWaaS",
    category: "network-edge",
    description:
      "Cloud-delivered inspection and segmentation, so policy follows the workload rather than the datacentre.",
    placement: "edge",
    effectiveness: {
      "web-exploit": 0.4,
      "lateral-movement": 0.3,
      "data-exfiltration": 0.2,
    },
    complexityCost: 1.5,
  },
  {
    id: "ddos-mitigation",
    name: "DDoS Mitigation",
    shortName: "DDoS",
    category: "network-edge",
    description:
      "Upstream scrubbing of volumetric floods before they reach your capacity. Narrow, but decisive where it applies.",
    placement: "internet",
    effectiveness: { ddos: 0.85 },
    complexityCost: 0.5,
  },
  {
    id: "ztna",
    name: "Zero-Trust Network Access",
    shortName: "ZTNA",
    category: "network-edge",
    description:
      "Per-application authorisation replacing flat network access, so a foothold does not imply reach.",
    placement: "users",
    effectiveness: {
      "lateral-movement": 0.55,
      insider: 0.25,
      "supply-chain": 0.4,
      ransomware: 0.2,
    },
    complexityCost: 2,
  },

  // ----------------------------------------------------------------- cloud, data
  {
    id: "casb",
    name: "Cloud Access Security Broker",
    shortName: "CASB",
    category: "cloud-data",
    description:
      "Visibility and policy over sanctioned and unsanctioned SaaS use, including what data moves into it.",
    placement: "saas",
    effectiveness: { "data-exfiltration": 0.4, insider: 0.25, "cloud-misconfig": 0.2 },
    complexityCost: 1.5,
  },
  {
    id: "cspm",
    name: "Cloud Security Posture Management",
    shortName: "CSPM",
    category: "cloud-data",
    description:
      "Continuously checks cloud configuration against policy and flags drift — the only control here that addresses misconfiguration at its root.",
    placement: "cloud",
    effectiveness: { "cloud-misconfig": 0.7, "web-exploit": 0.15, "data-exfiltration": 0.15 },
    complexityCost: 1,
    detectionGain: 0.1,
  },
  {
    id: "dlp",
    name: "Data Loss Prevention",
    shortName: "DLP",
    category: "cloud-data",
    description:
      "Classifies sensitive data and blocks disallowed movement of it. Effective against exfiltration, noisy to tune.",
    placement: "saas",
    effectiveness: { "data-exfiltration": 0.5, insider: 0.35 },
    complexityCost: 2.5,
  },
  {
    id: "email-security",
    name: "Email Security Gateway",
    shortName: "Email",
    category: "cloud-data",
    description:
      "Filters phishing, malicious attachments and impersonation before delivery. The highest-yield control against the most common entry point.",
    placement: "saas",
    effectiveness: { phishing: 0.55, ransomware: 0.3, "supply-chain": 0.2 },
    complexityCost: 0.5,
  },

  // ------------------------------------------------------------ identity, endpoint
  {
    id: "mfa",
    name: "Multi-Factor Authentication",
    shortName: "MFA",
    category: "identity-endpoint",
    description:
      "Requires a second factor, so a stolen password is not by itself an account takeover. Cheap, and the single best return in the catalogue.",
    placement: "users",
    effectiveness: { phishing: 0.6, insider: 0.1, "supply-chain": 0.25 },
    complexityCost: 0.5,
  },
  {
    id: "edr",
    name: "Endpoint Detection & Response",
    shortName: "EDR",
    category: "identity-endpoint",
    description:
      "Behavioural detection and containment on the endpoint itself. Generates the telemetry everything downstream depends on.",
    placement: "users",
    effectiveness: { ransomware: 0.5, "lateral-movement": 0.3, phishing: 0.15 },
    complexityCost: 1.5,
    detectionGain: 0.5,
    responseGain: 0.3,
  },

  // ---------------------------------------------------------- detection, response
  {
    id: "mdr",
    name: "Managed Detection & Response",
    shortName: "MDR",
    category: "detection-response",
    description:
      "An external team watching the telemetry around the clock. Adds no headcount and reduces the operational burden of the controls beneath it.",
    placement: "soc",
    effectiveness: { ransomware: 0.35, "lateral-movement": 0.35, insider: 0.3, "supply-chain": 0.25 },
    complexityCost: 0.5,
    detectionGain: 0.85,
    responseGain: 0.7,
    consolidates: true,
  },
  {
    id: "siem",
    name: "Security Information & Event Management",
    shortName: "SIEM",
    category: "detection-response",
    description:
      "Central correlation across sources. Powerful and genuinely expensive to run well — the clearest complexity cost here.",
    placement: "soc",
    effectiveness: { "lateral-movement": 0.2, insider: 0.25, "data-exfiltration": 0.2 },
    complexityCost: 3,
    detectionGain: 0.4,
    responseGain: 0.2,
  },

  // -------------------------------------------------------------------- governance
  {
    id: "asm",
    name: "Attack Surface Management",
    shortName: "ASM",
    category: "governance",
    description:
      "Continuously discovers what of yours is reachable from the internet, including the things nobody remembered deploying.",
    placement: "internet",
    effectiveness: { "web-exploit": 0.35, "cloud-misconfig": 0.3, "supply-chain": 0.2 },
    complexityCost: 1,
    detectionGain: 0.1,
  },
  {
    id: "awareness-training",
    name: "Security Awareness Training",
    shortName: "Training",
    category: "governance",
    description:
      "Reduces the rate at which people click, approve and authorise. Modest ceiling, but it applies to the entry point that matters most.",
    placement: "users",
    effectiveness: { phishing: 0.3, insider: 0.15, "supply-chain": 0.1 },
    complexityCost: 0.5,
  },
];

export const THREAT_BY_ID: Record<string, Threat> = Object.fromEntries(
  THREATS.map((t) => [t.id, t]),
);

export const CONTROL_BY_ID: Record<string, Control> = Object.fromEntries(
  CONTROLS.map((c) => [c.id, c]),
);

export const CATEGORY_LABELS: Record<Control["category"], string> = {
  "network-edge": "Network & Edge",
  "cloud-data": "Cloud & Data",
  "identity-endpoint": "Identity & Endpoint",
  "detection-response": "Detection & Response",
  governance: "Governance & Visibility",
};
