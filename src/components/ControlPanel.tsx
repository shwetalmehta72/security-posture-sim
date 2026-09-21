import { CATEGORY_LABELS, CONTROLS } from "../domain/catalogue";
import { relevanceOf } from "../domain/scoring";
import type { Control, ControlId, Scenario } from "../domain/types";

interface Props {
  scenario: Scenario;
  enabled: ControlId[];
  onToggle: (id: ControlId) => void;
  onReset: () => void;
  onEnableAll: () => void;
  onClear: () => void;
}

const ORDER: Array<Control["category"]> = [
  "identity-endpoint",
  "network-edge",
  "cloud-data",
  "detection-response",
  "governance",
];

export function ControlPanel({
  scenario,
  enabled,
  onToggle,
  onReset,
  onEnableAll,
  onClear,
}: Props) {
  return (
    <section className="card">
      <h2>
        Security controls — {enabled.length} of {CONTROLS.length} enabled
      </h2>

      {ORDER.map((category) => {
        const group = CONTROLS.filter((c) => c.category === category);
        if (group.length === 0) return null;
        return (
          <div className="control-group" key={category}>
            <h3>{CATEGORY_LABELS[category]}</h3>
            {group.map((c) => {
              const relevance = relevanceOf(scenario, c.id);
              const lowRelevance = relevance < 0.7;
              return (
                <label className="control" key={c.id}>
                  <input
                    type="checkbox"
                    checked={enabled.includes(c.id)}
                    onChange={() => onToggle(c.id)}
                  />
                  <span className="control-body">
                    <span className="control-name">
                      {c.name}
                      {lowRelevance && (
                        <span
                          className="pill low-relevance"
                          title={`Only ${Math.round(relevance * 100)}% as effective in this scenario`}
                        >
                          {Math.round(relevance * 100)}% relevant
                        </span>
                      )}
                    </span>
                    <span className="control-note">{c.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        );
      })}

      <div className="row-actions">
        <button type="button" className="btn" onClick={onReset}>
          Scenario defaults
        </button>
        <button type="button" className="btn" onClick={onEnableAll}>
          Enable all
        </button>
        <button type="button" className="btn" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}
