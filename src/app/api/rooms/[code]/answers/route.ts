import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { id: code },
    select: { currentQuestionIndex: true, quizId: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const questions = await prisma.question.findMany({
    where: { quizId: room.quizId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  const currentQ = questions[room.currentQuestionIndex ?? 0];
  if (!currentQ) {
    return NextResponse.json([]);
  }

  const answers = await prisma.answer.findMany({
    where: { roomId: code, questionId: currentQ.id },
    include: { player: true },
    orderBy: { answeredAt: "asc" },
  });

  return NextResponse.json(
    answers.map((a) => ({
      id: a.id,
      roomId: a.roomId,
      questionId: a.questionId,
      playerId: a.playerId,
      answerText: a.answerText,
      isCorrect: a.isCorrect,
      answeredAt: a.answeredAt,
      playerName: a.player.name,
      playerEmoji: a.player.emoji,
      playerColor: a.player.color,
    }))
  );
}
