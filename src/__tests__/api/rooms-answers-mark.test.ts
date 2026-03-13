import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { PATCH } from "@/app/api/rooms/[code]/answers/[answerId]/route";

function makeRequest(code: string, answerId: string, body: unknown) {
  return {
    request: new Request(
      `http://localhost/api/rooms/${code}/answers/${answerId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    ),
    params: Promise.resolve({ code, answerId }),
  };
}

describe("PATCH /api/rooms/[code]/answers/[answerId]", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.answer.findFirst.mockResolvedValue({
      id: "a1", playerId: "p1", isCorrect: null,
      question: { points: 3 },
    });
    mockPrisma.answer.update.mockResolvedValue({});
    mockPrisma.player.update.mockResolvedValue({});
  });

  it("marks answer as correct and awards points", async () => {
    const { request, params } = makeRequest("ABC123", "a1", { isCorrect: true });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("marks answer as wrong (no points change from null)", async () => {
    const { request, params } = makeRequest("ABC123", "a1", { isCorrect: false });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
  });

  it("deducts points when changing from correct to wrong", async () => {
    mockPrisma.answer.findFirst.mockResolvedValue({
      id: "a1", playerId: "p1", isCorrect: true,
      question: { points: 3 },
    });

    const { request, params } = makeRequest("ABC123", "a1", { isCorrect: false });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
  });

  it("returns 400 if isCorrect is not boolean", async () => {
    const { request, params } = makeRequest("ABC123", "a1", { isCorrect: "yes" });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/isCorrect.*boolean/i);
  });

  it("returns 404 if answer not found", async () => {
    mockPrisma.answer.findFirst.mockResolvedValue(null);
    const { request, params } = makeRequest("ABC123", "nope", { isCorrect: true });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(404);
  });

  it("does not change score when marking already-wrong answer as wrong", async () => {
    mockPrisma.answer.findFirst.mockResolvedValue({
      id: "a1", playerId: "p1", isCorrect: false,
      question: { points: 3 },
    });

    const { request, params } = makeRequest("ABC123", "a1", { isCorrect: false });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
  });

  it("awards points when changing from null to correct", async () => {
    mockPrisma.answer.findFirst.mockResolvedValue({
      id: "a1", playerId: "p1", isCorrect: null,
      question: { points: 5 },
    });

    const { request, params } = makeRequest("ABC123", "a1", { isCorrect: true });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
  });

  it("uses default 1 point when points is falsy", async () => {
    mockPrisma.answer.findFirst.mockResolvedValue({
      id: "a1", playerId: "p1", isCorrect: null,
      question: { points: 0 },
    });

    const { request, params } = makeRequest("ABC123", "a1", { isCorrect: true });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
  });
});
