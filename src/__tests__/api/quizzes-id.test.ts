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

  it("updates title and questions with correct data", async () => {
    const { request, params } = makePutRequest("q1", {
      title: "  Updated  ",
      questions: [
        { text: "New Q?", type: "open-ended", points: 2, timeLimit: 30 },
        { text: "MC Q?", type: "multiple-choice", options: ["A", "B"], correctAnswer: "A", points: 3 },
      ],
    });
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Verify transaction was called with 3 operations: update title, delete old questions, create new
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    const txOps = mockPrisma.$transaction.mock.calls[0][0];
    expect(txOps).toHaveLength(3);

    // Verify title was trimmed
    expect(mockPrisma.quiz.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { title: "Updated" },
    });

    // Verify old questions deleted
    expect(mockPrisma.question.deleteMany).toHaveBeenCalledWith({ where: { quizId: "q1" } });

    // Verify new questions created with correct data
    const createCall = mockPrisma.question.createMany.mock.calls[0][0];
    expect(createCall.data).toHaveLength(2);
    expect(createCall.data[0]).toMatchObject({
      quizId: "q1",
      text: "New Q?",
      type: "open-ended",
      options: [],
      correctAnswer: null,
      points: 2,
      timeLimit: 30,
      sortOrder: 0,
    });
    expect(createCall.data[1]).toMatchObject({
      quizId: "q1",
      text: "MC Q?",
      type: "multiple-choice",
      options: ["A", "B"],
      correctAnswer: "A",
      points: 3,
      timeLimit: null,
      sortOrder: 1,
    });
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

    // Only title update, no question operations
    expect(mockPrisma.quiz.update).toHaveBeenCalledWith({
      where: { id: "q1" },
      data: { title: "New Title" },
    });
    expect(mockPrisma.question.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.question.createMany).not.toHaveBeenCalled();
  });

  it("updates only questions when no title provided", async () => {
    const { request, params } = makePutRequest("q1", {
      questions: [{ text: "Q?", type: "open-ended", points: 1 }],
    });
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);

    // No title update, only question delete + create
    expect(mockPrisma.quiz.update).not.toHaveBeenCalled();
    expect(mockPrisma.question.deleteMany).toHaveBeenCalledWith({ where: { quizId: "q1" } });
    expect(mockPrisma.question.createMany).toHaveBeenCalledOnce();
  });

  it("skips transaction when body is empty", async () => {
    const { request, params } = makePutRequest("q1", {});
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);

    // No operations should be performed
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.quiz.update).not.toHaveBeenCalled();
    expect(mockPrisma.question.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.question.createMany).not.toHaveBeenCalled();
  });

  it("uses existing question id if provided, generates one if not", async () => {
    const { request, params } = makePutRequest("q1", {
      questions: [
        { id: "keep-this-id", text: "Q1?", type: "open-ended", points: 1 },
        { text: "Q2?", type: "open-ended", points: 1 },
      ],
    });
    const res = await PUT(request, { params });
    expect(res.status).toBe(200);

    const createCall = mockPrisma.question.createMany.mock.calls[0][0];
    expect(createCall.data[0].id).toBe("keep-this-id");
    expect(createCall.data[1].id).toBe("test-id-1234"); // from nanoid mock
  });

  it("returns 500 with JSON error when transaction fails", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("DB connection lost"));
    const { request, params } = makePutRequest("q1", {
      title: "Updated",
      questions: [{ text: "Q?", type: "open-ended", points: 1 }],
    });
    const res = await PUT(request, { params });
    expect(res.status).toBe(500);
    // The response must be valid JSON so the client can parse it
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 with JSON error when request body is not valid JSON", async () => {
    const request = new Request("http://localhost/api/quizzes/q1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "",  // empty body — triggers "Unexpected end of JSON input"
    });
    const params = Promise.resolve({ id: "q1" });
    const res = await PUT(request, { params });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
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
