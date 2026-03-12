import { describe, it, expect, beforeEach } from "vitest";
import { mockSql } from "../setup";
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [
      { id: "ABC123", question_open: true },
    ]);
    mockSql.mockQuery(/SELECT id FROM answers/, []); // not answered yet
    mockSql.mockQuery(/SELECT \* FROM questions/, [
      { id: "q1", type: "multiple-choice", correct_answer: "Paris", points: 2 },
    ]);
    mockSql.mockQuery(/INSERT INTO answers/, []);
    mockSql.mockQuery(/UPDATE players/, []);
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [{ id: "ABC123", question_open: true }]);
    mockSql.mockQuery(/SELECT id FROM answers/, []);
    mockSql.mockQuery(/SELECT \* FROM questions/, [
      { id: "q2", type: "open-ended", correct_answer: null, points: 1 },
    ]);
    mockSql.mockQuery(/INSERT INTO answers/, []);

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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, []);
    const { request, params } = makeRequest("NOPE", {
      playerId: "p1",
      questionId: "q1",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns 400 if question is closed", async () => {
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [
      { id: "ABC123", question_open: false },
    ]);
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [{ id: "ABC123", question_open: true }]);
    mockSql.mockQuery(/SELECT id FROM answers/, [{ id: "existing" }]);
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
    mockSql.clearHandlers();
    mockSql.mockQuery(/SELECT \* FROM rooms/, [{ id: "ABC123", question_open: true }]);
    mockSql.mockQuery(/SELECT id FROM answers/, []);
    mockSql.mockQuery(/SELECT \* FROM questions/, []);
    const { request, params } = makeRequest("ABC123", {
      playerId: "p1",
      questionId: "nope",
      answerText: "X",
    });
    const res = await POST(request, { params });
    expect(res.status).toBe(404);
  });
});
