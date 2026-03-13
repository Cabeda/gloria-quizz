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
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: null });
    mockPrisma.answer.findFirst.mockResolvedValue(null);
    mockPrisma.answer.findMany.mockResolvedValue([]); // no previous answers = streak 0
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: null,
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
    expect(data.pointsAwarded).toBe(2);
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
    expect(data.pointsAwarded).toBe(0);
  });

  it("returns null isCorrect for open-ended questions", async () => {
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q2", type: "open-ended", correctAnswer: null, points: 1, timeLimit: null,
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
    expect(data.pointsAwarded).toBe(0);
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
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: false, questionStartedAt: null });
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

  // --- Speed bonus tests ---

  it("awards speed bonus for fast correct answer with timer", async () => {
    // Question started 5s ago, timeLimit is 30s => 25s remaining
    // bonus = round(2 * 25/30) = round(1.67) = 2, total = 2 + 2 = 4
    const startedAt = new Date(Date.now() - 5000);
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: startedAt });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: 30,
    });

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
    expect(data.pointsAwarded).toBeGreaterThanOrEqual(3);
    expect(data.pointsAwarded).toBeLessThanOrEqual(4);
  });

  it("awards minimal bonus for slow correct answer near timeout", async () => {
    // Question started 28s ago, timeLimit is 30s => 2s remaining
    // bonus = round(2 * 2/30) = round(0.13) = 0, total = 2
    const startedAt = new Date(Date.now() - 28000);
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: startedAt });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: 30,
    });

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
    expect(data.pointsAwarded).toBe(2);
  });

  it("awards base points only when timer has expired", async () => {
    // Question started 35s ago, timeLimit is 30s => expired
    const startedAt = new Date(Date.now() - 35000);
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: startedAt });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: 30,
    });

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
    expect(data.pointsAwarded).toBe(2);
  });

  it("awards no speed bonus for wrong answer even with timer", async () => {
    const startedAt = new Date(Date.now() - 2000);
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: startedAt });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: 30,
    });

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "London",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(false);
    expect(data.pointsAwarded).toBe(0);
  });

  it("awards base points with no bonus when no timer set", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: null });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 3, timeLimit: null,
    });
    // No previous answers = no streak
    mockPrisma.answer.findMany.mockResolvedValue([]);

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
    expect(data.pointsAwarded).toBe(3);
    expect(data.streak).toBe(1);
  });

  // --- Streak bonus tests ---

  it("returns streak 0 for wrong answer", async () => {
    mockPrisma.answer.findMany.mockResolvedValue([]);

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "London",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(false);
    expect(data.streak).toBe(0);
  });

  it("awards 1.5x streak bonus at 3 consecutive correct answers", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: null });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: null,
    });
    // 2 previous correct answers (most recent first) — this will be the 3rd
    mockPrisma.answer.findMany.mockResolvedValue([
      { isCorrect: true },
      { isCorrect: true },
    ]);

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
    expect(data.pointsAwarded).toBe(3); // 2 * 1.5 = 3
    expect(data.streak).toBe(3);
  });

  it("awards 2x streak bonus at 5 consecutive correct answers", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: null });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: null,
    });
    // 4 previous correct answers — this will be the 5th
    mockPrisma.answer.findMany.mockResolvedValue([
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
    ]);

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
    expect(data.pointsAwarded).toBe(4); // 2 * 2 = 4
    expect(data.streak).toBe(5);
  });

  it("streak resets after a wrong answer", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({ id: "ABC123", questionOpen: true, questionStartedAt: null });
    mockPrisma.question.findUnique.mockResolvedValue({
      id: "q1", type: "multiple-choice", correctAnswer: "Paris", points: 2, timeLimit: null,
    });
    // Most recent answer was wrong, so streak is 0 — this correct answer starts a new streak of 1
    mockPrisma.answer.findMany.mockResolvedValue([
      { isCorrect: false },
      { isCorrect: true },
      { isCorrect: true },
    ]);

    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "q1",
      answerText: "Paris",
    });
    const res = await POST(request, { params });
    const data = await res.json();
    expect(data.isCorrect).toBe(true);
    expect(data.pointsAwarded).toBe(2); // streak 1 = no bonus
    expect(data.streak).toBe(1);
  });
});
