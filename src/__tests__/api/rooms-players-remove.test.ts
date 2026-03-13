import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma, resetMocks } from "../setup";
import { DELETE } from "@/app/api/rooms/[code]/players/[playerId]/route";

function makeRequest(code: string, playerId: string) {
  return {
    request: new Request(`http://localhost/api/rooms/${code}/players/${playerId}`, { method: "DELETE" }),
    params: Promise.resolve({ code, playerId }),
  };
}

describe("DELETE /api/rooms/[code]/players/[playerId]", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("removes player and their answers", async () => {
    mockPrisma.player.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "ABC123",
      name: "Alice",
    });
    mockPrisma.answer.deleteMany.mockResolvedValue({ count: 3 });
    mockPrisma.player.delete.mockResolvedValue({ id: "p1" });

    const { request, params } = makeRequest("ABC123", "p1");
    const res = await DELETE(request, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    expect(mockPrisma.answer.deleteMany).toHaveBeenCalledWith({
      where: { playerId: "p1" },
    });
    expect(mockPrisma.player.delete).toHaveBeenCalledWith({
      where: { id: "p1" },
    });
  });

  it("returns 404 if player not found", async () => {
    mockPrisma.player.findUnique.mockResolvedValue(null);
    const { request, params } = makeRequest("ABC123", "nope");
    const res = await DELETE(request, { params });
    expect(res.status).toBe(404);
  });

  it("returns 404 if player belongs to different room", async () => {
    mockPrisma.player.findUnique.mockResolvedValue({
      id: "p1",
      roomId: "OTHER",
      name: "Alice",
    });
    const { request, params } = makeRequest("ABC123", "p1");
    const res = await DELETE(request, { params });
    expect(res.status).toBe(404);
  });
});
