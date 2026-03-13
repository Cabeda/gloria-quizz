import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { GET } from "@/app/api/rooms/[code]/players/route";

function makeRequest(code: string) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}/players`),
    params: Promise.resolve({ code }),
  };
}

describe("GET /api/rooms/[code]/players", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.player.findMany.mockResolvedValue([
      {
        id: "p1", roomId: "ABC123", name: "Alice", emoji: "🧒",
        color: "#e74c3c", score: 5, isConnected: true, joinedAt: "2025-01-01",
      },
      {
        id: "p2", roomId: "ABC123", name: "Bob", emoji: "👦",
        color: "#3498db", score: 3, isConnected: true, joinedAt: "2025-01-01",
      },
    ]);
  });

  it("returns player list", async () => {
    const { request, params } = makeRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Alice");
    expect(data[0].score).toBe(5);
    expect(data[1].name).toBe("Bob");
  });

  it("returns empty array if no players", async () => {
    mockPrisma.player.findMany.mockResolvedValue([]);
    const { request, params } = makeRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
