import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Single query: room + quiz (title only) + questions (needed fields) + players (needed fields)
  const room = await prisma.room.findUnique({
    where: { id: code },
    select: {
      id: true,
      quizId: true,
      phase: true,
      currentQuestionIndex: true,
      questionOpen: true,
      createdAt: true,
      updatedAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
          questions: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, text: true, type: true, options: true, correctAnswer: true, points: true, sortOrder: true },
          },
        },
      },
      players: {
        orderBy: { joinedAt: "asc" },
        select: { id: true, roomId: true, name: true, emoji: true, color: true, score: true, isConnected: true, joinedAt: true },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const questions = room.quiz.questions;
  const currentQuestion = questions[room.currentQuestionIndex ?? 0] || null;

  // Fetch answers for current question only when needed (question/reveal phases)
  let answers: Record<string, unknown>[] = [];
  if (currentQuestion && (room.phase === "question" || room.phase === "reveal")) {
    const answerRows = await prisma.answer.findMany({
      where: { roomId: code, questionId: currentQuestion.id },
      orderBy: { answeredAt: "asc" },
      select: {
        id: true, roomId: true, questionId: true, playerId: true,
        answerText: true, isCorrect: true, answeredAt: true,
        player: { select: { name: true, emoji: true, color: true } },
      },
    });
    answers = answerRows.map((a) => ({
      id: a.id, roomId: a.roomId, questionId: a.questionId, playerId: a.playerId,
      answerText: a.answerText, isCorrect: a.isCorrect, answeredAt: a.answeredAt,
      playerName: a.player.name, playerEmoji: a.player.emoji, playerColor: a.player.color,
    }));
  }

  return NextResponse.json({
    room: {
      id: room.id, quizId: room.quizId, phase: room.phase,
      currentQuestionIndex: room.currentQuestionIndex, questionOpen: room.questionOpen,
      createdAt: room.createdAt, updatedAt: room.updatedAt,
    },
    quiz: { id: room.quiz.id, title: room.quiz.title, questions },
    players: room.players,
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
