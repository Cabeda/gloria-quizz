import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { GET, POST } from "@/app/api/quizzes/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/quizzes", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns empty list when no quizzes exist", async () => {
    mockPrisma.quiz.findMany.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("returns quizzes with question count, newest first", async () => {
    mockPrisma.quiz.findMany.mockResolvedValue([
      { id: "q2", title: "Second Quiz", createdAt: "2025-06-02", _count: { questions: 5 } },
      { id: "q1", title: "First Quiz", createdAt: "2025-06-01", _count: { questions: 3 } },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("q2");
    expect(data[0].questionCount).toBe(5);
    expect(data[1].id).toBe("q1");
    expect(data[1].questionCount).toBe(3);
  });

  it("maps _count to questionCount in response", async () => {
    mockPrisma.quiz.findMany.mockResolvedValue([
      { id: "q1", title: "Quiz", createdAt: "2025-01-01", _count: { questions: 10 } },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].questionCount).toBe(10);
    expect(data[0]._count).toBeUndefined();
  });
});

describe("POST /api/quizzes", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.quiz.create.mockResolvedValue({ id: "test-id-1234" });
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
    expect(mockPrisma.quiz.create).toHaveBeenCalledOnce();
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
