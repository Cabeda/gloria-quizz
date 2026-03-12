import { describe, it, expect, beforeEach } from "vitest";
import { mockSql } from "../setup";
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [
      { id: "ABC123", quiz_id: "q1", phase: "lobby", current_question_index: 0, question_open: false, created_at: "2025-01-01", updated_at: "2025-01-01" },
    ]);
    mockSql.mockQuery(/SELECT \* FROM quizzes/, [
      { id: "q1", title: "Test Quiz" },
    ]);
    mockSql.mockQuery(/SELECT \* FROM questions/, [
      { id: "qn1", text: "What?", type: "multiple-choice", options: ["A", "B"], correct_answer: "A", points: 1, sort_order: 0 },
    ]);
    mockSql.mockQuery(/SELECT \* FROM players/, [
      { id: "p1", room_id: "ABC123", name: "Alice", emoji: "🧒", color: "#e74c3c", score: 0, is_connected: true, joined_at: "2025-01-01" },
    ]);
    mockSql.mockQuery(/SELECT a\.\*.*FROM answers/, []);
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, []);
    const { request, params } = makeGetRequest("NOPE");
    const res = await GET(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns null currentQuestion when index is out of bounds", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [
      { id: "ABC123", quiz_id: "q1", phase: "lobby", current_question_index: 99, question_open: false, created_at: "2025-01-01", updated_at: "2025-01-01" },
    ]);
    mockSql.mockQuery(/SELECT \* FROM quizzes/, [{ id: "q1", title: "Test Quiz" }]);
    mockSql.mockQuery(/SELECT \* FROM questions/, []); // no questions
    mockSql.mockQuery(/SELECT \* FROM players/, []);

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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [{ id: "ABC123" }]);
    mockSql.mockQuery(/UPDATE rooms/, []);
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, []);
    const { request, params } = makePatchRequest("NOPE", { phase: "playing" });
    const res = await PATCH(request, { params });
    expect(res.status).toBe(404);
  });
});
