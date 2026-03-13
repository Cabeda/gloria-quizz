import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Fetch room with its questions in a single query
  const room = await prisma.room.findUnique({
    where: { id: code },
    select: {
      currentQuestionIndex: true,
      quiz: {
        select: {
          questions: { orderBy: { sortOrder: "asc" }, select: { id: true } },
        },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const currentQ = room.quiz.questions[room.currentQuestionIndex ?? 0];
  if (!currentQ) {
    return NextResponse.json([]);
  }

  const answers = await prisma.answer.findMany({
    where: { roomId: code, questionId: currentQ.id },
    orderBy: { answeredAt: "asc" },
    select: {
      id: true, roomId: true, questionId: true, playerId: true,
      answerText: true, isCorrect: true, answeredAt: true,
      player: { select: { name: true, emoji: true, color: true } },
    },
  });

  return NextResponse.json(
    answers.map((a) => ({
      id: a.id, roomId: a.roomId, questionId: a.questionId, playerId: a.playerId,
      answerText: a.answerText, isCorrect: a.isCorrect, answeredAt: a.answeredAt,
      playerName: a.player.name, playerEmoji: a.player.emoji, playerColor: a.player.color,
    }))
  );
}
