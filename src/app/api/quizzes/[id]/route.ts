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
    })),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { title, questions } = body;

  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  if (title) {
    await prisma.quiz.update({ where: { id }, data: { title: title.trim() } });
  }

  if (questions) {
    await prisma.question.deleteMany({ where: { quizId: id } });
    await prisma.question.createMany({
      data: questions.map((q: { id?: string; text: string; type: string; options?: string[]; correctAnswer?: string; points?: number }, i: number) => ({
        id: q.id || nanoid(12),
        quizId: id,
        text: q.text,
        type: q.type,
        options: q.options || [],
        correctAnswer: q.correctAnswer || null,
        points: q.points || 1,
        sortOrder: i,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}
