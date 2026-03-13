import { prisma } from "@/app/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

/** Calculate total points including speed bonus.
 *  Formula: basePoints + basePoints * (timeRemaining / timeLimit), rounded.
 *  Minimum 1 point if correct. No bonus if no timer. */
function calculatePoints(basePoints: number, timeLimit: number | null, questionStartedAt: Date | null): number {
  if (!timeLimit || !questionStartedAt) return basePoints;

  const elapsed = (Date.now() - new Date(questionStartedAt).getTime()) / 1000;
  const timeRemaining = Math.max(0, timeLimit - elapsed);

  if (timeRemaining <= 0) return basePoints; // no bonus if time ran out

  const speedBonus = Math.round(basePoints * (timeRemaining / timeLimit));
  return basePoints + speedBonus;
}

/** Get streak multiplier based on consecutive correct answers.
 *  3-4 streak = 1.5x, 5+ streak = 2x, otherwise 1x. */
function getStreakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

/** Count consecutive correct answers for a player (most recent first).
 *  Stops at the first non-correct answer. */
async function getPlayerStreak(roomId: string, playerId: string): Promise<number> {
  const answers = await prisma.answer.findMany({
    where: { roomId, playerId },
    orderBy: { answeredAt: "desc" },
    select: { isCorrect: true },
  });

  let streak = 0;
  for (const a of answers) {
    if (a.isCorrect === true) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await request.json();
  const { playerId, questionId, answerText } = body;

  if (!playerId || !questionId) {
    return NextResponse.json({ error: "playerId and questionId required" }, { status: 400 });
  }

  // Run room check + question fetch + duplicate check in parallel
  const [room, question, existing] = await Promise.all([
    prisma.room.findUnique({ where: { id: code }, select: { questionOpen: true, questionStartedAt: true } }),
    prisma.question.findUnique({ where: { id: questionId }, select: { type: true, correctAnswer: true, points: true, timeLimit: true } }),
    prisma.answer.findFirst({ where: { roomId: code, questionId, playerId } }),
  ]);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (!room.questionOpen) {
    return NextResponse.json({ error: "Question is closed" }, { status: 400 });
  }
  if (existing) {
    return NextResponse.json({ error: "Already answered" }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  let isCorrect: boolean | null = null;

  if (question.type === "multiple-choice" && question.correctAnswer) {
    isCorrect = answerText?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  }

  const answerId = nanoid(12);
  const basePoints = question.points || 1;
  const speedPoints = calculatePoints(basePoints, question.timeLimit, room.questionStartedAt);

  // Apply streak bonus for correct MC answers
  let totalPoints = speedPoints;
  let streak = 0;
  if (isCorrect) {
    streak = await getPlayerStreak(code, playerId);
    // streak is the count BEFORE this answer — this correct answer extends it
    const multiplier = getStreakMultiplier(streak + 1);
    totalPoints = Math.round(speedPoints * multiplier);
  }

  // Insert answer + award points in parallel if correct
  if (isCorrect) {
    await Promise.all([
      prisma.answer.create({
        data: { id: answerId, roomId: code, questionId, playerId, answerText: answerText || "", isCorrect },
      }),
      prisma.player.update({
        where: { id: playerId },
        data: { score: { increment: totalPoints } },
      }),
    ]);
  } else {
    await prisma.answer.create({
      data: { id: answerId, roomId: code, questionId, playerId, answerText: answerText || "", isCorrect },
    });
  }

  return NextResponse.json({
    id: answerId,
    isCorrect,
    pointsAwarded: isCorrect ? totalPoints : 0,
    streak: isCorrect ? streak + 1 : 0,
  });
}
