import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { GET } from "@/app/api/rooms/[code]/answers/route";

function makeRequest(code: string) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}/answers`),
    params: Promise.resolve({ code }),
  };
}

describe("GET /api/rooms/[code]/answers", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.room.findUnique.mockResolvedValue({
      currentQuestionIndex: 0,
      quiz: { questions: [{ id: "qn1" }] },
    });
    mockPrisma.answer.findMany.mockResolvedValue([
      {
        id: "a1", roomId: "ABC123", questionId: "qn1", playerId: "p1",
        answerText: "Paris", isCorrect: true, answeredAt: "2025-01-01",
        player: { name: "Alice", emoji: "🧒", color: "#e74c3c" },
      },
    ]);
  });

  it("returns answers for current question", async () => {
    const { request, params } = makeRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].answerText).toBe("Paris");
    expect(data[0].playerName).toBe("Alice");
  });

  it("returns 404 if room not found", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);
    const { request, params } = makeRequest("NOPE");
    const res = await GET(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns empty array if no current question", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({
      currentQuestionIndex: 5,
      quiz: { questions: [] },
    });
    const { request, params } = makeRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
