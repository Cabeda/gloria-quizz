import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sql = getDb();

  const roomRows = await sql`SELECT current_question_index, quiz_id FROM rooms WHERE id = ${code}`;
  if (roomRows.length === 0) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const questionRows = await sql`SELECT id FROM questions WHERE quiz_id = ${roomRows[0].quiz_id} ORDER BY sort_order`;
  const currentQ = questionRows[roomRows[0].current_question_index];
  if (!currentQ) {
    return NextResponse.json([]);
  }

  const answerRows = await sql`SELECT a.*, p.name as player_name, p.emoji as player_emoji, p.color as player_color
    FROM answers a JOIN players p ON a.player_id = p.id
    WHERE a.room_id = ${code} AND a.question_id = ${currentQ.id}
    ORDER BY a.answered_at`;

  return NextResponse.json(
    answerRows.map((a) => ({
      id: a.id,
      roomId: a.room_id,
      questionId: a.question_id,
      playerId: a.player_id,
      answerText: a.answer_text,
      isCorrect: a.is_correct,
      answeredAt: a.answered_at,
      playerName: a.player_name,
      playerEmoji: a.player_emoji,
      playerColor: a.player_color,
    }))
  );
}
