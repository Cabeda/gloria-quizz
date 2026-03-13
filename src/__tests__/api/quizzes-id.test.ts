import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { DELETE, GET, PUT } from "@/app/api/quizzes/[id]/route";

function makeGetRequest(id: string) {
  return {
    request: new Request(`http://localhost/api/quizzes/${id}`),
    params: Promise.resolve({ id }),
  };
}

function makePutRequest(id: string, body: unknown) {
  return {
    request: new Request(`http://localhost/api/quizzes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: Promise.resolve({ id }),
  };
}

describe("GET /api/quizzes/[id]", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("returns quiz with questions", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({
      id: "q1",
      title: "Test Quiz",
      createdAt: "2025-01-01",
      questions: [
        { id: "qn1", text: "What?", type: "multiple-choice", options: ["A", "B"], correctAnswer: "A", points: 1, sortOrder: 0 },
      ],
    });

    const { request, params } = makeGetRequest("q1");
    const res = await GET(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("q1");
    expect(data.title).toBe("Test Quiz");
    expect(data.questions).toHaveLength(1);
    expect(data.questions[0].text).toBe("What?");
  });

  it("returns 404 for unknown quiz", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(null);
    const { request, params } = makeGetRequest("nope");
    const res = await GET(request, { params });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/quizzes/[id]", () => {
  beforeEach(() => {
    resetMocks();
    mockPrisma.quiz.findUnique.mockResolvedValue({ id: "q1" });
  });

  it("updates title and questions", async () => {
    const { request, params } = makePutRequest("q1", {
      title: "Updated",
      questions: [{ text: "New Q?", type: "open-ended", points: 2 }],
    });
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("returns 404 for unknown quiz", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(null);
    const { request, params } = makePutRequest("nope", { title: "X" });
    const res = await PUT(request, { params });
    expect(res.status).toBe(404);
  });

  it("updates only title when no questions provided", async () => {
    const { request, params } = makePutRequest("q1", { title: "New Title" });
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);
  });

  it("updates only questions when no title provided", async () => {
    const { request, params } = makePutRequest("q1", {
      questions: [{ text: "Q?", type: "open-ended", points: 1 }],
    });
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);
  });

  it("updates neither when body is empty", async () => {
    const { request, params } = makePutRequest("q1", {});
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);
  });

  it("uses existing question id if provided", async () => {
    const { request, params } = makePutRequest("q1", {
      questions: [{ id: "existing-id", text: "Q?", type: "open-ended", points: 1 }],
    });
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);
  });
});

function makeDeleteRequest(id: string) {
  return {
    request: new Request(`http://localhost/api/quizzes/${id}`, { method: "DELETE" }),
    params: Promise.resolve({ id }),
  };
}

describe("DELETE /api/quizzes/[id]", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("deletes quiz with cascade (answers, players, rooms, questions)", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue({ id: "q1" });
    const { request, params } = makeDeleteRequest("q1");
    const res = await DELETE(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it("returns 404 for unknown quiz", async () => {
    mockPrisma.quiz.findUnique.mockResolvedValue(null);
    const { request, params } = makeDeleteRequest("nope");
    const res = await DELETE(request, { params });
    expect(res.status).toBe(404);
  });
});
