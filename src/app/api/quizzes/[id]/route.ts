import { prisma } from "@/app/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    createdAt: quiz.createdAt,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      sortOrder: q.sortOrder,
      timeLimit: q.timeLimit,
    })),
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({ where: { id }, select: { id: true } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Cascade delete: answers → players → rooms → questions → quiz
  await prisma.$transaction([
    prisma.answer.deleteMany({ where: { question: { quizId: id } } }),
    prisma.player.deleteMany({ where: { room: { quizId: id } } }),
    prisma.room.deleteMany({ where: { quizId: id } }),
    prisma.question.deleteMany({ where: { quizId: id } }),
    prisma.quiz.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, questions } = body as {
    title?: string;
    questions?: { id?: string; text: string; type: string; options?: string[]; correctAnswer?: string; points?: number; timeLimit?: number | null }[];
  };

  const quiz = await prisma.quiz.findUnique({ where: { id }, select: { id: true } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Build operations to run in a single transaction
  const ops = [];

  if (title) {
    ops.push(prisma.quiz.update({ where: { id }, data: { title: title.trim() } }));
  }

  if (questions) {
    ops.push(prisma.question.deleteMany({ where: { quizId: id } }));
    ops.push(prisma.question.createMany({
      data: questions.map((q, i: number) => ({
        id: q.id || nanoid(12),
        quizId: id,
        text: q.text,
        type: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer || null,
        points: q.points || 1,
        timeLimit: q.timeLimit ?? null,
        sortOrder: i,
      })),
    }));
  }

  try {
    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }
  } catch {
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
