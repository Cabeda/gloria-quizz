"use client";

import { useGame } from "../context/GameContext";

export function MainMenu() {
  const { dispatch } = useGame();

  return (
    <div className="retro-card p-12 text-center max-w-lg w-full animate-bounce-in">
      <div className="text-6xl mb-4">🎲</div>
      <h1 className="text-4xl font-extrabold text-amber-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>
        Quem conhece a Graça?
      </h1>
      <p className="text-amber-700 mb-8 text-lg">
        O jogo de tabuleiro com quiz mais divertido!
      </p>

      <div className="flex flex-col gap-4">
        <button
          className="retro-button text-xl"
          onClick={() => dispatch({ type: "SET_PHASE", phase: "quiz-creator" })}
        >
          Criar Quiz
        </button>
        <p className="text-amber-600 text-sm mt-2">
          Cria as tuas perguntas e desafia os teus amigos!
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        {["🧒", "👧", "👦", "👶"].map((emoji, i) => (
          <span
            key={i}
            className="text-3xl animate-wave"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
