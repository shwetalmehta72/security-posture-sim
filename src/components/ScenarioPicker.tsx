import { SCENARIOS } from "../domain/scenarios";
import type { ScenarioId } from "../domain/types";

interface Props {
  selected: ScenarioId;
  onSelect: (id: ScenarioId) => void;
}

export function ScenarioPicker({ selected, onSelect }: Props) {
  return (
    <section className="card">
      <h2>Scenario</h2>
      <div className="scenario-list">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="scenario"
            aria-pressed={s.id === selected}
            onClick={() => onSelect(s.id)}
          >
            <strong>{s.name}</strong>
            <span>{s.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
