import { prisma } from "@/app/lib/prisma";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const PLAYER_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
  "#1abc9c", "#e67e22", "#e84393", "#2c3e50", "#d35400",
];
const PLAYER_EMOJIS = ["🧒", "👧", "👦", "👶", "🦊", "🐱", "🐶", "🐸", "🦁", "🐼"];

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const [room, playerCount] = await Promise.all([
    prisma.room.findUnique({ where: { id: code }, select: { phase: true } }),
    prisma.player.count({ where: { roomId: code } }),
  ]);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.phase !== "lobby") {
    return NextResponse.json({ error: "Game already started" }, { status: 400 });
  }

  if (playerCount >= 10) {
    return NextResponse.json({ error: "Room is full" }, { status: 400 });
  }

  const idx = playerCount;
  const playerId = nanoid(12);

  await prisma.player.create({
    data: {
      id: playerId,
      roomId: code,
      name: name.trim(),
      emoji: PLAYER_EMOJIS[idx % PLAYER_EMOJIS.length],
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    },
  });

  return NextResponse.json({
    id: playerId,
    name: name.trim(),
    emoji: PLAYER_EMOJIS[idx % PLAYER_EMOJIS.length],
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
    score: 0,
  });
}
