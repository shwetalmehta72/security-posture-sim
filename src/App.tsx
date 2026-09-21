import { useMemo, useState } from "react";

import { ControlPanel } from "./components/ControlPanel";
import { MetricsPanel } from "./components/MetricsPanel";
import { PersonaView } from "./components/PersonaView";
import { ScenarioPicker } from "./components/ScenarioPicker";
import { TopologyMap } from "./components/TopologyMap";
import { CONTROL_BY_ID, THREAT_BY_ID } from "./domain/catalogue";
import { PERSONA_BY_ID } from "./domain/personas";
import { SCENARIO_BY_ID, SCENARIOS } from "./domain/scenarios";
import { bestNextControl, evaluate } from "./domain/scoring";
import { CONTROLS } from "./domain/catalogue";
import type { ControlId, PersonaId, ScenarioId } from "./domain/types";

const FIRST = SCENARIOS[0];

export function App() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(FIRST.id);
  const [personaId, setPersonaId] = useState<PersonaId>("ciso");
  const [enabled, setEnabled] = useState<ControlId[]>(FIRST.defaultControls);

  const scenario = SCENARIO_BY_ID[scenarioId] ?? FIRST;
  const persona = PERSONA_BY_ID[personaId];

  const metrics = useMemo(() => evaluate(scenario, enabled), [scenario, enabled]);
  const suggestion = useMemo(() => bestNextControl(scenario, enabled), [scenario, enabled]);

  const topGaps = useMemo(
    () => metrics.uncoveredThreats.slice(0, 3).map((id) => THREAT_BY_ID[id]?.name ?? id),
    [metrics.uncoveredThreats],
  );

  const selectScenario = (id: ScenarioId) => {
    setScenarioId(id);
    // Reset to that scenario's starting position rather than carrying a control
    // set that may be irrelevant to the new estate.
    setEnabled(SCENARIO_BY_ID[id]?.defaultControls ?? []);
  };

  const toggle = (id: ControlId) =>
    setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="app">
      <header className="masthead">
        <a className="homelink" href="https://shwetalmehta.com">&larr; shwetalmehta.com</a>
        <h1>Security Posture Simulator</h1>
        <p className="howto">
          <strong>Try this:</strong> pick a scenario, turn on one control, then switch between the
          CISO and CFO tabs. Same numbers, different argument.
        </p>
        <p>
          Toggle security controls across four enterprise scenarios and watch residual risk,
          detection time and operational burden move together. Then read the same simulation
          state through four stakeholder lenses — because the technical state is one thing and
          the argument that lands depends entirely on who is listening.
        </p>
        <p className="banner">
          <strong>Illustrative model.</strong> The control taxonomy is generic industry
          terminology and the effectiveness values are reasoned judgements chosen to make the
          model behave sensibly. This is a demonstration of how to reason about layered
          defence — not a validated risk assessment, and not advice for any real organisation.
        </p>
      </header>

      <div className="layout">
        <div>
          <ScenarioPicker selected={scenarioId} onSelect={selectScenario} />
          <ControlPanel
            scenario={scenario}
            enabled={enabled}
            onToggle={toggle}
            onReset={() => setEnabled(scenario.defaultControls)}
            onEnableAll={() => setEnabled(CONTROLS.map((c) => c.id))}
            onClear={() => setEnabled([])}
          />
        </div>

        <div>
          <section className="card">
            <h2>{scenario.name} — topology</h2>
            <TopologyMap scenario={scenario} enabled={enabled} metrics={metrics} />
            <p className="hint">
              {suggestion ? (
                <>
                  <b>Best next move:</b> {CONTROL_BY_ID[suggestion.control]?.name} — removes the
                  most remaining risk of any single control available here.
                </>
              ) : (
                <>
                  <b>Everything is enabled.</b> Residual risk never reaches zero: layered
                  controls compose multiplicatively, so each one removes a fraction of what is
                  left rather than closing the gap outright.
                </>
              )}
            </p>
          </section>

          <MetricsPanel metrics={metrics} persona={persona} />
        </div>

        <div>
          <PersonaView
            selected={personaId}
            onSelect={setPersonaId}
            persona={persona}
            context={{ metrics, scenario, enabled, topGaps }}
          />
        </div>
      </div>

      <footer className="disclaimer">
        Built as a portfolio piece to demonstrate domain modelling, a tested scoring engine, and
        stakeholder-specific framing of a single technical state. No customer data, no vendor
        products, and no backend — the whole model is in{" "}
        <code>src/domain/</code> and runs entirely in the browser.
      </footer>
    </div>
  );
}
