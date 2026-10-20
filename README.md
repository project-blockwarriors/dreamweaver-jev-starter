# Jev tactician

Copy this directory into a GitHub repository, link it in Dreamweaver, and import a tag. The bot runs with Node 24 and no installed dependencies. `node bot.ts` reads the JSON-lines protocol from stdin; it does not connect directly to a game or provider.

The model chooses between banking cargo, gathering, intercepting, shielding, escaping and building cover. Code computes legal options, pathfinds, handles movement/cooldowns and protects against immediate hazards. Decisions remain valid for at most one second and are revalidated as the world changes. Expired, invalid or failed requests fall back to a scripted policy.

No API key belongs in your bot. Model requests go to the organizer broker through stdout. The reference policy requests at most two decisions per second, with 360 requests per match. The current broker accepts named `choice` questions, caps each request at 12 KB and total request bytes at 2 MB per seat, and uses a 750 ms provider deadline. These are prototype limits, not final tournament budgets.

`bot.ts` is the transport loop. `tactical.ts` is yours to change: write different prompts, replace pathfinding, add memory, invent tactics, or use your own controller. The available tactics are a reference policy, not a restriction imposed on competitors. The underlying action interface still allows direct cardinal movement and all five abilities.

Rules: collect at the four resource nodes, carry up to three crystals, and stand still at the beacon for 12 ticks to bank them. Each crystal earns 10 points, or 15 during the final six seconds of each 20-second beacon phase. Disrupt interrupts and pushes, Ward protects, and temporary walls block pulses. A knockout drops cargo for either bot to recover. The next beacon is announced five seconds before it moves. All times use 20 ticks per second.

The `seq` action number must increase. Observe `respawnUntil`, `recoveryUntil`, `depositUntil`, cooldowns and node `readyAt`. A model response includes `answers.tactic.choice` under `result`; see the policy for a complete request and response handler.
