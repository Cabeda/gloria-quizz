import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> }
) {
  const { code, playerId } = await params;

  // Verify player belongs to this room
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.roomId !== code) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Delete player's answers first (FK constraint), then the player
  await prisma.answer.deleteMany({ where: { playerId } });
  await prisma.player.delete({ where: { id: playerId } });

  return NextResponse.json({ ok: true });
}
