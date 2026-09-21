# Security Posture Simulator

**Toggle security controls across four enterprise scenarios and watch residual risk, detection time
and operational burden move together — then read the same simulation state through four stakeholder
lenses.**

The technical state is one thing. The argument that lands depends entirely on who is listening. A
CISO reading *"posture 46, four threats uncovered"* and a CFO reading *"downtime risk 62%, three
tools to run"* are looking at identical numbers and will reach different conclusions about what to do
next. That gap is what this simulator is about.

<!--
  Screenshots go here. Suggested: the default hybrid-workforce view, and the same state with the
  CFO tab selected so the two narratives can be compared side by side.
  ![Hybrid workforce scenario](docs/screenshots/hybrid.png)
-->

---

## Status

**Working.** Builds, runs, and is fully interactive with no backend. 36 tests pass over the scoring
engine. Built as a portfolio piece to demonstrate domain modelling and stakeholder-specific framing —
it is not a product and has never been used to assess a real estate.

| | |
|---|---|
| Backend | **None.** No API, no database, no accounts, no network calls. |
| Tests | 36, covering the scoring engine and catalogue integrity |
| Bundle | ~80 kB gzipped, fully static — deployable to any file host |
| Data | Entirely synthetic. No customer data, no vendor products, no real estate. |

---

## What it does

Pick one of four **scenarios**, toggle any of fifteen **security controls**, and the model
recomputes nine **threats** worth of residual risk along with six business-facing metrics. Four
**personas** then narrate that state in their own terms.

### Four scenarios

| Scenario | The hard part |
|---|---|
| **Hybrid Workforce** | The perimeter is the identity, not the building — controls that inspect office traffic protect a shrinking fraction of the estate. |
| **Public Web Application** | Availability *is* the business metric, which reorders every control's value. |
| **Multi-Cloud Estate** | Nobody can name every asset, so discovery precedes defence. |
| **M&A Integration** | You have connected an unknown network to a known one; every trust relationship is now a question. |

### Fifteen controls, nine threats

Controls are grouped into identity/endpoint, network/edge, cloud/data, detection/response and
governance. Each declares a mitigation strength against each threat, an operational cost, and — for
detective controls — how much detection and response time it removes.

### Four personas

Each surfaces different metrics and reaches a different conclusion from the same numbers:

- **CISO** — residual risk and defensibility. Can this be explained to a board and survive an incident review?
- **CFO** — loss exposure against spend. What does an outage cost and how many things are we paying to run?
- **Network Architect** — where controls sit, what they contain, whether the topology still makes sense.
- **SOC Manager** — detection and response time, telemetry coverage, and whether the team can keep up with the alerts.

---

## The model

Everything the UI shows comes from one pure function, `evaluate(scenario, enabledControls)`, in
[`src/domain/scoring.ts`](src/domain/scoring.ts). No clock, no randomness, no I/O — which is why it
can be tested properly.

### Controls compose multiplicatively, not additively

```
residual(threat) = baseline(threat) × ∏ (1 − effectiveness[control][threat] × relevance[control])
```

This is the design decision that matters. Adding effectiveness values would let three mediocre
controls sum past 100% mitigation and claim a threat was *eliminated*. Multiplying cannot exceed
100%, and produces diminishing returns for free: the second overlapping control is worth less than
the first, which is how defence in depth actually behaves.

Two consequences fall out of the maths rather than being coded as special cases:

- **Posture never reaches 100.** Enabling all fifteen controls lands at 78–84 depending on scenario.
  Each control removes a fraction of what remains, so the gap closes asymptotically. A simulator
  that let you reach zero risk would be teaching the wrong lesson.
- **Order does not matter, and duplicates do nothing.** Both are tested.

### Scenario relevance is the scenario's veto

Each scenario can discount any control's contribution. DDoS scrubbing is 85% effective against
volumetric floods, but only 20% relevant to a hybrid workforce and fully relevant to a public web
application — so the same control is near-worthless in one estate and the single best next move in
another. Without this, enabling everything is always the right answer and the simulation has nothing
to teach.

