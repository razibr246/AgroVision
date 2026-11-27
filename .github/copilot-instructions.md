# Copilot instructions for Agros

Read [AGENTS.md](../AGENTS.md) and follow it. It is the single guide for every coding agent in this repository:
commands, layout, data rules and behaviour constraints. Inside `services/voice-agent/`, its own
[AGENTS.md](../services/voice-agent/AGENTS.md) applies.

Do not copy that guide here: change AGENTS.md instead, so every agent stays in step.

Quick reference (details in AGENTS.md):

- `npm install`, `npm run dev`, `npm test`, `npm run build`. There is no linter; `npm test` plus `npm run build` is the check.
- One test: `node --test --test-name-pattern="weights" src/engine/engine.test.js`.
- Keep calculations in `src/engine/` (pure, tested); never hand-edit generated data, re-run its script.
- Real vs sample data is a product rule; every number carries a truthful `<Tags>` label.
