import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
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
    resetMocks();
    mockPrisma.quiz.findUnique.mockResolvedValue({ id: "quiz1" });
    mockPrisma.room.findUnique.mockResolvedValue(null); // no collision
    mockPrisma.room.create.mockResolvedValue({ id: "ABC123" });
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
    mockPrisma.quiz.findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ quizId: "nope" }));
    expect(res.status).toBe(404);
  });

  it("retries room code on collision", async () => {
    let callCount = 0;
    mockPrisma.room.findUnique.mockImplementation(() => {
      callCount++;
      return Promise.resolve(callCount <= 1 ? { id: "TAKEN1" } : null);
    });
    const res = await POST(makeRequest({ quizId: "quiz1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.code).toBeDefined();
  });
});
