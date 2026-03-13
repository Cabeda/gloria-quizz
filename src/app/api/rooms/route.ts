import { prisma } from "@/app/lib/prisma";
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
  const body = await request.json();
  const { quizId } = body;

  if (!quizId) {
    return NextResponse.json({ error: "quizId required" }, { status: 400 });
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  // Generate unique room code (retry on collision)
  let code = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.room.findUnique({ where: { id: code } });
    if (!existing) break;
    code = generateRoomCode();
  }

  await prisma.room.create({ data: { id: code, quizId } });

  return NextResponse.json({ code });
}
