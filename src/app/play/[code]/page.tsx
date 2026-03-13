"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRoomState } from "../../hooks/useRoomState";
import type { Player, Answer } from "../../types";

// --- Join Screen ---
function JoinScreen({
  code,
  onJoined,
  error: externalError,
}: {
  code: string;
  onJoined: (player: Player) => void;
  error?: string | null;
}) {
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Escreve o teu nome!");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao entrar");
        setJoining(false);
        return;
      }
      onJoined({ ...data, roomId: code, isConnected: true });
    } catch {
      setError("Erro de ligacao");
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="retro-card p-8 max-w-sm w-full text-center animate-bounce-in">
        <div className="text-5xl mb-3 animate-wave inline-block">🎲</div>
        <h1 className="text-2xl font-extrabold text-amber-900 mb-1">
          Quem conhece a Graca?
        </h1>
        <p className="text-amber-600 font-bold mb-6">Sala: {code}</p>

        {externalError && (
          <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 font-bold text-sm">{externalError}</p>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="O teu nome"
            className="retro-input w-full text-center text-lg"
            maxLength={20}
            autoFocus
          />
          {error && <p className="text-red-600 text-sm font-bold">{error}</p>}
          <button
            type="submit"
            disabled={joining}
            className="retro-button retro-button-green w-full"
          >
            {joining ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Waiting in Lobby ---
function PlayerLobby({ player, players }: { player: Player; players: Player[] }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="retro-card p-8 max-w-sm w-full text-center animate-bounce-in">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border-4 border-white"
          style={{ backgroundColor: player.color }}
        >
          {player.emoji}
        </div>
        <h2 className="text-xl font-extrabold text-amber-900 mb-1">
          Ola, {player.name}!
        </h2>
        <p className="text-amber-600 font-bold mb-6">A espera que o jogo comece...</p>

        <div className="bg-amber-100 rounded-xl p-4">
          <p className="text-amber-800 font-bold text-sm mb-3">
            Jogadores na sala ({players.length})
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((p) => (
              <span
                key={p.id}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold animate-slide-up ${
                  p.id === player.id
                    ? "bg-amber-300 text-amber-900"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.emoji}
                </span>
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="inline-block animate-wave text-3xl">⏳</div>
        </div>
      </div>
    </div>
  );
}

// --- Answer Multiple Choice ---
function PlayerMCQuestion({
  questionText,
  options,
  questionIndex,
  totalQuestions,
  onAnswer,
}: {
  questionText: string;
  options: string[];
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const colors = [
    "bg-retro-red hover:bg-red-600",
    "bg-retro-blue hover:bg-blue-700",
    "bg-retro-green hover:bg-green-700",
    "bg-retro-orange hover:bg-orange-600",
  ];

  function handleSelect(opt: string) {
    if (selected) return;
    setSelected(opt);
    onAnswer(opt);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <span className="text-amber-200 font-bold text-sm">
            Pergunta {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="retro-card p-6">
          <h2 className="text-lg font-extrabold text-amber-900 text-center">
            {questionText}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={`${colors[i % 4]} text-white font-bold text-lg p-4 rounded-xl text-center transition-all border-3 border-transparent ${
                selected === opt
                  ? "ring-4 ring-white scale-105"
                  : selected !== null
                  ? "opacity-50"
                  : ""
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {selected && (
          <div className="text-center animate-slide-up">
            <p className="text-amber-200 font-bold">Resposta enviada!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Answer Open-Ended ---
function PlayerOpenQuestion({
  questionText,
  questionIndex,
  totalQuestions,
  onAnswer,
}: {
  questionText: string;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitted) return;
    setSubmitted(true);
    onAnswer(text.trim());
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <span className="text-amber-200 font-bold text-sm">
            Pergunta {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="retro-card p-6">
          <h2 className="text-lg font-extrabold text-amber-900 text-center">
            {questionText}
          </h2>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="A tua resposta..."
              className="retro-input w-full text-center text-lg"
              maxLength={200}
              autoFocus
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="retro-button retro-button-green w-full"
            >
              Enviar
            </button>
          </form>
        ) : (
          <div className="text-center animate-slide-up">
            <div className="retro-card p-4 inline-block">
              <p className="text-amber-800 font-bold">Resposta enviada!</p>
              <p className="text-amber-600 text-sm mt-1">A espera do resultado...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Waiting after answer ---
function PlayerWaiting() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="retro-card p-8 max-w-sm w-full text-center animate-bounce-in">
        <div className="text-4xl mb-4 animate-wave inline-block">⏳</div>
        <p className="text-amber-800 font-bold text-lg">A espera do resultado...</p>
      </div>
    </div>
  );
}

// --- Reveal: show if player got it right ---
function PlayerReveal({
  player,
  answer,
  correctAnswer,
  questionText,
  players,
}: {
  player: Player;
  answer: Answer | null;
  correctAnswer?: string;
  questionText: string;
  players: Player[];
}) {
  const isCorrect = answer?.isCorrect === true;
  const myScore = players.find((p) => p.id === player.id)?.score ?? 0;
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex((p) => p.id === player.id) + 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div
          className={`retro-card p-8 text-center animate-bounce-in ${
            isCorrect ? "border-green-500" : "border-red-400"
          }`}
          style={{ borderColor: isCorrect ? "#27ae60" : "#e74c3c" }}
        >
          <div className="text-5xl mb-3">{isCorrect ? "🎉" : "😔"}</div>
          <h2
            className={`text-2xl font-extrabold mb-2 ${
              isCorrect ? "text-green-700" : "text-red-600"
            }`}
          >
            {isCorrect ? "Correto!" : answer ? "Errado!" : "Nao respondeste"}
          </h2>

          {correctAnswer && (
            <p className="text-amber-700 font-bold mt-2">
              Resposta: <span className="text-amber-900">{correctAnswer}</span>
            </p>
          )}
        </div>

        <div className="retro-card p-4 text-center">
          <div className="flex items-center justify-center gap-4">
            <div>
              <p className="text-amber-600 text-sm font-bold">Pontuacao</p>
              <p className="text-2xl font-extrabold text-amber-900">{myScore} pts</p>
            </div>
            <div className="w-px h-10 bg-amber-300" />
            <div>
              <p className="text-amber-600 text-sm font-bold">Posicao</p>
              <p className="text-2xl font-extrabold text-amber-900">{myRank}o</p>
            </div>
          </div>
        </div>

        {/* Mini leaderboard */}
        <div className="retro-card p-4">
          <p className="text-amber-800 font-bold text-sm mb-2 text-center">Top 5</p>
          <div className="space-y-1">
            {sorted.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm ${
                  p.id === player.id ? "bg-amber-200 font-extrabold" : "bg-amber-50"
                }`}
              >
                <span className="text-amber-800">
                  {i + 1}. {p.emoji} {p.name}
                </span>
                <span className="text-amber-700 font-bold">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Final Standings ---
function PlayerFinished({ player, players }: { player: Player; players: Player[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex((p) => p.id === player.id) + 1;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="retro-card p-6 text-center animate-bounce-in">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-extrabold text-amber-900 mb-2">Fim do Jogo!</h1>
          <p className="text-amber-700 font-bold">
            Ficaste em <span className="text-amber-900 text-xl">{myRank}o lugar</span>
          </p>
          <p className="text-amber-600 mt-1">
            com <span className="font-extrabold text-amber-800">{player.score} pontos</span>
          </p>
        </div>

        <div className="retro-card p-4">
          <h3 className="text-amber-800 font-bold text-center mb-3">Classificacao Final</h3>
          <div className="space-y-2">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  p.id === player.id
                    ? "bg-amber-200 border-2 border-amber-400"
                    : i === 0
                    ? "bg-yellow-100 border-2 border-yellow-300"
                    : "bg-amber-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{medals[i] || `${i + 1}.`}</span>
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.emoji}
                  </span>
                  <span className="font-bold text-amber-900 text-sm">{p.name}</span>
                </div>
                <span className="font-extrabold text-amber-800">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Player Page ---
export default function PlayPage() {
  const params = useParams();
  const code = params.code as string;
  const [player, setPlayer] = useState<Player | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);

  // Always poll room state so we can restore session and track game progress
  const { state, error, loading } = useRoomState(code);

  // Restore player session from localStorage on mount
  useEffect(() => {
    const storageKey = `player-${code}`;
    const savedPlayerId = localStorage.getItem(storageKey);
    if (savedPlayerId && state) {
      const found = state.players.find((p) => p.id === savedPlayerId);
      if (found) {
        setPlayer(found);
      } else {
        // Player was removed — clear stale session
        localStorage.removeItem(storageKey);
      }
    }
    if (!loading) {
      setRestoringSession(false);
    }
  }, [code, state, loading]);

  // Keep player score/data in sync with server
  useEffect(() => {
    if (!state || !player) return;
    const serverPlayer = state.players.find((p) => p.id === player.id);
    if (serverPlayer) {
      if (serverPlayer.score !== player.score || serverPlayer.name !== player.name) {
        setPlayer(serverPlayer);
      }
    } else {
      // Player was removed from the room
      setPlayer(null);
      localStorage.removeItem(`player-${code}`);
    }
  }, [state, player, code]);

  function handleJoined(p: Player) {
    localStorage.setItem(`player-${code}`, p.id);
    setPlayer(p);
  }

  async function handleAnswer(answerText: string) {
    if (!state?.currentQuestion || !player) return;
    const questionId = state.currentQuestion.id;

    try {
      await fetch(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, questionId, answerText }),
      });
    } catch {
      // Answer submission failed — will show as unanswered
    }
  }

  // Still restoring session or loading room
  if (restoringSession || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="retro-card p-8 text-center animate-bounce-in">
          <div className="text-4xl mb-3 animate-wave inline-block">🎲</div>
          <p className="text-amber-800 font-bold">A carregar...</p>
        </div>
      </div>
    );
  }

  // Not joined yet — show join screen
  if (!player) {
    return (
      <JoinScreen
        code={code}
        onJoined={handleJoined}
        error={error}
      />
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="retro-card p-8 text-center">
          <div className="text-4xl mb-3">😕</div>
          <p className="text-red-600 font-bold">{error || "Sala nao encontrada"}</p>
        </div>
      </div>
    );
  }

  const { room, quiz, players, currentQuestion, answers } = state;

  // Lobby phase
  if (room.phase === "lobby") {
    return <PlayerLobby player={player} players={players} />;
  }

  // Finished phase
  if (room.phase === "finished") {
    return <PlayerFinished player={player} players={players} />;
  }

  // Question phase
  if (room.phase === "question" && currentQuestion) {
    // Check server answers to see if player already answered this question
    const alreadyAnswered = answers.some((a) => a.playerId === player.id);

    if (alreadyAnswered || !room.questionOpen) {
      return <PlayerWaiting />;
    }

    if (currentQuestion.type === "multiple-choice" && currentQuestion.options) {
      return (
        <PlayerMCQuestion
          questionText={currentQuestion.text}
          options={currentQuestion.options}
          questionIndex={room.currentQuestionIndex}
          totalQuestions={quiz.questions.length}
          onAnswer={handleAnswer}
        />
      );
    }

    return (
      <PlayerOpenQuestion
        questionText={currentQuestion.text}
        questionIndex={room.currentQuestionIndex}
        totalQuestions={quiz.questions.length}
        onAnswer={handleAnswer}
      />
    );
  }

  // Reveal phase
  if (room.phase === "reveal" && currentQuestion) {
    const myAnswer = answers.find((a) => a.playerId === player.id) || null;
    return (
      <PlayerReveal
        player={player}
        answer={myAnswer}
        correctAnswer={currentQuestion.correctAnswer}
        questionText={currentQuestion.text}
        players={players}
      />
    );
  }

  // Fallback
  return <PlayerWaiting />;
}
