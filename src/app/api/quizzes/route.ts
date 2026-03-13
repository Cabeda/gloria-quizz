import { prisma } from "@/app/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function GET() {
  const quizzes = await prisma.quiz.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json(
    quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      createdAt: q.createdAt,
      questionCount: q._count.questions,
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, questions } = body;

  if (!title?.trim() || !questions?.length) {
    return NextResponse.json({ error: "Title and questions required" }, { status: 400 });
  }

  const quizId = nanoid(12);

  await prisma.quiz.create({
    data: {
      id: quizId,
      title: title.trim(),
      questions: {
        create: questions.map((q: { text: string; type: string; options?: string[]; correctAnswer?: string; points?: number; timeLimit?: number | null }, i: number) => ({
          id: nanoid(12),
          text: q.text,
          type: q.type,
          options: q.options || [],
          correctAnswer: q.correctAnswer || null,
          points: q.points || 1,
          timeLimit: q.timeLimit ?? null,
          sortOrder: i,
        })),
      },
    },
  });

  return NextResponse.json({ id: quizId });
}
