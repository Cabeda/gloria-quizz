import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";
import { addReaction, getRecentReactions, isValidEmoji, isThrottled } from "@/app/lib/reactions";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const body = await request.json();
  const { playerId, emoji } = body;

  if (!playerId || !emoji) {
    return NextResponse.json({ error: "playerId and emoji are required" }, { status: 400 });
  }

  if (!isValidEmoji(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  // Verify room exists
  const room = await prisma.room.findUnique({
    where: { id: code },
    select: { id: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Verify player belongs to room
  const player = await prisma.player.findFirst({
    where: { id: playerId, roomId: code },
    select: { id: true },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not in room" }, { status: 403 });
  }

  // Throttle check
  if (isThrottled(playerId)) {
    return NextResponse.json({ error: "Too many reactions, wait 3 seconds" }, { status: 429 });
  }

  const reaction = addReaction(code, playerId, emoji);
  return NextResponse.json(reaction, { status: 201 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { id: code },
    select: { id: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const reactions = getRecentReactions(code);
  return NextResponse.json(reactions);
}
