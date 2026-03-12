import { describe, it, expect, beforeEach } from "vitest";
import { mockSql } from "../setup";
import { POST } from "@/app/api/quizzes/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/quizzes", () => {
  beforeEach(() => {
    mockSql.clearHandlers();
    // Default: INSERT succeeds
    mockSql.mockQuery(/INSERT INTO quizzes/, []);
    mockSql.mockQuery(/INSERT INTO questions/, []);
  });

  it("creates a quiz with valid data", async () => {
    const res = await POST(
      makeRequest({
        title: "My Quiz",
        questions: [
          { text: "Q1?", type: "multiple-choice", options: ["A", "B"], correctAnswer: "A" },
        ],
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("test-id-1234");
  });

  it("returns 400 if title is missing", async () => {
    const res = await POST(
      makeRequest({ title: "", questions: [{ text: "Q1?", type: "open-ended" }] })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Title and questions required/i);
  });

  it("returns 400 if questions array is empty", async () => {
    const res = await POST(makeRequest({ title: "Quiz", questions: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 if no questions field", async () => {
    const res = await POST(makeRequest({ title: "Quiz" }));
    expect(res.status).toBe(400);
  });

  it("handles questions with default points and no options/correctAnswer", async () => {
    const res = await POST(
      makeRequest({
        title: "Defaults Quiz",
        questions: [
          { text: "Open Q?", type: "open-ended" },
        ],
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("test-id-1234");
  });
});
