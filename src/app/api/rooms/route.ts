import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const sql = getDb();
  const body = await request.json();
  const { quizId } = body;

  if (!quizId) {
    return NextResponse.json({ error: "quizId required" }, { status: 400 });
  }

  const quizRows = await sql`SELECT id FROM quizzes WHERE id = ${quizId}`;
  if (quizRows.length === 0) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Generate unique room code (retry on collision)
  let code = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await sql`SELECT id FROM rooms WHERE id = ${code}`;
    if (existing.length === 0) break;
    code = generateRoomCode();
  }

  await sql`INSERT INTO rooms (id, quiz_id) VALUES (${code}, ${quizId})`;

  return NextResponse.json({ code });
}
