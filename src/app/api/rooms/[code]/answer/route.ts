import { getDb } from "@/app/lib/db";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sql = getDb();
  const body = await request.json();
  const { playerId, questionId, answerText } = body;

  if (!playerId || !questionId) {
    return NextResponse.json({ error: "playerId and questionId required" }, { status: 400 });
  }

  const roomRows = await sql`SELECT * FROM rooms WHERE id = ${code}`;
  if (roomRows.length === 0) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!roomRows[0].question_open) {
    return NextResponse.json({ error: "Question is closed" }, { status: 400 });
  }

  // Check if already answered
  const existing = await sql`SELECT id FROM answers WHERE room_id = ${code} AND question_id = ${questionId} AND player_id = ${playerId}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Already answered" }, { status: 400 });
  }

  // Get the question to auto-check MC
  const questionRows = await sql`SELECT * FROM questions WHERE id = ${questionId}`;
  if (questionRows.length === 0) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const question = questionRows[0];
  let isCorrect: boolean | null = null;

  if (question.type === "multiple-choice" && question.correct_answer) {
    isCorrect = answerText?.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    // Auto-award points if correct
    if (isCorrect) {
      await sql`UPDATE players SET score = score + ${question.points || 1} WHERE id = ${playerId}`;
    }
  }

  const answerId = nanoid(12);
  await sql`INSERT INTO answers (id, room_id, question_id, player_id, answer_text, is_correct)
    VALUES (${answerId}, ${code}, ${questionId}, ${playerId}, ${answerText || ""}, ${isCorrect})`;

  return NextResponse.json({ id: answerId, isCorrect });
}
