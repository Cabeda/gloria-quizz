import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const players = await prisma.player.findMany({
    where: { roomId: code },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(
    players.map((p) => ({
      id: p.id,
      roomId: p.roomId,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      score: p.score,
      isConnected: p.isConnected,
      joinedAt: p.joinedAt,
    }))
  );
}
