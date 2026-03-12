import { getDb } from "@/app/lib/db";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();

  const quizRows = await sql`SELECT * FROM quizzes WHERE id = ${id}`;
  if (quizRows.length === 0) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const questionRows = await sql`SELECT * FROM questions WHERE quiz_id = ${id} ORDER BY sort_order`;

  return NextResponse.json({
    id: quizRows[0].id,
    title: quizRows[0].title,
    createdAt: quizRows[0].created_at,
    questions: questionRows.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      correctAnswer: q.correct_answer,
      points: q.points,
      sortOrder: q.sort_order,
    })),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sql = getDb();
  const body = await request.json();
  const { title, questions } = body;

  const quizRows = await sql`SELECT * FROM quizzes WHERE id = ${id}`;
  if (quizRows.length === 0) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  if (title) {
    await sql`UPDATE quizzes SET title = ${title.trim()} WHERE id = ${id}`;
  }

  if (questions) {
    await sql`DELETE FROM questions WHERE quiz_id = ${id}`;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qId = q.id || nanoid(12);
      await sql`INSERT INTO questions (id, quiz_id, text, type, options, correct_answer, points, sort_order)
        VALUES (${qId}, ${id}, ${q.text}, ${q.type}, ${JSON.stringify(q.options || [])}, ${q.correctAnswer || null}, ${q.points || 1}, ${i})`;
    }
  }

  return NextResponse.json({ ok: true });
}
