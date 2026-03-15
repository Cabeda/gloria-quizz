import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { GET, PATCH } from "@/app/api/rooms/[code]/route";

function makeGetRequest(code: string) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}`),
    params: Promise.resolve({ code }),
  };
}

function makePatchRequest(code: string, body: unknown) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ code }),
  };
}

function makeRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: "ABC123",
    quizId: "q1",
    phase: "lobby",
    currentQuestionIndex: 0,
    questionOpen: false,
    questionStartedAt: null,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    quiz: {
      id: "q1",
      title: "Test Quiz",
      questions: [
        { id: "qn1", text: "What?", type: "multiple-choice", options: ["A", "B"], correctAnswer: "A", points: 1, sortOrder: 0, timeLimit: null },
      ],
    },
    players: [
      { id: "p1", roomId: "ABC123", name: "Alice", emoji: "🧒", color: "#e74c3c", score: 0, isConnected: true, joinedAt: "2025-01-01" },
    ],
    ...overrides,
  };
}

describe("GET /api/rooms/[code]", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.room.findUnique.mockResolvedValue(makeRoom());
    mockPrisma.answer.findMany.mockResolvedValue([]);
  });

  it("returns full room state", async () => {
    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.room.id).toBe("ABC123");
    expect(data.room.phase).toBe("lobby");
    expect(data.quiz.title).toBe("Test Quiz");
    expect(data.players).toHaveLength(1);
    expect(data.players[0].name).toBe("Alice");
    expect(data.currentQuestion).toBeDefined();
    expect(data.currentQuestion.text).toBe("What?");
  });

  it("returns 404 for unknown room", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);
    const { request, params } = makeGetRequest("NOPE");
    const res = await GET(request, { params });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Room not found");
  });

  it("returns null currentQuestion when index is out of bounds", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({ currentQuestionIndex: 99, quiz: { id: "q1", title: "Test Quiz", questions: [] }, players: [] })
    );

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentQuestion).toBeNull();
    expect(data.answers).toEqual([]);
  });

  // --- Streak calculation (covers lines 22-26) ---

  it("computes streaks from consecutive correct answers", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({
        players: [
          { id: "p1", roomId: "ABC123", name: "Alice", emoji: "🧒", color: "#e74c3c", score: 3, isConnected: true, joinedAt: "2025-01-01" },
          { id: "p2", roomId: "ABC123", name: "Bob", emoji: "🧑", color: "#3498db", score: 1, isConnected: true, joinedAt: "2025-01-01" },
        ],
      })
    );

    // answer.findMany is called twice: once for streaks (all answers), once for current question answers
    // The first call (streaks) returns answer history ordered by answeredAt desc
    mockPrisma.answer.findMany
      .mockResolvedValueOnce([
        // Alice: 3 correct in a row (most recent first)
        { playerId: "p1", isCorrect: true },
        { playerId: "p1", isCorrect: true },
        { playerId: "p1", isCorrect: true },
        // Bob: 1 correct then 1 wrong (most recent first)
        { playerId: "p2", isCorrect: true },
        { playerId: "p2", isCorrect: false },
        { playerId: "p1", isCorrect: false }, // old wrong, already broken by seenBreak
      ])
      .mockResolvedValueOnce([]); // current question answers (lobby phase won't fetch, but just in case)

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();

    const alice = data.players.find((p: { name: string }) => p.name === "Alice");
    const bob = data.players.find((p: { name: string }) => p.name === "Bob");
    expect(alice.streak).toBe(3);
    expect(bob.streak).toBe(1);
  });

  it("returns streak 0 when player has no correct answers", async () => {
    mockPrisma.answer.findMany.mockResolvedValueOnce([
      { playerId: "p1", isCorrect: false },
      { playerId: "p1", isCorrect: false },
    ]);

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();
    expect(data.players[0].streak).toBe(0);
  });

  it("returns streak 0 for empty room (no players)", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({ players: [] })
    );

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();
    expect(data.players).toEqual([]);
  });

  // --- Answer fetching during question/reveal phases (covers lines 75-84) ---

  it("fetches answers during question phase", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({ phase: "question", questionOpen: true })
    );

    // First call: current question answers (line 75), Second call: addStreaks (line 99)
    mockPrisma.answer.findMany
      .mockResolvedValueOnce([
        {
          id: "a1", roomId: "ABC123", questionId: "qn1", playerId: "p1",
          answerText: "A", isCorrect: true, answeredAt: "2025-01-01T00:00:01",
          player: { name: "Alice", emoji: "🧒", color: "#e74c3c" },
        },
      ])
      .mockResolvedValueOnce([]); // streaks

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();

    expect(data.answers).toHaveLength(1);
    expect(data.answers[0].id).toBe("a1");
    expect(data.answers[0].answerText).toBe("A");
    expect(data.answers[0].isCorrect).toBe(true);
    expect(data.answers[0].playerName).toBe("Alice");
    expect(data.answers[0].playerEmoji).toBe("🧒");
    expect(data.answers[0].playerColor).toBe("#e74c3c");
  });

  it("fetches answers during reveal phase", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({ phase: "reveal" })
    );

    mockPrisma.answer.findMany
      .mockResolvedValueOnce([
        {
          id: "a1", roomId: "ABC123", questionId: "qn1", playerId: "p1",
          answerText: "B", isCorrect: false, answeredAt: "2025-01-01T00:00:01",
          player: { name: "Alice", emoji: "🧒", color: "#e74c3c" },
        },
      ])
      .mockResolvedValueOnce([]); // streaks

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();

    expect(data.answers).toHaveLength(1);
    expect(data.answers[0].isCorrect).toBe(false);
    expect(data.answers[0].playerName).toBe("Alice");
  });

  it("does not fetch answers during lobby phase", async () => {
    // Default room is in lobby phase
    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();

    expect(data.answers).toEqual([]);
    // answer.findMany should only be called once (for streaks), not twice
    expect(mockPrisma.answer.findMany).toHaveBeenCalledTimes(1);
  });

  it("does not fetch answers during finished phase", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({ phase: "finished" })
    );

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();

    expect(data.answers).toEqual([]);
    expect(mockPrisma.answer.findMany).toHaveBeenCalledTimes(1);
  });

  it("defaults to question index 0 when currentQuestionIndex is null", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({ currentQuestionIndex: null })
    );

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();
    // Should fall back to index 0 and return the first question
    expect(data.currentQuestion).toBeDefined();
    expect(data.currentQuestion.text).toBe("What?");
  });

  it("includes questionStartedAt in room response", async () => {
    const startedAt = "2025-06-01T12:00:00.000Z";
    mockPrisma.room.findUnique.mockResolvedValue(
      makeRoom({ questionStartedAt: startedAt })
    );

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    const data = await res.json();
    expect(data.room.questionStartedAt).toBe(startedAt);
  });
});

describe("PATCH /api/rooms/[code]", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.room.update.mockResolvedValue({ id: "ABC123" });
  });

  it("updates phase and passes correct data to Prisma", async () => {
    const { request, params } = makePatchRequest("ABC123", { phase: "playing" });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    const updateCall = mockPrisma.room.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "ABC123" });
    expect(updateCall.data.phase).toBe("playing");
    expect(updateCall.data.updatedAt).toBeInstanceOf(Date);
  });

  it("updates currentQuestionIndex with correct value", async () => {
    const { request, params } = makePatchRequest("ABC123", { currentQuestionIndex: 2 });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);

    const updateCall = mockPrisma.room.update.mock.calls[0][0];
    expect(updateCall.data.currentQuestionIndex).toBe(2);
    expect(updateCall.data.phase).toBeUndefined();
    expect(updateCall.data.questionOpen).toBeUndefined();
  });

  it("sets questionStartedAt when opening a question", async () => {
    const { request, params } = makePatchRequest("ABC123", { questionOpen: true });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);

    const updateCall = mockPrisma.room.update.mock.calls[0][0];
    expect(updateCall.data.questionOpen).toBe(true);
    expect(updateCall.data.questionStartedAt).toBeInstanceOf(Date);
  });

  it("does not set questionStartedAt when closing a question", async () => {
    const { request, params } = makePatchRequest("ABC123", { questionOpen: false });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);

    const updateCall = mockPrisma.room.update.mock.calls[0][0];
    expect(updateCall.data.questionOpen).toBe(false);
    expect(updateCall.data.questionStartedAt).toBeUndefined();
  });

  it("handles partial updates — only phase, no other fields", async () => {
    const { request, params } = makePatchRequest("ABC123", { phase: "reveal" });
    await PATCH(request, { params });

    const updateCall = mockPrisma.room.update.mock.calls[0][0];
    expect(updateCall.data.phase).toBe("reveal");
    expect(updateCall.data.currentQuestionIndex).toBeUndefined();
    expect(updateCall.data.questionOpen).toBeUndefined();
  });

  it("handles combined update — phase + questionOpen + currentQuestionIndex", async () => {
    const { request, params } = makePatchRequest("ABC123", {
      phase: "question",
      currentQuestionIndex: 3,
      questionOpen: true,
    });
    await PATCH(request, { params });

    const updateCall = mockPrisma.room.update.mock.calls[0][0];
    expect(updateCall.data.phase).toBe("question");
    expect(updateCall.data.currentQuestionIndex).toBe(3);
    expect(updateCall.data.questionOpen).toBe(true);
    expect(updateCall.data.questionStartedAt).toBeInstanceOf(Date);
  });

  it("returns 404 for unknown room", async () => {
    mockPrisma.room.update.mockRejectedValue(new Error("Record not found"));
    const { request, params } = makePatchRequest("NOPE", { phase: "playing" });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Room not found");
  });
});
