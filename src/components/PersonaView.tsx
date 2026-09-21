import { PERSONAS } from "../domain/personas";
import type { NarrativeContext, Persona, PersonaId } from "../domain/types";

interface Props {
  selected: PersonaId;
  onSelect: (id: PersonaId) => void;
  persona: Persona;
  context: NarrativeContext;
}

export function PersonaView({ selected, onSelect, persona, context }: Props) {
  return (
    <section className="card">
      <h2>Same state, four readings</h2>
      <div className="persona-tabs">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="persona-tab"
            aria-pressed={p.id === selected}
            onClick={() => onSelect(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <div className="persona-role">{persona.role}</div>
      <div className="persona-focus">Cares about: {persona.focus}</div>
      <p className="persona-narrative">{persona.narrative(context)}</p>
    </section>
  );
}
