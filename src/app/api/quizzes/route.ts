import { prisma } from "@/app/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

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
        create: questions.map((q: { text: string; type: string; options?: string[]; correctAnswer?: string; points?: number }, i: number) => ({
          id: nanoid(12),
          text: q.text,
          type: q.type,
          options: q.options || [],
          correctAnswer: q.correctAnswer || null,
          points: q.points || 1,
          sortOrder: i,
        })),
      },
    },
  });

  return NextResponse.json({ id: quizId });
}
