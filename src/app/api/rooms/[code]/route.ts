import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sql = getDb();

  const roomRows = await sql`SELECT * FROM rooms WHERE id = ${code}`;
  if (roomRows.length === 0) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const room = roomRows[0];

  const quizRows = await sql`SELECT * FROM quizzes WHERE id = ${room.quiz_id}`;
  const questionRows = await sql`SELECT * FROM questions WHERE quiz_id = ${room.quiz_id} ORDER BY sort_order`;
  const playerRows = await sql`SELECT * FROM players WHERE room_id = ${code} ORDER BY joined_at`;

  const questions = questionRows.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options,
    correctAnswer: q.correct_answer,
    points: q.points,
    sortOrder: q.sort_order,
  }));

  const currentQuestion = questions[room.current_question_index] || null;

  // Get answers for current question
  let answers: Record<string, unknown>[] = [];
  if (currentQuestion) {
    const answerRows = await sql`SELECT a.*, p.name as player_name, p.emoji as player_emoji, p.color as player_color
      FROM answers a JOIN players p ON a.player_id = p.id
      WHERE a.room_id = ${code} AND a.question_id = ${currentQuestion.id}
      ORDER BY a.answered_at`;
    answers = answerRows.map((a) => ({
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
    }));
  }

  return NextResponse.json({
    room: {
      id: room.id,
      quizId: room.quiz_id,
      phase: room.phase,
      currentQuestionIndex: room.current_question_index,
      questionOpen: room.question_open,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
    },
    quiz: {
      id: quizRows[0].id,
      title: quizRows[0].title,
      questions,
    },
    players: playerRows.map((p) => ({
      id: p.id,
      roomId: p.room_id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      score: p.score,
      isConnected: p.is_connected,
      joinedAt: p.joined_at,
    })),
    currentQuestion,
    answers,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sql = getDb();
  const body = await request.json();

  const roomRows = await sql`SELECT * FROM rooms WHERE id = ${code}`;
  if (roomRows.length === 0) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const { phase, currentQuestionIndex, questionOpen } = body;

  if (phase !== undefined) {
    await sql`UPDATE rooms SET phase = ${phase}, updated_at = now() WHERE id = ${code}`;
  }
  if (currentQuestionIndex !== undefined) {
    await sql`UPDATE rooms SET current_question_index = ${currentQuestionIndex}, updated_at = now() WHERE id = ${code}`;
  }
  if (questionOpen !== undefined) {
    await sql`UPDATE rooms SET question_open = ${questionOpen}, updated_at = now() WHERE id = ${code}`;
  }

  return NextResponse.json({ ok: true });
}
