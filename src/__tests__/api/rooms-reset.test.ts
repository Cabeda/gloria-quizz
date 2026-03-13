import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { POST } from "@/app/api/rooms/[code]/reset/route";

function makeRequest(code: string) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}/reset`, { method: "POST" }),
    params: Promise.resolve({ code }),
  };
}

describe("POST /api/rooms/[code]/reset", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("resets room to lobby, clears answers, resets scores", async () => {
    mockPrisma.room.findUnique.mockResolvedValue({
      id: "ABC123",
      quizId: "q1",
      phase: "finished",
      currentQuestionIndex: 5,
      questionOpen: false,
    });
    mockPrisma.answer.deleteMany.mockResolvedValue({ count: 10 });
    mockPrisma.player.updateMany.mockResolvedValue({ count: 3 });
    mockPrisma.room.update.mockResolvedValue({ id: "ABC123" });

    const { request, params } = makeRequest("ABC123");
    const res = await POST(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Verify answers were deleted
    expect(mockPrisma.answer.deleteMany).toHaveBeenCalledWith({
      where: { roomId: "ABC123" },
    });

    // Verify player scores were reset
    expect(mockPrisma.player.updateMany).toHaveBeenCalledWith({
      where: { roomId: "ABC123" },
      data: { score: 0 },
    });

    // Verify room was reset to lobby
    expect(mockPrisma.room.update).toHaveBeenCalledWith({
      where: { id: "ABC123" },
      data: expect.objectContaining({
        phase: "lobby",
        currentQuestionIndex: 0,
        questionOpen: false,
      }),
    });
  });

  it("returns 404 for unknown room", async () => {
    mockPrisma.room.findUnique.mockResolvedValue(null);
    const { request, params } = makeRequest("NOPE");
    const res = await POST(request, { params });
    expect(res.status).toBe(404);
  });
});
