import { prisma } from "@/app/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const newQuizId = nanoid(12);

  try {
    await prisma.quiz.create({
      data: {
        id: newQuizId,
        title: `${quiz.title} (copia)`,
        questions: {
          create: quiz.questions.map((q, i) => ({
            id: nanoid(12),
            text: q.text,
            type: q.type,
            options: q.options as string[],
            correctAnswer: q.correctAnswer,
            points: q.points,
            timeLimit: q.timeLimit,
            sortOrder: i,
          })),
        },
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to clone quiz" }, { status: 500 });
  }

  return NextResponse.json({ id: newQuizId });
}
