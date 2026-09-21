/**
 * Abstract topology view.
 *
 * Nodes are laid out in a 0..100 coordinate space declared by the scenario, so
 * adding a scenario needs no layout code. Enforcement points light up when a
 * control placed there is enabled, and a threat packet animates along a path to
 * make the residual-risk number feel like something rather than a statistic.
 *
 * Animation is SVG `animateMotion` rather than JS, so it costs nothing per frame
 * and stops entirely under `prefers-reduced-motion`.
 */

import { CONTROL_BY_ID, THREAT_BY_ID } from "../domain/catalogue";
import type { ControlId, Metrics, Scenario } from "../domain/types";

const NODE_W = 22;
const NODE_H = 9;

interface Props {
  scenario: Scenario;
  enabled: ControlId[];
  metrics: Metrics;
}

const TONE_VAR: Record<string, string> = {
  red: "var(--tone-red)",
  amber: "var(--tone-amber)",
  violet: "var(--tone-violet)",
  cyan: "var(--tone-cyan)",
  lime: "var(--tone-lime)",
};

export function TopologyMap({ scenario, enabled, metrics }: Props) {
  const { nodes, links } = scenario.topology;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // How many enabled controls enforce at each node.
  const enforcement = new Map<string, number>();
  for (const id of enabled) {
    const c = CONTROL_BY_ID[id];
    if (!c) continue;
    enforcement.set(c.placement, (enforcement.get(c.placement) ?? 0) + 1);
  }

  // The worst remaining threat drives the packet colour and speed: more residual
  // risk means a faster, more insistent packet.
  const worst = [...metrics.perThreat].sort((a, b) => b.residual - a.residual)[0];
  const worstThreat = worst ? THREAT_BY_ID[worst.threat] : undefined;
  const packetColour = worstThreat ? TONE_VAR[worstThreat.tone] : "var(--tone-red)";
  const severity = worst && worst.baseline > 0 ? worst.residual / worst.baseline : 0;
  const duration = 5.5 - severity * 3; // 2.5s at full risk, 5.5s when well covered

  // Animate along the longest chain from the internet edge inward.
  const path = attackPath(scenario);
  const pathD = path
    .map((id) => byId.get(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((n, i) => `${i === 0 ? "M" : "L"} ${n.x} ${n.y + NODE_H / 2}`)
    .join(" ");

  return (
    <svg
      className="topology"
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Topology for ${scenario.name}. ${enforcement.size} of ${nodes.length} zones have an enforcement point.`}
    >
      {links.map((l, i) => {
        const a = byId.get(l.from);
        const b = byId.get(l.to);
        if (!a || !b) return null;
        return (
          <line
            key={i}
            className="topo-link"
            x1={a.x}
            y1={a.y + NODE_H / 2}
            x2={b.x}
            y2={b.y + NODE_H / 2}
          />
        );
      })}

      {pathD && severity > 0.05 && (
        <circle className="packet" r="1.5" fill={packetColour}>
          <animateMotion dur={`${duration}s`} repeatCount="indefinite" path={pathD} />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            dur={`${duration}s`}
            repeatCount="indefinite"
          />
        </circle>
      )}

      {nodes.map((n) => {
        const count = enforcement.get(n.id) ?? 0;
        return (
          <g key={n.id} className={`topo-node${count > 0 ? " protected" : ""}`}>
            <rect x={n.x - NODE_W / 2} y={n.y} width={NODE_W} height={NODE_H} rx="1.6" />
            <text x={n.x} y={n.y + 4}>
              {n.label.length > 19 ? `${n.label.slice(0, 18)}…` : n.label}
            </text>
            {count > 0 && (
              <text className="topo-count" x={n.x} y={n.y + 7.4}>
                {count} enforcing
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * A plausible inbound path for the animation: breadth-first from the internet
 * node, following the longest chain found. Presentational only — nothing in the
 * scoring model depends on it.
 */
function attackPath(scenario: Scenario): string[] {
  const { nodes, links } = scenario.topology;
  const start = nodes.find((n) => n.kind === "internet")?.id ?? nodes[0]?.id;
  if (!start) return [];

  const adjacency = new Map<string, string[]>();
  for (const l of links) {
    adjacency.set(l.from, [...(adjacency.get(l.from) ?? []), l.to]);
    adjacency.set(l.to, [...(adjacency.get(l.to) ?? []), l.from]);
  }

  let longest: string[] = [start];
  const walk = (node: string, seen: string[]) => {
    if (seen.length > longest.length) longest = seen;
    if (seen.length > 5) return;
    for (const next of adjacency.get(node) ?? []) {
      if (seen.includes(next)) continue;
      walk(next, [...seen, next]);
    }
  };
  walk(start, [start]);
  return longest;
}
