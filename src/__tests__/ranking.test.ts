import { describe, it, expect } from "vitest";
import { rankPlayers, getPlayerRank, rankLabel } from "@/app/types";
import type { Player } from "@/app/types";

function makePlayer(id: string, name: string, score: number): Player {
  return { id, roomId: "R1", name, emoji: "🧒", color: "#e74c3c", score, isConnected: true };
}

describe("rankPlayers", () => {
  it("assigns sequential ranks when all scores are different", () => {
    const players = [makePlayer("a", "Alice", 10), makePlayer("b", "Bob", 5), makePlayer("c", "Carol", 8)];
    const ranked = rankPlayers(players);
    expect(ranked.map((p) => ({ name: p.name, rank: p.rank }))).toEqual([
      { name: "Alice", rank: 1 },
      { name: "Carol", rank: 2 },
      { name: "Bob", rank: 3 },
    ]);
  });

  it("assigns the same rank to players with equal scores (two-way tie for 1st)", () => {
    const players = [makePlayer("a", "Alice", 10), makePlayer("b", "Bob", 10), makePlayer("c", "Carol", 5)];
    const ranked = rankPlayers(players);
    expect(ranked.map((p) => ({ name: p.name, rank: p.rank }))).toEqual([
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 1 },
      { name: "Carol", rank: 2 },
    ]);
  });

  it("assigns the same rank to players with equal scores (three-way tie for 1st)", () => {
    const players = [
      makePlayer("a", "Alice", 10),
      makePlayer("b", "Bob", 10),
      makePlayer("c", "Carol", 10),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.every((p) => p.rank === 1)).toBe(true);
  });

  it("handles tie for 2nd place", () => {
    const players = [
      makePlayer("a", "Alice", 10),
      makePlayer("b", "Bob", 7),
      makePlayer("c", "Carol", 7),
      makePlayer("d", "Dave", 3),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.map((p) => ({ name: p.name, rank: p.rank }))).toEqual([
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 2 },
      { name: "Carol", rank: 2 },
      { name: "Dave", rank: 3 },
    ]);
  });

  it("handles tie for 3rd place", () => {
    const players = [
      makePlayer("a", "Alice", 10),
      makePlayer("b", "Bob", 7),
      makePlayer("c", "Carol", 5),
      makePlayer("d", "Dave", 5),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.map((p) => ({ name: p.name, rank: p.rank }))).toEqual([
      { name: "Alice", rank: 1 },
      { name: "Bob", rank: 2 },
      { name: "Carol", rank: 3 },
      { name: "Dave", rank: 3 },
    ]);
  });

  it("handles all players tied", () => {
    const players = [
      makePlayer("a", "Alice", 0),
      makePlayer("b", "Bob", 0),
      makePlayer("c", "Carol", 0),
      makePlayer("d", "Dave", 0),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.every((p) => p.rank === 1)).toBe(true);
  });

  it("handles a single player", () => {
    const ranked = rankPlayers([makePlayer("a", "Alice", 5)]);
    expect(ranked).toEqual([expect.objectContaining({ name: "Alice", rank: 1 })]);
  });

  it("handles empty array", () => {
    expect(rankPlayers([])).toEqual([]);
  });

  it("sorts by score descending", () => {
    const players = [makePlayer("a", "Alice", 3), makePlayer("b", "Bob", 10), makePlayer("c", "Carol", 7)];
    const ranked = rankPlayers(players);
    expect(ranked.map((p) => p.score)).toEqual([10, 7, 3]);
  });

  it("uses dense ranking (next rank after tie is rank+1, not rank+tiedCount)", () => {
    const players = [
      makePlayer("a", "Alice", 10),
      makePlayer("b", "Bob", 10),
      makePlayer("c", "Carol", 10),
      makePlayer("d", "Dave", 5),
      makePlayer("e", "Eve", 3),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.map((p) => p.rank)).toEqual([1, 1, 1, 2, 3]);
  });
});

describe("getPlayerRank", () => {
  it("returns the correct rank for a specific player", () => {
    const players = [makePlayer("a", "Alice", 10), makePlayer("b", "Bob", 5), makePlayer("c", "Carol", 8)];
    expect(getPlayerRank(players, "a")).toBe(1);
    expect(getPlayerRank(players, "c")).toBe(2);
    expect(getPlayerRank(players, "b")).toBe(3);
  });

  it("returns the same rank for tied players", () => {
    const players = [makePlayer("a", "Alice", 10), makePlayer("b", "Bob", 10), makePlayer("c", "Carol", 5)];
    expect(getPlayerRank(players, "a")).toBe(1);
    expect(getPlayerRank(players, "b")).toBe(1);
    expect(getPlayerRank(players, "c")).toBe(2);
  });

  it("returns last rank for unknown player", () => {
    const players = [makePlayer("a", "Alice", 10)];
    expect(getPlayerRank(players, "unknown")).toBe(1);
  });
});

describe("rankLabel", () => {
  it("returns medal emoji for ranks 1-3", () => {
    expect(rankLabel(1)).toBe("🥇");
    expect(rankLabel(2)).toBe("🥈");
    expect(rankLabel(3)).toBe("🥉");
  });

  it("returns rank number with dot for ranks > 3", () => {
    expect(rankLabel(4)).toBe("4.");
    expect(rankLabel(10)).toBe("10.");
  });
});
