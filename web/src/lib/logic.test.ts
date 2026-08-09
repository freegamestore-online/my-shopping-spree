import { describe, it, expect } from "vitest";
import {
  clamp,
  dist2,
  collides,
  clampToArena,
  randomItemPosition,
  ARENA_HALF,
  PICKUP_RADIUS,
  ITEM_POINTS,
} from "./logic";

describe("clamp", () => {
  it("clamps below min", () => expect(clamp(-5, 0, 10)).toBe(0));
  it("clamps above max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("passes through mid-range", () => expect(clamp(5, 0, 10)).toBe(5));
});

describe("dist2", () => {
  it("returns 0 for same point", () => expect(dist2(0, 0, 0, 0)).toBe(0));
  it("returns 25 for 3-4-5 triangle", () => expect(dist2(0, 0, 3, 4)).toBe(25));
});

describe("collides", () => {
  it("detects overlap", () => expect(collides(0, 0, 0.5, 0.5)).toBe(true));
  it("misses distant point", () => expect(collides(0, 0, 10, 10)).toBe(false));
  it("boundary: exactly at radius", () =>
    expect(collides(0, 0, PICKUP_RADIUS, 0)).toBe(true));
});

describe("clampToArena", () => {
  it("clamps x", () => expect(clampToArena(99, 0)[0]).toBe(ARENA_HALF));
  it("clamps z", () => expect(clampToArena(0, -99)[1]).toBe(-ARENA_HALF));
  it("passes through centre", () => expect(clampToArena(0, 0)).toEqual([0, 0]));
});

describe("randomItemPosition", () => {
  const seeded = (() => {
    let n = 0;
    return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  })();
  it("stays within arena", () => {
    for (let i = 0; i < 50; i++) {
      const [x, z] = randomItemPosition(0, 0, ARENA_HALF - 1, 4, seeded);
      expect(Math.abs(x)).toBeLessThanOrEqual(ARENA_HALF);
      expect(Math.abs(z)).toBeLessThanOrEqual(ARENA_HALF);
    }
  });
});

describe("ITEM_POINTS", () => {
  it("star is worth the most", () => {
    const vals = Object.values(ITEM_POINTS);
    expect(ITEM_POINTS.star).toBe(Math.max(...vals));
  });
});
