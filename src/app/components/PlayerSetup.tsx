"use client";

import { useState } from "react";
import { useGame } from "../context/GameContext";

export function PlayerSetup() {
  const { state, dispatch } = useGame();
  const [name, setName] = useState("");

  function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed || state.players.length >= 8) return;
    dispatch({ type: "ADD_PLAYER", name: trimmed });
    setName("");
  }

  function startGame() {
    if (state.players.length < 2) return;
    dispatch({ type: "SET_PHASE", phase: "playing" });
  }

  return (
    <div className="retro-card p-8 max-w-lg w-full animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold text-amber-900" style={{ fontFamily: "Georgia, serif" }}>
          Jogadores
        </h2>
        <button
          className="text-amber-600 hover:text-amber-800 text-sm underline"
          onClick={() => dispatch({ type: "SET_PHASE", phase: "quiz-creator" })}
        >
          Voltar
        </button>
      </div>

      <p className="text-amber-700 mb-4">
        Adiciona entre 2 e 8 jogadores para começar!
      </p>

      <div className="flex gap-2 mb-6">
        <input
          className="retro-input flex-1"
          placeholder="Nome do jogador..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          maxLength={20}
        />
        <button
          className="retro-button retro-button-secondary py-2 px-5 text-sm"
          onClick={addPlayer}
          disabled={!name.trim() || state.players.length >= 8}
        >
          Adicionar
        </button>
      </div>

      {/* Player list */}
      <div className="space-y-3 mb-6">
        {state.players.map((player, i) => (
          <div
            key={player.id}
            className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-xl p-3 animate-bounce-in"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: player.color + "22", border: `3px solid ${player.color}` }}
            >
              <span className="animate-wave" style={{ animationDelay: `${i * 0.5}s` }}>
                {player.emoji}
              </span>
            </div>
            <span className="flex-1 font-bold text-amber-900 text-lg">
              {player.name}
            </span>
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: player.color }}
            />
            <button
              onClick={() => dispatch({ type: "REMOVE_PLAYER", id: player.id })}
              className="text-red-400 hover:text-red-600 text-lg font-bold ml-1"
              aria-label={`Remover ${player.name}`}
            >
              ×
            </button>
          </div>
        ))}

        {state.players.length === 0 && (
          <div className="text-center text-amber-400 py-8">
            <div className="text-4xl mb-2">👥</div>
            <p>Ainda sem jogadores...</p>
          </div>
        )}
      </div>

      <button
        className="retro-button retro-button-green w-full text-xl"
        onClick={startGame}
        disabled={state.players.length < 2}
      >
        Começar Jogo! 🎲
      </button>

      {state.players.length > 0 && state.players.length < 2 && (
        <p className="text-amber-600 text-sm text-center mt-2">
          Precisas de pelo menos 2 jogadores
        </p>
      )}
    </div>
  );
}