### Detection and response

Mean time to detect starts at one week — the unmonitored baseline — and detective controls remove
fractions of it, composed the same multiplicative way. This produces a result worth noticing:

| Control set | MTTD | MTTR |
|---|---|---|
| Nothing | 7 days | 3 days |
| EDR only | 3.5 days | 2.1 days |
| **MDR only** | **25 hr** | **21.6 hr** |
| **EDR + MDR** | **12.6 hr** | **15.1 hr** |
| EDR + MDR + SIEM | 7.6 hr | 12.1 hr |
| Everything | 6.5 hr | 12.1 hr |

Buying a managed detection service without endpoint telemetry to feed it leaves detection roughly
twice as slow as pairing the two. Nothing in the code special-cases that — it emerges from
composing the gains.

### Operational burden

Costs sum, because running more tools genuinely is more work. But a *consolidating* control (a
managed service) discounts the total, since somebody else carries the day-to-day load. This is why
the CFO narrative distinguishes between tooling you own and tooling somebody runs for you.

---

## What the numbers are and aren't

**They are illustrative.** The effectiveness values are reasoned judgements chosen so the model
behaves sensibly and teaches something true about layered defence. They are **not** measured
efficacy figures, and they are not derived from any vendor's data, any customer's incident history,
or any published benchmark.

The control names are the industry-standard category names — SASE components, EDR, MDR, SIEM, CSPM
and so on. They are not any vendor's product names, and this simulator models no specific vendor's
portfolio.

**Do not use this to assess a real environment.** It is a demonstration of how to reason about
control coverage and how to frame that reasoning for different audiences. A real assessment needs
your actual asset inventory, your actual threat intelligence and someone accountable for the result.

---

## Run it

Requires **Node 20+**.

```bash
git clone https://github.com/shwetalmehta72/security-posture-sim.git
cd security-posture-sim

npm install
npm run dev          # http://localhost:5173
```

Other commands:

```bash
npm test             # 36 tests over the scoring engine
npm run test:watch
npm run check        # tsc --noEmit
npm run build        # typecheck + static bundle into dist/
npm run preview      # serve the production build
```

No environment variables. No services to start. The built output in `dist/` is plain static files.

> **If `npm install` leaves a rollup `MODULE_NOT_FOUND` error**, run
> `npm install @rollup/rollup-win32-x64-msvc` (or your platform's equivalent). It is a
> [known npm bug](https://github.com/npm/cli/issues/4828) with optional dependencies, not a problem
> with this project.

---

## Project structure

```
src/
  domain/              Everything that is not presentation
    types.ts           The model: threats, controls, scenarios, personas, metrics
    catalogue.ts       15 controls, 9 threats, and their effectiveness values
    scenarios.ts       4 scenarios: topology, threat mix, control relevance
    personas.ts        4 stakeholder lenses over the same computed state
    scoring.ts         evaluate() and friends — pure, no I/O
    scoring.test.ts    36 tests
  components/
    ScenarioPicker.tsx
    ControlPanel.tsx
    MetricsPanel.tsx
    PersonaView.tsx
    TopologyMap.tsx    SVG topology with animateMotion threat packet
  App.tsx
```

The domain layer has no React import anywhere in it, and the components hold no domain logic. Adding
a scenario means adding one object to `SCENARIOS` — including its topology, which is laid out from
declared coordinates, so there is no layout code to touch.

---

## Design notes

- **No CSS framework.** The app is small enough that a utility framework would cost more than it
  saves. Design tokens in `src/index.css` keep the light and dark palettes consistent, and the whole
  stylesheet is 6.6 kB.
- **Theme-aware by default.** Light and dark are both defined on tokens and follow the system
  setting.
- **Animation is SVG `animateMotion`**, not JavaScript — no per-frame cost, and it stops entirely
  under `prefers-reduced-motion`.
- **Three runtime dependencies**: React, React DOM, and nothing else.

---

## License

MIT — see [`LICENSE`](LICENSE). Copyright (c) 2026 Shwetal Mehta.
