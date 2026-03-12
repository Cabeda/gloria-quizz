import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { id: code },
    include: {
      quiz: {
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
        },
      },
      players: { orderBy: { joinedAt: "asc" } },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const questions = room.quiz.questions.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options,
    correctAnswer: q.correctAnswer,
    points: q.points,
    sortOrder: q.sortOrder,
  }));

  const currentQuestion = questions[room.currentQuestionIndex ?? 0] || null;

  // Get answers for current question (only if there is one)
  let answers: Record<string, unknown>[] = [];
  if (currentQuestion) {
    const answerRows = await prisma.answer.findMany({
      where: { roomId: code, questionId: currentQuestion.id },
      include: { player: true },
      orderBy: { answeredAt: "asc" },
    });
    answers = answerRows.map((a) => ({
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
    }));
  }

  return NextResponse.json({
    room: {
      id: room.id,
      quizId: room.quizId,
      phase: room.phase,
      currentQuestionIndex: room.currentQuestionIndex,
      questionOpen: room.questionOpen,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    },
    quiz: {
      id: room.quiz.id,
      title: room.quiz.title,
      questions,
    },
    players: room.players.map((p) => ({
      id: p.id,
      roomId: p.roomId,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      score: p.score,
      isConnected: p.isConnected,
      joinedAt: p.joinedAt,
    })),
    currentQuestion,
    answers,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await request.json();

  const { phase, currentQuestionIndex, questionOpen } = body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (phase !== undefined) updateData.phase = phase;
  if (currentQuestionIndex !== undefined) updateData.currentQuestionIndex = currentQuestionIndex;
  if (questionOpen !== undefined) updateData.questionOpen = questionOpen;

  try {
    await prisma.room.update({ where: { id: code }, data: updateData });
  } catch {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
