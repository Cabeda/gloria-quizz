import { describe, it, expect, beforeEach } from "vitest";
import { mockSql } from "../setup";
import { POST } from "@/app/api/rooms/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rooms", () => {
  beforeEach(() => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT id FROM quizzes/, [{ id: "quiz1" }]);
    mockSql.mockQuery(/SELECT id FROM rooms/, []); // no collision
    mockSql.mockQuery(/INSERT INTO rooms/, []);
  });

  it("creates a room for a valid quiz", async () => {
    const res = await POST(makeRequest({ quizId: "quiz1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.code).toBeDefined();
    expect(data.code.length).toBe(6);
  });

  it("returns 400 if quizId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/quizId required/i);
  });

  it("returns 404 if quiz does not exist", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT id FROM quizzes/, []);
    const res = await POST(makeRequest({ quizId: "nope" }));
    expect(res.status).toBe(404);
  });

  it("retries room code on collision", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT id FROM quizzes/, [{ id: "quiz1" }]);
    let callCount = 0;
    mockSql.mockQuery(/SELECT id FROM rooms/, () => {
      callCount++;
      // First call: collision, second call: no collision
      return callCount <= 1 ? [{ id: "TAKEN1" }] : [];
    });
    mockSql.mockQuery(/INSERT INTO rooms/, []);
    const res = await POST(makeRequest({ quizId: "quiz1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.code).toBeDefined();
  });
});
