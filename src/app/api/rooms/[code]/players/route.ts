import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sql = getDb();

  const playerRows = await sql`SELECT * FROM players WHERE room_id = ${code} ORDER BY joined_at`;

  return NextResponse.json(
    playerRows.map((p) => ({
      id: p.id,
      roomId: p.room_id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      score: p.score,
      isConnected: p.is_connected,
      joinedAt: p.joined_at,
    }))
  );
}
