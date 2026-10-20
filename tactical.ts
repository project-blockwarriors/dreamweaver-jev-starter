import type { Action, Observation } from './types.ts';
export type Tactic = 'bank' | 'collect' | 'intercept' | 'shield' | 'escape' | 'cover';
type Point = { x: number; z: number };
export const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const dirs = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const alive = (o: Observation) => (o.self.respawnUntil ?? 0) <= o.tick;
const ready = (o: Observation, slot: number) =>
  o.self.cooldowns[slot - 1] === 0 && (o.self.recoveryUntil ?? 0) <= o.tick;
const free = (o: Observation, x: number, z: number) =>
  x >= 0 && x <= 24 && z >= 0 && z <= 24 && !o.blocks.some((b) => b.x === x && b.z === z && b.until > o.tick);
export const threatened = (o: Observation) =>
  o.self.x === o.hazard.x && o.hazard.activeUntil > o.tick && o.hazard.warnUntil - o.tick <= 16;
function pulseClear(o: Observation) {
  const a = o.self,
    b = o.opponent,
    n = Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
  for (let i = 1; i < n; i++)
    if (!free(o, Math.round(a.x + ((b.x - a.x) * i) / n), Math.round(a.z + ((b.z - a.z) * i) / n)))
      return false;
  return true;
}
function coverDirection(o: Observation): readonly [number, number] | undefined {
  if (!ready(o, 4) || o.self.flux < 1 || distance(o.self, o.opponent) < 2 || distance(o.self, o.opponent) > 5)
    return;
  const dx = Math.sign(o.opponent.x - o.self.x),
    dz = dx ? 0 : Math.sign(o.opponent.z - o.self.z);
  const p = { x: o.self.x + dx, z: o.self.z + dz };
  if (
    free(o, p.x, p.z) &&
    distance(p, o.opponent) > 0 &&
    distance(p, o.beacon) > 0 &&
    !o.nodes.some((n) => distance(p, n) === 0)
  )
    return [dx, dz];
}
export function options(o: Observation): Tactic[] {
  if (!alive(o)) return [];
  const result: Tactic[] = [];
  if (o.self.cargo > 0) result.push('bank');
  if (o.self.cargo < 3) result.push('collect');
  if (
    (o.opponent.respawnUntil ?? 0) <= o.tick &&
    (o.opponent.cargo > 0 || distance(o.opponent, o.beacon) <= 4)
  )
    result.push('intercept');
  if (
    o.self.flux > 0 &&
    ready(o, 3) &&
    o.self.wardUntil <= o.tick &&
    (threatened(o) || distance(o.self, o.opponent) <= 5 || o.self.depositUntil)
  )
    result.push('shield');
  if (threatened(o) || o.self.health === 1) result.push('escape');
  if (coverDirection(o)) result.push('cover');
  return result;
}
// Same movement and ability implementation for both Jev and the scripted comparison.
function route(o: Observation, target: Point, radius = 1): [number, number] {
  if (distance(o.self, target) <= radius) return [0, 0];
  const queue: [number, number, number, number][] = [[o.self.x, o.self.z, 0, 0]];
  const seen = new Set([`${o.self.x}:${o.self.z}`]);
  for (let i = 0; i < queue.length; i++) {
    const [x, z, firstX, firstZ] = queue[i];
    for (const [dx, dz] of dirs) {
      const nx = x + dx,
        nz = z + dz,
        k = `${nx}:${nz}`;
      if (!free(o, nx, nz) || seen.has(k)) continue;
      if (
        nx === o.hazard.x &&
        o.hazard.activeUntil > o.tick &&
        o.hazard.warnUntil - o.tick < 12 &&
        o.self.wardUntil <= o.tick
      )
        continue;
      seen.add(k);
      const fx = i === 0 ? dx : firstX,
        fz = i === 0 ? dz : firstZ;
      if (distance({ x: nx, z: nz }, target) <= radius) return [fx, fz];
      queue.push([nx, nz, fx, fz]);
    }
  }
  return [0, 0];
}
export function scriptedChoice(o: Observation): Tactic {
  if (threatened(o) && o.self.wardUntil <= o.tick)
    return o.self.depositUntil && ready(o, 3) && o.self.flux ? 'shield' : 'escape';
  if (
    o.opponent.depositUntil &&
    distance(o.self, o.opponent) <= 3 &&
    ready(o, 5) &&
    o.opponent.wardUntil <= o.tick
  )
    return 'intercept';
  if (o.self.cargo > 0) {
    if (
      distance(o.self, o.beacon) <= 2 &&
      distance(o.self, o.opponent) <= 3 &&
      ready(o, 3) &&
      o.self.flux &&
      o.self.wardUntil <= o.tick
    )
      return 'shield';
    const near = o.nodes.some((n) => distance(o.self, n) <= 1 && (n.readyAt ?? 0) <= o.tick);
    if (near && o.self.cargo < 3 && o.self.health > 1) return 'collect';
    return 'bank';
  }
  return 'collect';
}
export function execute(o: Observation, tactic: Tactic): Action {
  const a: Action = { seq: o.tick, observedTick: o.tick, dx: 0, dz: 0, slot: 1, activate: false };
  if (!alive(o)) return a;
  if (threatened(o) && o.self.wardUntil <= o.tick && tactic !== 'shield') tactic = 'escape';
  if (tactic === 'shield' && ready(o, 3) && o.self.flux > 0) return { ...a, slot: 3, activate: true };
  if (tactic === 'cover') {
    const direction = coverDirection(o);
    if (direction) return { ...a, dx: direction[0], dz: direction[1], slot: 4, activate: true };
    tactic = scriptedChoice(o);
  }
  // Stay still while depositing, unless immediate danger or a selected defensive ability interrupts.
  if (o.self.depositUntil && o.self.depositUntil > o.tick && tactic !== 'escape') return a;
  if (tactic === 'escape') {
    const safe = dirs
      .filter(([x, z]) => free(o, o.self.x + x, o.self.z + z) && o.self.x + x !== o.hazard.x)
      .sort(
        (a, b) =>
          distance({ x: o.self.x + b[0], z: o.self.z + b[1] }, o.opponent) -
          distance({ x: o.self.x + a[0], z: o.self.z + a[1] }, o.opponent),
      )[0];
    if (safe) return { ...a, dx: safe[0], dz: safe[1], slot: ready(o, 2) ? 2 : 1, activate: ready(o, 2) };
    return ready(o, 3) && o.self.flux > 0 ? { ...a, slot: 3, activate: true } : a;
  }
  let target: Point = o.beacon,
    radius = 1;
  if (tactic === 'intercept') {
    if (distance(o.self, o.opponent) <= 3 && ready(o, 5) && o.opponent.wardUntil <= o.tick && pulseClear(o))
      return { ...a, slot: 5, activate: true };
    target = o.opponent;
    radius = 2;
  } else if (tactic === 'collect') {
    const loot = (o.loot ?? [])
      .filter((l) => l.until > o.tick)
      .sort((a, b) => distance(o.self, a) - distance(o.self, b))[0];
    if (loot && distance(o.self, loot) <= 6) {
      target = loot;
      radius = 0;
    } else
      target =
        [...o.nodes].sort(
          (a, b) =>
            distance(o.self, a) +
            Math.max(0, (a.readyAt ?? 0) - o.tick) / 4 -
            distance(o.self, b) -
            Math.max(0, (b.readyAt ?? 0) - o.tick) / 4,
        )[0] ?? o.beacon;
  }
  if (distance(o.self, target) <= radius) return { ...a, activate: tactic !== 'intercept' };
  [a.dx, a.dz] = route(o, target, radius);
  if (distance(o.self, target) > 5 && ready(o, 2)) {
    // Avoid a dash ending inside an active hazard; exact geometry is code's responsibility.
    let x = o.self.x,
      z = o.self.z;
    for (let i = 0; i < 4; i++) {
      if (!free(o, x + a.dx, z + a.dz)) break;
      x += a.dx;
      z += a.dz;
    }
    if (x !== o.hazard.x || o.hazard.activeUntil <= o.tick) {
      a.slot = 2;
      a.activate = true;
    }
  }
  return a;
}
export function tactical(o: Observation) {
  return execute(o, scriptedChoice(o));
}
export function question(o: Observation) {
  const available = options(o);
  const descriptions: Record<Tactic, string> = {
    bank: 'Deliver current cargo at the beacon. A 12-tick stationary channel earns 10 per crystal, or 15 during bonus. Damage/movement cancels it. Passive opponents do not block it.',
    collect:
      'Harvest the nearest ready crystal supply or collect dropped cargo. Carry up to 3. Harvest grants flux. More cargo means more points per trip but more to lose.',
    intercept:
      'Chase the opponent and use Disrupt within 3 blocks, if ready and unshielded. Deals one damage, interrupts delivery and pushes them two blocks. No kill points.',
    shield:
      'Spend one flux on Ward now: 20 ticks of immunity. Protect a valuable delivery or survive a hazard. Requires 8 ticks recovery before another ability.',
    escape:
      'Move away from the hazard or opponent; use Dash if ready. Preserve cargo/health, temporarily give up the objective.',
    cover:
      'Place a temporary adjacent wall toward the opponent. Costs one flux; blocks movement and Disrupt line of sight for 100 ticks. Useful cover, but may obstruct our own route.',
  };
  return {
    state: {
      goal: 'Maximize our final score relative to opponent. This is a real-time crystal-delivery arena; 20 ticks = one second. Choose a tactical priority, not prose.',
      tick: o.tick,
      timeLeft: o.duration - o.tick,
      self: o.self,
      opponent: o.opponent,
      beacon: { ...o.beacon, distance: distance(o.self, o.beacon) },
      opponentDistance: distance(o.self, o.opponent),
      hazard: o.hazard,
      threatened: threatened(o),
      nodes: o.nodes.map((n) => ({ ...n, distance: distance(o.self, n) })),
      blocks: o.blocks,
      loot: o.loot ?? [],
    },
    questions: {
      tactic: {
        type: 'choice',
        instructions:
          'Select the most useful available tactic for the next half-second. Deliver cargo frequently. Prefer collection over aimless combat. Defend a threatened channel; avoid hazards. Consider bonus timing, cooldowns, health, cargo and opponent behavior. Do not chase an invulnerable opponent.',
        criteria: Object.fromEntries(available.map((k) => [k, descriptions[k]])),
      },
    },
  };
}
export class TacticalPolicy {
  pending: { id: string; tick: number; choices: Tactic[]; at: number } | null = null;
  choice: Tactic | null = null;
  chosenTick = -100;
  nextCall = 0;
  calls = 0;
  lastMatch = '';
  metrics = {
    accepted: 0,
    late: 0,
    invalid: 0,
    errors: 0,
    fallbackSteps: 0,
    modelSteps: 0,
    choices: {} as Record<string, number>,
  };
  constructor(publicMode: 'scripted' | 'jev' = 'jev') {
    this.mode = publicMode;
  }
  mode: 'scripted' | 'jev';
  respond(message: any, currentTick: number) {
    if (!this.pending || message.requestId !== this.pending.id) return;
    const p = this.pending;
    this.pending = null;
    if (message.error) {
      this.metrics.errors++;
      return;
    }
    if (currentTick - p.tick > 16 || performance.now() - p.at > 800) {
      this.metrics.late++;
      return;
    }
    const choice = message.result?.answers?.tactic?.choice;
    if (!p.choices.includes(choice)) {
      this.metrics.invalid++;
      return;
    }
    this.choice = choice;
    this.chosenTick = currentTick;
    this.metrics.accepted++;
    this.metrics.choices[choice] = (this.metrics.choices[choice] ?? 0) + 1;
  }
  step(o: Observation) {
    if (this.lastMatch !== o.matchId) {
      this.lastMatch = o.matchId;
      this.choice = null;
      this.chosenTick = -100;
      this.pending = null;
      this.nextCall = 0;
      this.calls = 0;
    }
    if (this.pending && performance.now() - this.pending.at > 1000) {
      this.pending = null;
      this.metrics.late++;
    }
    const available = options(o);
    let request: any = null;
    if (
      this.mode === 'jev' &&
      available.length > 1 &&
      !this.pending &&
      o.tick >= this.nextCall &&
      this.calls < 360
    ) {
      const id = `${o.matchId}:${o.self.seat}:${++this.calls}`;
      this.pending = { id, tick: o.tick, choices: available, at: performance.now() };
      this.nextCall = o.tick + 10;
      request = { type: 'model', provider: 'jev', requestId: id, observedTick: o.tick, ...question(o) };
    }
    const selected =
      this.mode === 'jev' && this.choice && o.tick - this.chosenTick <= 20 && available.includes(this.choice)
        ? this.choice
        : null;
    if (selected) this.metrics.modelSteps++;
    else this.metrics.fallbackSteps++;
    return {
      action: execute(o, selected ?? scriptedChoice(o)),
      request,
      tactic: selected ?? scriptedChoice(o),
      source: selected ? 'jev' : 'scripted',
    };
  }
}
