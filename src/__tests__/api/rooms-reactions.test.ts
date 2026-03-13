import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { _resetReactions } from "@/app/lib/reactions";
import { POST, GET } from "@/app/api/rooms/[code]/reactions/route";

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/rooms/ROOM1/reactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest() {
  return new Request("http://localhost/api/rooms/ROOM1/reactions");
}

const params = Promise.resolve({ code: "ROOM1" });

describe("POST /api/rooms/[code]/reactions", () => {
  beforeEach(() => {
    resetMocks();
    _resetReactions();
  });

  it("creates a reaction successfully", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ROOM1" });
    mockPrisma.player.findFirst.mockResolvedValue({ id: "p1" });

    const res = await POST(makeRequest({ playerId: "p1", emoji: "🔥" }), { params });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.emoji).toBe("🔥");
    expect(data.roomId).toBe("ROOM1");
    expect(data.playerId).toBe("p1");
  });

  it("returns 400 if playerId or emoji missing", async () => {
    const res = await POST(makeRequest({ playerId: "p1" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid emoji", async () => {
    const res = await POST(makeRequest({ playerId: "p1", emoji: "💀" }), { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid emoji");
  });

  it("returns 404 if room not found", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ playerId: "p1", emoji: "🔥" }), { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 if player not in room", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ROOM1" });
    mockPrisma.player.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest({ playerId: "p1", emoji: "🔥" }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 429 when throttled (2 reactions within 3s)", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ROOM1" });
    mockPrisma.player.findFirst.mockResolvedValue({ id: "p1" });

    const res1 = await POST(makeRequest({ playerId: "p1", emoji: "🔥" }), { params });
    expect(res1.status).toBe(201);

    const res2 = await POST(makeRequest({ playerId: "p1", emoji: "😂" }), { params });
    expect(res2.status).toBe(429);
  });

  it("allows different players to react simultaneously", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ROOM1" });
    mockPrisma.player.findFirst.mockResolvedValue({ id: "p1" });

    const res1 = await POST(makeRequest({ playerId: "p1", emoji: "🔥" }), { params });
    expect(res1.status).toBe(201);

    mockPrisma.player.findFirst.mockResolvedValue({ id: "p2" });
    const res2 = await POST(makeRequest({ playerId: "p2", emoji: "😂" }), { params });
    expect(res2.status).toBe(201);
  });
});

describe("GET /api/rooms/[code]/reactions", () => {
  beforeEach(() => {
    resetMocks();
    _resetReactions();
  });

  it("returns empty array when no reactions", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ROOM1" });

    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns recent reactions", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ROOM1" });
    mockPrisma.player.findFirst.mockResolvedValue({ id: "p1" });

    // Add a reaction first
    await POST(makeRequest({ playerId: "p1", emoji: "🎉" }), { params });

    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].emoji).toBe("🎉");
  });

  it("returns 404 if room not found", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);

    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(404);
  });
});
