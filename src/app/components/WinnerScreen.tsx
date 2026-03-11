"use client";

import { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";

function ConfettiPiece({ delay, left }: { delay: number; left: number }) {
  const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#e67e22", "#9b59b6", "#e84393"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 6 + Math.random() * 10;
  const rotation = Math.random() * 360;

  return (
    <div
      className="confetti-piece"
      style={{
        left: `${left}%`,
        top: "-20px",
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        animationDelay: `${delay}s`,
        animationDuration: `${2 + Math.random() * 2}s`,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
}

export function WinnerScreen() {
  const { state, dispatch } = useGame();
  const [confetti, setConfetti] = useState<{ id: number; delay: number; left: number }[]>([]);

  const winner = state.players.reduce((best, p) =>
    p.position > best.position ? p : best
  );

  useEffect(() => {
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      delay: Math.random() * 2,
      left: Math.random() * 100,
    }));
    setConfetti(pieces);
  }, []);

  return (
    <div className="retro-card p-12 text-center max-w-lg w-full animate-bounce-in relative overflow-hidden">
      {/* Confetti */}
      {confetti.map((c) => (
        <ConfettiPiece key={c.id} delay={c.delay} left={c.left} />
      ))}

      <div className="text-7xl mb-4">🏆</div>
      <h1
        className="text-4xl font-extrabold text-amber-900 mb-2"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Parabéns!
      </h1>

      <div className="my-6">
        <div
          className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl border-4 mb-3 animate-bounce-in"
          style={{
            backgroundColor: winner.color + "33",
            borderColor: winner.color,
          }}
        >
          <span className="animate-wave">{winner.emoji}</span>
        </div>
        <p className="text-3xl font-extrabold text-amber-800">{winner.name}</p>
        <p className="text-amber-600 text-lg mt-1">venceu o jogo!</p>
      </div>

      {/* Final standings */}
      <div className="bg-amber-50 rounded-xl p-4 mb-6">
        <h3 className="text-amber-800 font-bold mb-2">Classificação Final</h3>
        <div className="space-y-2">
          {[...state.players]
            .sort((a, b) => b.position - a.position)
            .map((player, i) => (
              <div
                key={player.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="font-bold text-amber-700 w-6">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                </span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2"
                  style={{
                    backgroundColor: player.color,
                    borderColor: "white",
                  }}
                >
                  {player.emoji}
                </div>
                <span className="flex-1 text-left font-bold text-amber-900">
                  {player.name}
                </span>
                <span className="text-amber-600">Casa {player.position}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            className="retro-button retro-button-green flex-1"
            onClick={() => dispatch({ type: "RESTART_GAME" })}
          >
            Jogar Outra Vez
          </button>
          <button
            className="retro-button flex-1"
            onClick={() => dispatch({ type: "RESET_GAME" })}
          >
            Novo Jogo
          </button>
        </div>
        <button
          className="retro-button retro-button-secondary w-full text-sm"
          onClick={() => dispatch({ type: "SET_PHASE", phase: "quiz-creator" })}
        >
          Editar Quiz
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {["🧒", "👧", "👦", "👶", "🧒", "👧"].map((emoji, i) => (
          <span
            key={i}
            className="text-2xl animate-wave"
            style={{ animationDelay: `${i * 0.25}s` }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
