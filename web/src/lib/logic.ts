/**
 * Pure game math — no React, no three.js.
 */

import type { ItemKind } from "../types";

/** Half-width of the square store floor. */
export const ARENA_HALF = 16;
/** Player (cart) move speed, in world units per second. */
export const PLAYER_SPEED = 10;
/** How close the cart must get to an item to collect it. */
export const PICKUP_RADIUS = 1.4;
/** Seconds on the clock per round. */
export const ROUND_SECONDS = 45;
/** How many items are on the floor at once. */
export const ITEM_COUNT = 8;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Squared 2D (x,z) distance. */
export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

/** True when (px,pz) is within `radius` of (ox,oz). */
export function collides(
  px: number,
  pz: number,
  ox: number,
  oz: number,
  radius = PICKUP_RADIUS,
): boolean {
  return dist2(px, pz, ox, oz) <= radius * radius;
}

/** Keep a point inside the arena bounds. */
export function clampToArena(
  x: number,
  z: number,
  half = ARENA_HALF,
): [number, number] {
  return [clamp(x, -half, half), clamp(z, -half, half)];
}

/** Point values per item kind. */
export const ITEM_POINTS: Record<ItemKind, number> = {
  apple: 1,
  banana: 1,
  milk: 2,
  cookie: 2,
  ice_cream: 3,
  star: 5,
};

/** Emoji label per item kind (used in HUD). */
export const ITEM_EMOJI: Record<ItemKind, string> = {
  apple: "🍎",
  banana: "🍌",
  milk: "🥛",
  cookie: "🍪",
  ice_cream: "🍦",
  star: "⭐",
};

const KINDS: ItemKind[] = ["apple", "banana", "milk", "cookie", "ice_cream", "star"];
/** Weighted random kind — stars are rare. */
export function randomKind(rand: () => number = Math.random): ItemKind {
  const r = rand();
  if (r < 0.25) return "apple";
  if (r < 0.50) return "banana";
  if (r < 0.65) return "milk";
  if (r < 0.80) return "cookie";
  if (r < 0.93) return "ice_cream";
  return "star";
}

/** All kinds list (for reference). */
export { KINDS };

/**
 * A random item position at least `minDist` from (avoidX, avoidZ).
 */
export function randomItemPosition(
  avoidX: number,
  avoidZ: number,
  half = ARENA_HALF - 1,
  minDist = 4,
  rand: () => number = Math.random,
): [number, number] {
  for (let i = 0; i < 20; i++) {
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    if (dist2(x, z, avoidX, avoidZ) >= minDist * minDist) return [x, z];
  }
  return clampToArena(-avoidX, -avoidZ, half);
}
