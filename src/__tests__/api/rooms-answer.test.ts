import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { POST } from "@/app/api/rooms/[code]/answer/route";

function makeRequest(code: string, body: unknown) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ code }),
  };
}

describe("POST /api/rooms/[code]/answer", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true });
    mockPrisma.answer.findFirst.mockResolvedValue(null); // not answered yet
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2,
    });
    mockPrisma.answer.create.mockResolvedValue({ id: "test-id-1234" });
    mockPrisma.player.update.mockResolvedValue({});
  });

  it("accepts a correct MC answer and awards points", async () => {
    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
  });

  it("accepts a wrong MC answer", async () => {
    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "London",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isCorrect).toBe(false);
  });

  it("returns null isCorrect for open-ended questions", async () => {
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q2", type: "open-ended", correctAnswer: null, points: 1,
    });

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q2",
      answerText: "My answer",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isCorrect).toBeNull();
  });

  it("returns 400 if playerId is missing", async () => {
    const { request, params } = makeRequest("ABC123", {
      questionId: "q1",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 if questionId is missing", async () => {
    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 if room not found", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);
    const { request, params } = makeRequest("NOPE", {
      playerId: "p1",
      questionId: "q1",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 if question is closed", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: false });
    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/closed/i);
  });

  it("returns 400 if already answered", async () => {
    mockPrisma.answer.findFirst.mockResolvedValue({ id: "existing" });
    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/already answered/i);
  });

  it("returns 404 if question not found", async () => {
    mockPrisma.question.findUnique.mockResolvedValue(null);
    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "nope",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(404);
  });
});
