import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; answerId: string }> }
) {
  const { code, answerId } = await params;
  const sql = getDb();
  const body = await request.json();
  const { isCorrect } = body;

  if (typeof isCorrect !== "boolean") {
    return NextResponse.json({ error: "isCorrect (boolean) required" }, { status: 400 });
  }

  const answerRows = await sql`SELECT a.*, q.points FROM answers a JOIN questions q ON a.question_id = q.id WHERE a.id = ${answerId} AND a.room_id = ${code}`;
  if (answerRows.length === 0) {
    return NextResponse.json({ error: "Answer not found" }, { status: 404 });
  }

  const answer = answerRows[0];
  const wasCorrect = answer.is_correct;

  await sql`UPDATE answers SET is_correct = ${isCorrect} WHERE id = ${answerId}`;

  // Adjust score
  if (isCorrect && !wasCorrect) {
    await sql`UPDATE players SET score = score + ${answer.points || 1} WHERE id = ${answer.player_id}`;
  } else if (!isCorrect && wasCorrect) {
    await sql`UPDATE players SET score = score - ${answer.points || 1} WHERE id = ${answer.player_id}`;
  }

  return NextResponse.json({ ok: true });
}
