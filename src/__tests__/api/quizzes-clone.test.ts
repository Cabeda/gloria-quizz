import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { POST } from "@/app/api/quizzes/[id]/clone/route";

function makeRequest(id: string) {
  return {
    request: new Request(`http://localhost/api/quizzes/${id}/clone`, { method: "POST" }),
    params: Promise.resolve({ id }),
  };
}

describe("POST /api/quizzes/[id]/clone", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("clones a quiz preserving all question fields", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: "q1",
      title: "Original Quiz",
      createdAt: "2025-01-01",
      questions: [
        { id: "qn1", text: "What?", type: "multiple-choice", options: ["A", "B", "C"], correctAnswer: "B", points: 2, timeLimit: 30, sortOrder: 0 },
        { id: "qn2", text: "Why?", type: "open-ended", options: [], correctAnswer: null, points: 1, timeLimit: null, sortOrder: 1 },
      ],
    });
    mockPrisma.quiz.create.mockResolvedValue({ id: "test-id-1234" });

    const { request, params } = makeRequest("q1");
    const res = await POST(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("test-id-1234");

    expect(mockPrisma.quiz.create).toHaveBeenCalledOnce();
    const createCall = mockPrisma.quiz.create.mock.calls[0][0];

    // Title gets "(copia)" suffix
    expect(createCall.data.title).toBe("Original Quiz (copia)");

    // All questions are cloned
    const qs = createCall.data.questions.create;
    expect(qs).toHaveLength(2);

    // MC question: options, correctAnswer, points, timeLimit all preserved
    expect(qs[0]).toMatchObject({
      text: "What?",
      type: "multiple-choice",
      options: ["A", "B", "C"],
      correctAnswer: "B",
      points: 2,
      timeLimit: 30,
      sortOrder: 0,
    });

    // Open-ended question: null fields preserved
    expect(qs[1]).toMatchObject({
      text: "Why?",
      type: "open-ended",
      options: [],
      correctAnswer: null,
      points: 1,
      timeLimit: null,
      sortOrder: 1,
    });
  });

  it("returns 404 for unknown quiz", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(null);
    const { request, params } = makeRequest("nope");
    const res = await POST(request, { params });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it("returns 500 when create fails", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: "q1",
      title: "Quiz",
      questions: [{ id: "qn1", text: "Q?", type: "open-ended", options: [], correctAnswer: null, points: 1, timeLimit: null, sortOrder: 0 }],
    });
    mockPrisma.quiz.create.mockRejectedValue(new Error("DB error"));

    const { request, params } = makeRequest("q1");
    const res = await POST(request, { params });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("generates new IDs for cloned quiz and questions", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: "q1",
      title: "Quiz",
      questions: [{ id: "original-qn-id", text: "Q?", type: "open-ended", options: [], correctAnswer: null, points: 1, timeLimit: null, sortOrder: 0 }],
    });
    mockPrisma.quiz.create.mockResolvedValue({ id: "test-id-1234" });

    const { request, params } = makeRequest("q1");
    await POST(request, { params });

    const createCall = mockPrisma.quiz.create.mock.calls[0][0];
    // The cloned quiz and question IDs should be new (from nanoid mock: "test-id-1234"), not the originals
    expect(createCall.data.id).toBe("test-id-1234");
    expect(createCall.data.questions.create[0].id).toBe("test-id-1234");
    expect(createCall.data.questions.create[0].id).not.toBe("original-qn-id");
  });
});
