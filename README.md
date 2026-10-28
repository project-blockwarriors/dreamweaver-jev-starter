# Jev tactician

Copy this directory into a GitHub repository, link it in Dreamweaver, and import a tag. The bot runs with Node 24 and no installed dependencies. `node bot.ts` reads the JSON-lines protocol from stdin; it does not connect directly to a game or provider.

The model chooses between banking cargo, gathering, intercepting, shielding, escaping and building cover. Code computes legal options, pathfinds, handles movement/cooldowns and protects against immediate hazards. Decisions remain valid for at most one second and are revalidated as the world changes. Expired, invalid or failed requests fall back to a scripted policy.

No API key belongs in your bot. Model requests go to the organizer broker through stdout. The reference policy requests at most two decisions per second, with 360 requests per match. The current broker accepts named `choice` questions, caps each request at 12 KB and total request bytes at 2 MB per seat, and uses a 750 ms provider deadline. These are prototype limits, not final tournament budgets.

`bot.ts` is the transport loop. `tactical.ts` is yours to change: write different prompts, replace pathfinding, add memory, invent tactics, or use your own controller. The available tactics are a reference policy, not a restriction imposed on competitors. The underlying action interface still allows direct cardinal movement and all five abilities.

Rules: gather crystals from outer sources or the two-crystal core, carry up to three, and bank at the fixed shrine at (12,8). Hold still and activate slot 1 for 24 ticks (1.2 seconds). One/two/three crystals score 10/20/40. Disrupt charges for half a second, interrupts and spills cargo; Ward and walls protect you. Pickups do not score until banked. The hazard warns before damaging its column. See the [complete rules](https://github.com/project-blockwarriors/blockwarriors-dreamweaver-cmd/blob/main/docs/strategy-lab.md).

The `seq` action number must increase. Observe `respawnUntil`, `recoveryUntil`, `depositUntil`, cooldowns and node `readyAt`. A model response includes `answers.tactic.choice` under `result`; see the policy for a complete request and response handler.

The hosted event uses house trials. Check the workspace for the active protocol before importing; v4 targets the native strategy arena. Use hosted practice to verify physics and real model timing before selecting an entry. See the main repository’s participant and contributor guides.
