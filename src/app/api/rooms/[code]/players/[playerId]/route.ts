import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string; playerId: string }> }
) {
  const { code, playerId } = await params;

  // Verify player belongs to this room (select only what we need)
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { roomId: true },
  });
  if (!player || player.roomId !== code) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Delete player's answers + player in a transaction
  await prisma.$transaction([
    prisma.answer.deleteMany({ where: { playerId } }),
    prisma.player.delete({ where: { id: playerId } }),
  ]);

  return NextResponse.json({ ok: true });
}
