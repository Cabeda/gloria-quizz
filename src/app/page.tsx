"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const [joining, setJoining] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setJoinError("Codigo invalido");
      return;
    }
    setJoining(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        setJoinError("Sala nao encontrada");
        return;
      }
      router.push(`/play/${code}`);
    } catch {
      setJoinError("Erro ao procurar sala");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="retro-card p-8 md:p-12 max-w-md w-full text-center animate-bounce-in">
        <div className="text-6xl mb-4 animate-wave inline-block">🎲</div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-amber-900 mb-2">
          Quem conhece a Graca?
        </h1>
        <p className="text-amber-700 mb-8">Quiz multiplayer em tempo real</p>

        <button
          onClick={() => router.push("/create")}
          className="retro-button w-full mb-3"
        >
          Criar Quiz
        </button>

        <button
          onClick={() => router.push("/quizzes")}
          className="retro-button retro-button-secondary w-full mb-6"
        >
          Os Meus Quizzes
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-amber-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gloria-cream px-3 text-amber-600 font-bold text-sm">
              OU
            </span>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setJoinError("");
            }}
            placeholder="Codigo da sala (ex: ABC123)"
            className="retro-input w-full text-center text-lg tracking-widest uppercase"
            maxLength={6}
          />
          {joinError && (
            <p className="text-red-600 text-sm font-bold">{joinError}</p>
          )}
          <button
            type="submit"
            disabled={joining}
            className="retro-button retro-button-secondary w-full"
          >
            {joining ? "A procurar..." : "Entrar na Sala"}
          </button>
        </form>
      </div>
    </div>
  );
}
