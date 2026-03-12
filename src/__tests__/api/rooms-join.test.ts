import { describe, it, expect, beforeEach } from "vitest";
import { mockSql } from "../setup";
import { POST } from "@/app/api/rooms/[code]/join/route";

function makeRequest(code: string, body: unknown) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ code }),
  };
}

describe("POST /api/rooms/[code]/join", () => {
  beforeEach(() => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [{ id: "ABC123", phase: "lobby" }]);
    mockSql.mockQuery(/SELECT \* FROM players/, []);
    mockSql.mockQuery(/INSERT INTO players/, []);
  });

  it("allows a player to join a lobby room", async () => {
    const { request, params } = makeRequest("ABC123", { name: "Alice" });
    const res = await POST(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Alice");
    expect(data.id).toBe("test-id-1234");
    expect(data.emoji).toBeDefined();
    expect(data.color).toBeDefined();
    expect(data.score).toBe(0);
  });

  it("returns 400 if name is empty", async () => {
    const { request, params } = makeRequest("ABC123", { name: "" });
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name required/i);
  });

  it("returns 400 if name is missing", async () => {
    const { request, params } = makeRequest("ABC123", {});
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 if room does not exist", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, []);
    const { request, params } = makeRequest("NOPE", { name: "Bob" });
    const res = await POST(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 if game already started", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [{ id: "ABC123", phase: "playing" }]);
    const { request, params } = makeRequest("ABC123", { name: "Bob" });
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/already started/i);
  });

  it("returns 400 if room is full (10 players)", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [{ id: "ABC123", phase: "lobby" }]);
    mockSql.mockQuery(/SELECT \* FROM players/, Array(10).fill({ id: "p" }));
    const { request, params } = makeRequest("ABC123", { name: "Extra" });
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/full/i);
  });
});
