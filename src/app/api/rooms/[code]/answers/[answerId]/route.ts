import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; answerId: string }> }
) {
  const { code, answerId } = await params;
  const body = await request.json();
  const { isCorrect } = body;

  if (typeof isCorrect !== "boolean") {
    return NextResponse.json({ error: "isCorrect (boolean) required" }, { status: 400 });
  }

  const answer = await prisma.answer.findFirst({
    where: { id: answerId, roomId: code },
    include: { question: { select: { points: true } } },
  });

  if (!answer) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }

  const wasCorrect = answer.isCorrect;
  const points = answer.question.points || 1;

  // Update answer + adjust score in a single transaction when needed
  if (isCorrect && !wasCorrect) {
    await prisma.$transaction([
      prisma.answer.update({ where: { id: answerId }, data: { isCorrect } }),
      prisma.player.update({ where: { id: answer.playerId }, data: { score: { increment: points } } }),
    ]);
  } else if (!isCorrect && wasCorrect) {
    await prisma.$transaction([
      prisma.answer.update({ where: { id: answerId }, data: { isCorrect } }),
      prisma.player.update({ where: { id: answer.playerId }, data: { score: { decrement: points } } }),
    ]);
  } else {
    await prisma.answer.update({ where: { id: answerId }, data: { isCorrect } });
  }

  return NextResponse.json({ ok: true });
}
