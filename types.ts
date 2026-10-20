export interface Action { seq:number; observedTick:number; dx:number; dz:number; slot:number; activate:boolean }
export interface Bot {
  seat: number;
  x: number;
  z: number;
  health: number;
  cargo: number;
  flux: number;
  score: number;
  wardUntil: number;
  cooldowns: number[];
  respawnUntil?: number;
  recoveryUntil?: number;
  depositUntil?: number;
  facingX?: number;
  facingZ?: number;
}
export interface Observation {
  protocol: string;
  ruleset: string;
  matchId: string;
  tick: number;
  duration: number;
  status: 'idle' | 'running' | 'completed';
  self: Bot;
  opponent: Bot;
  beacon: {
    x: number;
    z: number;
    multiplier?: number;
    bonusAt?: number;
    movesAt?: number;
    next?: { x: number; z: number };
  };
  nodes: { x: number; z: number; readyAt?: number }[];
  hazard: { x: number; warnUntil: number; activeUntil: number };
  blocks: { x: number; z: number; until: number }[];
  loot?: { x: number; z: number; amount: number; until: number }[];
}
export interface ArenaState {
  protocol: string;
  ruleset: string;
  matchId: string;
  tick: number;
  duration: number;
  status: string;
  bots: Bot[];
  beacon: {
    x: number;
    z: number;
    multiplier?: number;
    bonusAt?: number;
    movesAt?: number;
    next?: { x: number; z: number };
  };
  nodes: { x: number; z: number; readyAt?: number }[];
  hazard: { x: number; warnUntil: number; activeUntil: number };
  blocks: { x: number; z: number; until: number }[];
  loot?: { x: number; z: number; amount: number; until: number }[];
  events: { tick: number; kind: string; seat: number }[];
}
