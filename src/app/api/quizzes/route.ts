import { getDb } from "@/app/lib/db";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const sql = getDb();
  const body = await request.json();
  const { title, questions } = body;

  if (!title?.trim() || !questions?.length) {
    return NextResponse.json({ error: "Title and questions required" }, { status: 400 });
  }

  const quizId = nanoid(12);

  await sql`INSERT INTO quizzes (id, title) VALUES (${quizId}, ${title.trim()})`;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qId = nanoid(12);
    await sql`INSERT INTO questions (id, quiz_id, text, type, options, correct_answer, points, sort_order)
      VALUES (${qId}, ${quizId}, ${q.text}, ${q.type}, ${JSON.stringify(q.options || [])}, ${q.correctAnswer || null}, ${q.points || 1}, ${i})`;
  }

  return NextResponse.json({ id: quizId });
}
