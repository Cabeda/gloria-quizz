import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

/** Compute current streak for each player from their answer history. */
async function addStreaks(
  roomId: string,
  players: { id: string; roomId: string; name: string; emoji: string; color: string; score: number | null; isConnected: boolean | null; joinedAt: Date | null }[]
) {
  if (players.length === 0) return players.map((p) => ({ ...p, streak: 0 }));

  // Fetch all answers for this room, ordered by answeredAt desc
  const allAnswers = await prisma.answer.findMany({
    where: { roomId },
    orderBy: { answeredAt: "desc" },
    select: { playerId: true, isCorrect: true },
  });

  // Group by player and count consecutive correct from most recent
  const streakMap = new Map<string, number>();
  const seenBreak = new Set<string>();
  for (const a of allAnswers) {
    if (seenBreak.has(a.playerId)) continue;
    if (a.isCorrect === true) {
      streakMap.set(a.playerId, (streakMap.get(a.playerId) || 0) + 1);
    } else {
      seenBreak.add(a.playerId);
    }
  }

  return players.map((p) => ({ ...p, streak: streakMap.get(p.id) || 0 }));
}

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
      questionStartedAt: true,
      createdAt: true,
      updatedAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
          questions: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, text: true, type: true, options: true, correctAnswer: true, points: true, sortOrder: true, timeLimit: true },
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
      questionStartedAt: room.questionStartedAt,
      createdAt: room.createdAt, updatedAt: room.updatedAt,
    },
    quiz: { id: room.quiz.id, title: room.quiz.title, questions },
    players: await addStreaks(code, room.players),
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
  if (questionOpen !== undefined) {
    updateData.questionOpen = questionOpen;
    // Set questionStartedAt when opening a question (for speed bonus calculation)
    if (questionOpen === true) {
      updateData.questionStartedAt = new Date();
    }
  }

  try {
    await prisma.room.update({ where: { id: code }, data: updateData });
  } catch {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
