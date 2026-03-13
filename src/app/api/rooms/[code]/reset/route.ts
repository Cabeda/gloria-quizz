import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Check room exists
  const room = await prisma.room.findUnique({ where: { id: code } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Delete all answers for this room, reset player scores, reset room state
  await Promise.all([
    prisma.answer.deleteMany({ where: { roomId: code } }),
    prisma.player.updateMany({ where: { roomId: code }, data: { score: 0 } }),
    prisma.room.update({
      where: { id: code },
      data: {
        phase: "lobby",
        currentQuestionIndex: 0,
        questionOpen: false,
        updatedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
