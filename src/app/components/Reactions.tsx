"use client";

import { useState, useEffect, useRef } from "react";

const EMOJIS = ["😂", "🔥", "😱", "🎉", "👏", "😭"];
const COOLDOWN_MS = 3000;

/** Reaction bar for players — shows emoji buttons with cooldown */
export function ReactionBar({ code, playerId }: { code: string; playerId: string }) {
  const [cooldown, setCooldown] = useState(false);

  async function sendReaction(emoji: string) {
    if (cooldown) return;
    setCooldown(true);

    try {
      await fetch(`/api/rooms/${code}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, emoji }),
      });
    } catch {
      // Fail silently
    }

    const t = setTimeout(() => setCooldown(false), COOLDOWN_MS);
    return () => clearTimeout(t);
  }

  return (
    <div className="flex gap-2 justify-center mt-4">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => sendReaction(emoji)}
          disabled={cooldown}
          className={`text-2xl p-2 rounded-xl transition-all ${
            cooldown
              ? "opacity-40 scale-90 cursor-not-allowed"
              : "hover:scale-125 active:scale-90 hover:bg-amber-100"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Floating reaction — a single emoji that floats up and fades out */
interface FloatingReaction {
  id: string;
  emoji: string;
  left: number; // percentage
}

/** Floating emoji overlay for host screen — polls reactions and animates them */
export function ReactionOverlay({ code }: { code: string }) {
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/rooms/${code}/reactions`);
        if (res.ok) {
          const reactions = await res.json();
          const newOnes: FloatingReaction[] = [];
          for (const r of reactions) {
            if (!seenIdsRef.current.has(r.id)) {
              seenIdsRef.current.add(r.id);
              newOnes.push({
                id: r.id,
                emoji: r.emoji,
                left: 10 + Math.random() * 80,
              });
            }
          }
          if (newOnes.length > 0 && active) {
            setFloating((prev) => [...prev, ...newOnes]);
            // Clean up old ones after animation (3s)
            const t = setTimeout(() => {
              if (active) {
                setFloating((prev) => prev.filter((f) => !newOnes.some((n) => n.id === f.id)));
              }
            }, 3000);
            return () => clearTimeout(t);
          }
        }
      } catch {
        // Fail silently
      }
    }

    const interval = setInterval(poll, 1500);
    poll();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [code]);

  if (floating.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {floating.map((f) => (
        <div
          key={f.id}
          className="absolute text-4xl"
          style={{
            left: `${f.left}%`,
            bottom: 0,
            animation: "reaction-float 3s ease-out forwards",
          }}
        >
          {f.emoji}
        </div>
      ))}
    </div>
  );
}
