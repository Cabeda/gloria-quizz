import { describe, it, expect, beforeEach } from "vitest";
import { mockSql } from "../setup";
import { GET } from "@/app/api/rooms/[code]/answers/route";

function makeRequest(code: string) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}/answers`),
    params: Promise.resolve({ code }),
  };
}

describe("GET /api/rooms/[code]/answers", () => {
  beforeEach(() => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT current_question_index/, [
      { current_question_index: 0, quiz_id: "q1" },
    ]);
    mockSql.mockQuery(/SELECT id FROM questions/, [{ id: "qn1" }]);
    mockSql.mockQuery(/SELECT a\.\*.*FROM answers/, [
      {
        id: "a1", room_id: "ABC123", question_id: "qn1", player_id: "p1",
        answer_text: "Paris", is_correct: true, answered_at: "2025-01-01",
        player_name: "Alice", player_emoji: "🧒", player_color: "#e74c3c",
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT current_question_index/, []);
    const { request, params } = makeRequest("NOPE");
    const res = await GET(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns empty array if no current question", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT current_question_index/, [
      { current_question_index: 5, quiz_id: "q1" },
    ]);
    mockSql.mockQuery(/SELECT id FROM questions/, []); // no questions
    const { request, params } = makeRequest("ABC123");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
