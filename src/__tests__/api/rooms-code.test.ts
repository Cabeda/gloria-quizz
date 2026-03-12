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

describe("GET /api/rooms/[code]", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.room.findUnique.mockResolvedValue({
      id: "ABC123",
      quizId: "q1",
      phase: "lobby",
      currentQuestionIndex: 0,
      questionOpen: false,
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01",
      quiz: {
        id: "q1",
        title: "Test Quiz",
        questions: [
          { id: "qn1", text: "What?", type: "multiple-choice", options: ["A", "B"], correctAnswer: "A", points: 1, sortOrder: 0 },
        ],
      },
      players: [
        { id: "p1", roomId: "ABC123", name: "Alice", emoji: "🧒", color: "#e74c3c", score: 0, isConnected: true, joinedAt: "2025-01-01" },
      ],
    });
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
  });

  it("returns null currentQuestion when index is out of bounds", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({
      id: "ABC123",
      quizId: "q1",
      phase: "lobby",
      currentQuestionIndex: 99,
      questionOpen: false,
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01",
      quiz: { id: "q1", title: "Test Quiz", questions: [] },
      players: [],
    });

    const { request, params } = makeGetRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentQuestion).toBeNull();
    expect(data.answers).toEqual([]);
  });
});

describe("PATCH /api/rooms/[code]", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.room.update.mockResolvedValue({ id: "ABC123" });
  });

  it("updates phase", async () => {
    const { request, params } = makePatchRequest("ABC123", { phase: "playing" });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("updates currentQuestionIndex", async () => {
    const { request, params } = makePatchRequest("ABC123", { currentQuestionIndex: 2 });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
  });

  it("updates questionOpen", async () => {
    const { request, params } = makePatchRequest("ABC123", { questionOpen: true });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown room", async () => {
    mockPrisma.room.update.mockRejectedValue(new Error("Record not found"));
    const { request, params } = makePatchRequest("NOPE", { phase: "playing" });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(404);
  });
});
