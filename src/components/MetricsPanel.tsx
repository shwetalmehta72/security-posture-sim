import { THREATS } from "../domain/catalogue";
import { formatDuration } from "../domain/scoring";
import type { Metrics, Persona } from "../domain/types";

interface Props {
  metrics: Metrics;
  persona: Persona;
}

const TONE_VAR: Record<string, string> = {
  red: "var(--tone-red)",
  amber: "var(--tone-amber)",
  violet: "var(--tone-violet)",
  cyan: "var(--tone-cyan)",
  lime: "var(--tone-lime)",
};

function band(value: number, goodBelow: number, badAbove: number): string {
  if (value < goodBelow) return "good";
  if (value > badAbove) return "bad";
  return "warn";
}

export function MetricsPanel({ metrics: m, persona }: Props) {
  const focus = new Set(persona.focusMetrics as string[]);
  const cls = (key: string) => `metric${focus.has(key) ? " highlight" : ""}`;

  return (
    <>
      <section className="card">
        <h2>Outcomes — highlighted for the {persona.name}</h2>
        <div className="metric-grid">
          <div className={cls("postureScore")}>
            <div className="metric-label">Posture score</div>
            <div
              className={`metric-value ${
                m.postureScore > 65 ? "good" : m.postureScore < 35 ? "bad" : "warn"
              }`}
            >
              {m.postureScore}
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}> / 100</span>
            </div>
            <div className="metric-sub">
              {Math.round(m.residualRiskRatio * 100)}% of baseline risk remains
            </div>
          </div>

          <div className={cls("incidentLikelihood")}>
            <div className="metric-label">Incident likelihood</div>
            <div
              className={`metric-value ${
                m.incidentLikelihood === "Low"
                  ? "good"
                  : m.incidentLikelihood === "High"
                    ? "bad"
                    : "warn"
              }`}
              style={{ fontSize: "1.15rem" }}
            >
              {m.incidentLikelihood}
            </div>
            <div className="metric-sub">
              {m.coveredThreats} of {m.perThreat.length} threats covered
            </div>
          </div>

          <div className={cls("mttdHours")}>
            <div className="metric-label">Mean time to detect</div>
            <div
              className={`metric-value ${band(m.mttdHours, 8, 72)}`}
              style={{ fontSize: "1.15rem" }}
            >
              {formatDuration(m.mttdHours)}
            </div>
            <div className="metric-sub">intrusion to awareness</div>
          </div>

          <div className={cls("mttrHours")}>
            <div className="metric-label">Mean time to respond</div>
            <div
              className={`metric-value ${band(m.mttrHours, 12, 48)}`}
              style={{ fontSize: "1.15rem" }}
            >
              {formatDuration(m.mttrHours)}
            </div>
            <div className="metric-sub">awareness to contained</div>
          </div>

          <div className={cls("downtimeRiskPct")}>
            <div className="metric-label">Downtime risk</div>
            <div className={`metric-value ${band(m.downtimeRiskPct, 30, 65)}`}>
              {m.downtimeRiskPct}%
            </div>
            <div className="metric-sub">of modelled worst case</div>
          </div>

          <div className={cls("operationalComplexity")}>
            <div className="metric-label">Operational burden</div>
            <div className={`metric-value ${band(m.operationalComplexity, 4, 7)}`}>
              {m.operationalComplexity}
              <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}> / 10</span>
            </div>
            <div className="metric-sub">cost of running this set</div>
          </div>
        </div>

        <div className="bar" aria-hidden="true">
          <div style={{ width: `${m.postureScore}%` }} />
        </div>
      </section>

      <section className="card">
        <h2>Residual risk by threat</h2>
        {THREATS.map((t) => {
          const o = m.perThreat.find((x) => x.threat === t.id);
          if (!o) return null;
          const remaining = o.baseline === 0 ? 0 : (o.residual / o.baseline) * 100;
          return (
            <div className="threat-row" key={t.id} title={t.description}>
              <div className="threat-name">
                <span className="threat-dot" style={{ background: TONE_VAR[t.tone] }} />
                {t.name}
              </div>
              <div className="threat-reduction">
                {o.reductionPct >= 20 ? `-${Math.round(o.reductionPct)}%` : "—"}
              </div>
              <div className="threat-track">
                <div style={{ width: `${remaining}%`, background: TONE_VAR[t.tone] }} />
              </div>
            </div>
          );
        })}
        <p className="metric-sub" style={{ marginTop: 10, marginBottom: 0 }}>
          Bars show risk still standing. A dash means less than a 20% reduction — not
          meaningfully addressed.
        </p>
      </section>
    </>
  );
}
