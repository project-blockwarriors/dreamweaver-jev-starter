import { createInterface } from 'node:readline';
import { TacticalPolicy } from './tactical.ts';
const policy = new TacticalPolicy('jev');
let tick = 0;
for await (const line of createInterface({ input: process.stdin })) {
  const message = JSON.parse(line);
  if (message.type === 'model-response') {
    policy.respond(message, tick);
    continue;
  }
  if (message.type !== 'observation') continue;
  tick = message.observation.tick;
  const result = policy.step(message.observation);
  console.log(JSON.stringify({ type: 'action', action: result.action }));
  if (result.request) console.log(JSON.stringify(result.request));
}
