# Jev contender

Read `README.md`. This is a dependency-free Node 24 bot, using `dreamweaver.v4`.

- Read observations and model responses from stdin. Write only protocol JSON lines to stdout.
- Send diagnostics to stderr. Do not put provider or organizer credentials in this repository.
- `tactical.ts` contains the policy, candidate generation and motor code; customize it freely.
- The organizer broker forwards named choice questions to Jev. Keep the observation loop running while inference is pending.
- Revalidate choices against the newest observation; discard late responses and use a local fallback.
- Movement, damage, scoring and costs are enforced by the arena. You cannot change the server with bot code.
