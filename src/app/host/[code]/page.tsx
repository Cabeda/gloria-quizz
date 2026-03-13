"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoomState } from "../../hooks/useRoomState";
import { useSound } from "../../hooks/useSound";
import { MuteButton } from "../../components/MuteButton";
import { ReactionOverlay } from "../../components/Reactions";
import type { Player, Answer, Question } from "../../types";
import QRCode from "qrcode";

// --- API helpers ---
async function patchRoom(code: string, body: Record<string, unknown>) {
  await fetch(`/api/rooms/${code}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function markAnswer(code: string, answerId: string, isCorrect: boolean) {
  await fetch(`/api/rooms/${code}/answers/${answerId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isCorrect }),
  });
}

// --- Draft question type for editor ---
interface DraftQuestion {
  id?: string;
  text: string;
  type: "open-ended" | "multiple-choice";
  options: string[];
  correctAnswerIndex: number | null;
  points: number;
  timeLimit: number | null;
}

function questionToDraft(q: Question): DraftQuestion {
  const options = q.type === "multiple-choice" ? (q.options || ["", "", "", ""]) : ["", "", "", ""];
  let correctAnswerIndex: number | null = null;
  if (q.correctAnswer) {
    const idx = options.findIndex((o) => o === q.correctAnswer);
    if (idx >= 0) correctAnswerIndex = idx;
  }
  return {
    id: q.id,
    text: q.text,
    type: q.type,
    options,
    correctAnswerIndex,
    points: q.points,
    timeLimit: q.timeLimit ?? null,
  };
}

const emptyDraft = (): DraftQuestion => ({
  text: "",
  type: "multiple-choice",
  options: ["", "", "", ""],
  correctAnswerIndex: null,
  points: 1,
  timeLimit: null,
});

// --- Quiz Editor Panel ---
function QuizEditor({
  quizId,
  questions,
  onClose,
}: {
  quizId: string;
  questions: Question[];
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<DraftQuestion[]>(questions.map(questionToDraft));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateDraft(idx: number, patch: Partial<DraftQuestion>) {
    setDrafts((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
    setSaved(false);
  }

  function updateOption(qIdx: number, optIdx: number, value: string) {
    setDrafts((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.map((o, j) => (j === optIdx ? value : o)) } : q
      )
    );
    setSaved(false);
  }

  function removeDraft(idx: number) {
    if (drafts.length <= 1) return;
    setDrafts((prev) => prev.filter((_, i) => i !== idx));
    setSaved(false);
  }

  function addDraft() {
    setDrafts((prev) => [...prev, emptyDraft()]);
    setSaved(false);
  }

  function moveDraft(from: number, to: number) {
    setDrafts((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setError("");
    const valid = drafts.every((q) => {
      if (!q.text.trim()) return false;
      if (q.type === "multiple-choice") {
        const filled = q.options.filter((o) => o.trim());
        if (filled.length < 2) return false;
        if (q.correctAnswerIndex === null || !q.options[q.correctAnswerIndex]?.trim()) return false;
      }
      return true;
    });

    if (!valid) {
      setError("Verifica as perguntas: texto obrigatorio, escolha multipla precisa de 2+ opcoes e resposta correta.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: drafts.map((q) => ({
            id: q.id,
            text: q.text.trim(),
            type: q.type,
            options: q.type === "multiple-choice" ? q.options.filter((o) => o.trim()) : [],
            correctAnswer: q.type === "multiple-choice" && q.correctAnswerIndex !== null
              ? q.options[q.correctAnswerIndex]?.trim()
              : undefined,
            points: q.points,
            timeLimit: q.timeLimit,
          })),
        }),
      });
      if (!res.ok) throw new Error("Erro ao guardar");
      setSaved(true);
    } catch {
      setError("Erro ao guardar alteracoes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-amber-50 w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-amber-900">Editar Quiz</h2>
          <button onClick={onClose} className="text-amber-700 hover:text-amber-900 font-bold text-2xl">
            X
          </button>
        </div>

        <div className="space-y-4">
          {drafts.map((q, qIdx) => (
            <div
              key={qIdx}
              className={`bg-white border-2 rounded-xl p-4 transition-opacity ${
                dragIndex === qIdx ? "opacity-50 border-amber-500" : "border-amber-300"
              }`}
              draggable
              onDragStart={() => setDragIndex(qIdx)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== qIdx) {
                  moveDraft(dragIndex, qIdx);
                }
                setDragIndex(null);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="cursor-grab active:cursor-grabbing text-amber-400 hover:text-amber-600 select-none" title="Arrastar para reordenar">
                    &#x2630;
                  </span>
                  <span className="font-bold text-amber-800 text-sm">Pergunta {qIdx + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-amber-600 font-bold">Pts:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={q.points}
                    onChange={(e) => updateDraft(qIdx, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="retro-input w-20 text-center text-sm py-1 px-2"
                  />
                  <label className="text-xs text-amber-600 font-bold">Tempo:</label>
                  <select
                    value={q.timeLimit ?? ""}
                    onChange={(e) =>
                      updateDraft(qIdx, { timeLimit: e.target.value ? parseInt(e.target.value) : null })
                    }
                    className="retro-input text-sm py-1 px-1"
                  >
                    <option value="">--</option>
                    <option value="10">10s</option>
                    <option value="20">20s</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                  </select>
                  {drafts.length > 1 && (
                    <button onClick={() => removeDraft(qIdx)} className="text-red-500 hover:text-red-700 font-bold text-lg px-1">
                      X
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={q.text}
                onChange={(e) => updateDraft(qIdx, { text: e.target.value })}
                placeholder="Escreve a pergunta..."
                className="retro-input w-full mb-2 resize-none text-sm"
                rows={2}
              />

              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => updateDraft(qIdx, { type: "multiple-choice" })}
                  className={`text-xs font-bold px-2 py-1 rounded-lg border-2 transition-colors ${
                    q.type === "multiple-choice"
                      ? "bg-amber-600 text-white border-amber-700"
                      : "bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  Escolha Multipla
                </button>
                <button
                  onClick={() => updateDraft(qIdx, { type: "open-ended" })}
                  className={`text-xs font-bold px-2 py-1 rounded-lg border-2 transition-colors ${
                    q.type === "open-ended"
                      ? "bg-amber-600 text-white border-amber-700"
                      : "bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  Resposta Aberta
                </button>
              </div>

              {q.type === "multiple-choice" && (
                <div className="space-y-1">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`edit-correct-${qIdx}`}
                        checked={q.correctAnswerIndex === optIdx}
                        onChange={() => updateDraft(qIdx, { correctAnswerIndex: optIdx })}
                        className="w-3 h-3 accent-green-600"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Opcao ${optIdx + 1}`}
                        className="retro-input flex-1 text-sm py-1"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={addDraft} className="retro-button retro-button-secondary w-full mt-4 text-sm">
          + Adicionar Pergunta
        </button>

        {error && <p className="text-red-600 font-bold text-center mt-3 text-sm">{error}</p>}
        {saved && <p className="text-green-600 font-bold text-center mt-3 text-sm">Guardado!</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="retro-button retro-button-green w-full mt-3"
        >
          {saving ? "A guardar..." : "Guardar Alteracoes"}
        </button>
      </div>
    </div>
  );
}

// --- QR Code component ---
function QRCodeDisplay({ code }: { code: string }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/play/${code}`;
    QRCode.toDataURL(url, { width: 200, margin: 2 }).then(setQrUrl);
  }, [code]);

  if (!qrUrl) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrUrl} alt="QR Code" className="rounded-xl border-4 border-amber-800" />
      <p className="text-amber-700 text-sm font-bold">
        Ou vai a: <span className="text-amber-900">{window.location.origin}/play/{code}</span>
      </p>
    </div>
  );
}

// --- Lobby ---
function HostLobby({ code, players, onEdit }: { code: string; players: Player[]; quizId: string; questions: Question[]; onEdit: () => void }) {
  async function startGame() {
    await patchRoom(code, { phase: "question", questionOpen: true });
  }

  async function removePlayer(playerId: string) {
    await fetch(`/api/rooms/${code}/players/${playerId}`, { method: "DELETE" });
  }

  return (
    <div className="text-center space-y-6">
      <div className="text-6xl animate-wave inline-block">🎲</div>
      <h1 className="text-4xl font-extrabold text-amber-900">Sala: {code}</h1>
      <QRCodeDisplay code={code} />

      <div className="retro-card p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-amber-800 mb-4">
          Jogadores ({players.length})
        </h2>
        {players.length === 0 ? (
          <p className="text-amber-600 italic">A espera de jogadores...</p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2 animate-slide-up"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.emoji}
                </span>
                <span className="font-bold text-amber-900">{p.name}</span>
                <button
                  onClick={() => removePlayer(p.id)}
                  className="text-red-400 hover:text-red-600 font-bold text-sm ml-1"
                  title="Remover jogador"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        <button onClick={onEdit} className="retro-button retro-button-secondary">
          Editar Quiz
        </button>
        {players.length >= 1 && (
          <button onClick={startGame} className="retro-button retro-button-green text-xl px-12">
            Comecar!
          </button>
        )}
      </div>
    </div>
  );
}

// --- Countdown Timer Hook ---
function useCountdown(timeLimit: number | null | undefined, questionStartedAt: string | null | undefined, active: boolean) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const isActive = Boolean(timeLimit && questionStartedAt && active);

  useEffect(() => {
    if (!isActive) {
      // Use a 0ms timeout so setState is in a callback, not synchronous in the effect body
      const t = setTimeout(() => setRemaining(null), 0);
      return () => clearTimeout(t);
    }

    function tick() {
      const elapsed = (Date.now() - new Date(questionStartedAt!).getTime()) / 1000;
      setRemaining(Math.ceil(Math.max(0, timeLimit! - elapsed)));
    }

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isActive, timeLimit, questionStartedAt]);

  return remaining;
}

// --- Countdown Display ---
function CountdownDisplay({ remaining, timeLimit, size = "lg" }: { remaining: number; timeLimit: number; size?: "lg" | "sm" }) {
  const pct = (remaining / timeLimit) * 100;
  const isUrgent = remaining <= 5;
  const isLg = size === "lg";

  return (
    <div className={`flex items-center gap-3 ${isLg ? "" : "gap-2"}`}>
      <div className={`relative ${isLg ? "w-16 h-16" : "w-10 h-10"}`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-900/20" />
          <circle
            cx="18" cy="18" r="16" fill="none" strokeWidth="3"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
            className={`transition-all duration-300 ${isUrgent ? "text-red-500" : "text-amber-400"}`}
            stroke="currentColor"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-extrabold ${isLg ? "text-lg" : "text-sm"} ${isUrgent ? "text-red-500 animate-pulse-glow" : "text-amber-200"}`}>
          {remaining}
        </span>
      </div>
    </div>
  );
}

// --- Question View ---
function HostQuestion({
  code,
  questionIndex,
  totalQuestions,
  questionText,
  questionType,
  options,
  answers,
  players,
  questionOpen,
  timeLimit,
  questionStartedAt,
  onEdit,
  playSound,
}: {
  code: string;
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  questionType: string;
  options?: string[];
  answers: Answer[];
  players: Player[];
  questionOpen: boolean;
  timeLimit?: number | null;
  questionStartedAt?: string | null;
  onEdit: () => void;
  playSound: (name: "tick" | "correct" | "wrong" | "reveal" | "fanfare") => void;
}) {
  const remaining = useCountdown(timeLimit, questionStartedAt, questionOpen);
  const lastTickRef = useRef<number | null>(null);

  // Play tick sound during last 5 seconds
  useEffect(() => {
    if (remaining !== null && remaining > 0 && remaining <= 5 && remaining !== lastTickRef.current) {
      lastTickRef.current = remaining;
      playSound("tick");
    }
    if (remaining === null || remaining > 5) {
      lastTickRef.current = null;
    }
  }, [remaining, playSound]);

  async function closeQuestion() {
    await patchRoom(code, { questionOpen: false });
  }

  async function showReveal() {
    await patchRoom(code, { phase: "reveal", questionOpen: false });
  }

  const answeredCount = answers.length;
  const totalPlayers = players.length;
  const allAnswered = totalPlayers > 0 && answeredCount >= totalPlayers;

  // Auto-close when timer expires
  useEffect(() => {
    if (remaining === 0 && questionOpen) {
      patchRoom(code, { questionOpen: false });
    }
  }, [remaining, questionOpen, code]);

  // Auto-reveal when all players answered (MC only)
  // For open-ended, just close answers so host can grade before revealing
  useEffect(() => {
    if (allAnswered && questionOpen) {
      if (questionType === "open-ended") {
        const timer = setTimeout(() => {
          patchRoom(code, { questionOpen: false });
        }, 2000);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          patchRoom(code, { phase: "reveal", questionOpen: false });
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [allAnswered, questionOpen, code, questionType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-amber-200 font-bold text-lg">
          Pergunta {questionIndex + 1} / {totalQuestions}
        </span>
        <div className="flex items-center gap-4">
          {remaining !== null && timeLimit && (
            <CountdownDisplay remaining={remaining} timeLimit={timeLimit} />
          )}
          <span className="text-amber-200 font-bold">
            {answeredCount} / {totalPlayers} responderam
          </span>
        </div>
      </div>

      {/* Answer progress bar */}
      <div className="w-full bg-amber-900/30 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: totalPlayers > 0 ? `${(answeredCount / totalPlayers) * 100}%` : "0%",
            backgroundColor: allAnswered ? "#22c55e" : "#f59e0b",
          }}
        />
      </div>

      {allAnswered && questionOpen && (
        <div className="text-center animate-bounce-in">
          <span className="bg-green-500 text-white font-bold px-6 py-2 rounded-full text-lg">
            Todos responderam!
          </span>
        </div>
      )}

      <div className="retro-card p-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-amber-900 text-center mb-6">
          {questionText}
        </h2>

        {questionType === "multiple-choice" && options && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {options.map((opt, i) => {
              const colors = ["bg-retro-red", "bg-retro-blue", "bg-retro-green", "bg-retro-orange"];
              return (
                <div
                  key={i}
                  className={`${colors[i % 4]} text-white font-bold text-lg p-4 rounded-xl text-center`}
                >
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        {questionType === "open-ended" && answers.length > 0 && (
          <div className="space-y-2 mb-6">
            <h3 className="font-bold text-amber-800 text-lg">
              Respostas:{questionOpen ? " (a receber...)" : ""}
            </h3>
            {answers.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between bg-amber-50 rounded-lg p-3 border-2 border-amber-200"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: a.playerColor }}
                  >
                    {a.playerEmoji}
                  </span>
                  <span className="font-bold text-amber-900">{a.playerName}</span>
                  <span className="text-amber-700">— {a.answerText}</span>
                </div>
                {!questionOpen && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => markAnswer(code, a.id, true)}
                      className={`px-3 py-1 rounded-lg font-bold text-sm border-2 transition-colors ${
                        a.isCorrect === true
                          ? "bg-green-500 text-white border-green-600"
                          : "bg-white text-green-600 border-green-300 hover:bg-green-50"
                      }`}
                    >
                      Certo
                    </button>
                    <button
                      onClick={() => markAnswer(code, a.id, false)}
                      className={`px-3 py-1 rounded-lg font-bold text-sm border-2 transition-colors ${
                        a.isCorrect === false
                          ? "bg-red-500 text-white border-red-600"
                          : "bg-white text-red-600 border-red-300 hover:bg-red-50"
                      }`}
                    >
                      Errado
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        <button onClick={onEdit} className="retro-button retro-button-secondary text-sm">
          Editar Quiz
        </button>
        {questionOpen && (
          <button onClick={closeQuestion} className="retro-button retro-button-secondary">
            Fechar Respostas
          </button>
        )}
        {!questionOpen && questionType === "open-ended" && (answers.length === 0 || answers.some((a) => a.isCorrect === null)) && (
          <p className="text-amber-200 font-bold self-center">
            {answers.length === 0 ? "Ninguem respondeu ainda" : "Avalia todas as respostas antes de revelar"}
          </p>
        )}
        {!questionOpen && questionType === "open-ended" && answers.length > 0 && answers.every((a) => a.isCorrect !== null) && (
          <button onClick={showReveal} className="retro-button">
            Revelar Resultado
          </button>
        )}
        {!questionOpen && questionType !== "open-ended" && (
          <button onClick={showReveal} className="retro-button">
            Revelar Resultado
          </button>
        )}
      </div>
    </div>
  );
}

// --- Reveal View ---
function HostReveal({
  code,
  questionIndex,
  totalQuestions,
  questionText,
  correctAnswer,
  answers,
  players,
  onEdit,
}: {
  code: string;
  questionIndex: number;
  totalQuestions: number;
  questionText: string;
  correctAnswer?: string;
  answers: Answer[];
  players: Player[];
  onEdit: () => void;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const isLast = questionIndex >= totalQuestions - 1;

  async function nextQuestion() {
    await patchRoom(code, {
      currentQuestionIndex: questionIndex + 1,
      phase: "question",
      questionOpen: true,
    });
  }

  async function finishGame() {
    await patchRoom(code, { phase: "finished" });
  }

  const correctPlayers = answers.filter((a) => a.isCorrect === true);
  const wrongPlayers = answers.filter((a) => a.isCorrect !== true);

  return (
    <div className="space-y-6">
      <div className="retro-card p-8 text-center">
        <p className="text-amber-600 font-bold mb-2">
          Pergunta {questionIndex + 1} / {totalQuestions}
        </p>
        <h2 className="text-2xl font-extrabold text-amber-900 mb-4">{questionText}</h2>

        {correctAnswer && (
          <div className="bg-green-100 border-3 border-green-500 rounded-xl p-4 mb-6 inline-block">
            <p className="text-green-800 font-bold text-xl">Resposta: {correctAnswer}</p>
          </div>
        )}

        <div className="flex gap-8 justify-center mt-4">
          <div>
            <p className="text-green-600 font-bold text-lg mb-2">Acertaram ({correctPlayers.length})</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {correctPlayers.map((a) => {
                const p = players.find((pl) => pl.id === a.playerId);
                const streak = p?.streak ?? 0;
                return (
                <span
                  key={a.id}
                  className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-lg text-sm animate-bounce-in"
                >
                  {a.playerEmoji} {a.playerName}{streak >= 3 ? ` 🔥${streak}` : ""}
                </span>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-red-600 font-bold text-lg mb-2">Erraram ({wrongPlayers.length})</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {wrongPlayers.map((a) => (
                <span
                  key={a.id}
                  className="bg-red-100 text-red-800 font-bold px-3 py-1 rounded-lg text-sm"
                >
                  {a.playerEmoji} {a.playerName}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="retro-card p-6 max-w-lg mx-auto">
        <h3 className="text-xl font-bold text-amber-800 mb-4 text-center">Classificacao</h3>
        <div className="space-y-2">
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                i === 0 ? "bg-yellow-100 border-2 border-yellow-400" : "bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-amber-800 w-6">{i + 1}.</span>
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.emoji}
                </span>
                <span className="font-bold text-amber-900">{p.name}</span>
                {(p.streak ?? 0) >= 3 && (
                  <span className="text-orange-500 font-extrabold text-sm animate-pulse">
                    🔥{p.streak}
                  </span>
                )}
              </div>
              <span className="font-extrabold text-amber-800 text-lg">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        <button onClick={onEdit} className="retro-button retro-button-secondary text-sm">
          Editar Quiz
        </button>
        {isLast ? (
          <button onClick={finishGame} className="retro-button text-xl px-12">
            Ver Resultado Final
          </button>
        ) : (
          <button onClick={nextQuestion} className="retro-button retro-button-green text-xl px-12">
            Proxima Pergunta
          </button>
        )}
      </div>
    </div>
  );
}

// --- Finished View with Podium ---
function HostFinished({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉"];
  const [revealStep, setRevealStep] = useState(0);
  // Pre-compute confetti random values to avoid Math.random() during render
  const [confettiPieces] = useState(() =>
    Array.from({ length: 40 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
    }))
  );
  // Step 0 = nothing, 1 = 3rd place, 2 = 2nd place, 3 = 1st place, 4 = full leaderboard

  useEffect(() => {
    const hasThree = sorted.length >= 3;
    const delays = hasThree ? [500, 2000, 3500, 5000] : [500, 1500];
    const timers = delays.map((delay, i) =>
      setTimeout(() => setRevealStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [sorted.length]);

  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const hasPodium = sorted.length >= 3;

  const podiumColors = {
    first: "from-yellow-300 to-yellow-500",
    second: "from-gray-300 to-gray-400",
    third: "from-orange-300 to-orange-500",
  };

  return (
    <div className="text-center space-y-6 relative">
      {/* Confetti — triggered when 1st place revealed */}
      {((hasPodium && revealStep >= 3) || (!hasPodium && revealStep >= 1)) &&
        confettiPieces.map((piece, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${piece.left}%`,
              backgroundColor: ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#e67e22"][i % 6],
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}

      <h1 className="text-4xl font-extrabold text-amber-900 animate-bounce-in">Fim do Jogo!</h1>

      {/* Podium (only if 3+ players) */}
      {hasPodium && (
        <div className="flex items-end justify-center gap-4 mt-8 mb-6" style={{ minHeight: 280 }}>
          {/* 2nd Place */}
          <div className="flex flex-col items-center" style={{ opacity: revealStep >= 2 ? 1 : 0 }}>
            {revealStep >= 2 && (
              <>
                <div style={{ animation: "podium-name 0.5s ease-out forwards" }}>
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl border-4 border-white mx-auto mb-2"
                    style={{ backgroundColor: second?.color }}
                  >
                    {second?.emoji}
                  </span>
                  <p className="font-extrabold text-amber-900 text-lg">{second?.name}</p>
                  <p className="font-bold text-amber-700">{second?.score} pts</p>
                </div>
                <div
                  className={`w-28 bg-gradient-to-t ${podiumColors.second} rounded-t-xl border-3 border-amber-800 mt-2 flex items-center justify-center`}
                  style={{ height: 120, transformOrigin: "bottom", animation: "podium-rise 0.6s ease-out forwards" }}
                >
                  <span className="text-4xl">🥈</span>
                </div>
              </>
            )}
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center" style={{ opacity: revealStep >= 3 ? 1 : 0 }}>
            {revealStep >= 3 && (
              <>
                <div style={{ animation: "crown-drop 0.6s ease-out forwards" }}>
                  <span className="text-4xl">👑</span>
                </div>
                <div style={{ animation: "podium-name 0.5s ease-out 0.3s both" }}>
                  <span
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-yellow-400 mx-auto mb-2"
                    style={{ backgroundColor: first?.color }}
                  >
                    {first?.emoji}
                  </span>
                  <p className="font-extrabold text-amber-900 text-xl">{first?.name}</p>
                  <p className="font-bold text-amber-700 text-lg">{first?.score} pts</p>
                </div>
                <div
                  className={`w-32 bg-gradient-to-t ${podiumColors.first} rounded-t-xl border-3 border-amber-800 mt-2 flex items-center justify-center`}
                  style={{ height: 160, transformOrigin: "bottom", animation: "podium-rise 0.8s ease-out forwards" }}
                >
                  <span className="text-5xl">🥇</span>
                </div>
              </>
            )}
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center" style={{ opacity: revealStep >= 1 ? 1 : 0 }}>
            {revealStep >= 1 && (
              <>
                <div style={{ animation: "podium-name 0.5s ease-out forwards" }}>
                  <span
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-white mx-auto mb-2"
                    style={{ backgroundColor: third?.color }}
                  >
                    {third?.emoji}
                  </span>
                  <p className="font-extrabold text-amber-900">{third?.name}</p>
                  <p className="font-bold text-amber-700 text-sm">{third?.score} pts</p>
                </div>
                <div
                  className={`w-24 bg-gradient-to-t ${podiumColors.third} rounded-t-xl border-3 border-amber-800 mt-2 flex items-center justify-center`}
                  style={{ height: 80, transformOrigin: "bottom", animation: "podium-rise 0.5s ease-out forwards" }}
                >
                  <span className="text-3xl">🥉</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full leaderboard — shown after podium reveal or immediately if < 3 players */}
      {((hasPodium && revealStep >= 4) || (!hasPodium && revealStep >= 1)) && (
        <div className="retro-card p-8 max-w-lg mx-auto animate-slide-up">
          <h2 className="text-2xl font-bold text-amber-800 mb-6">Classificacao Final</h2>
          <div className="space-y-3">
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 rounded-xl animate-slide-up ${
                  i === 0
                    ? "bg-yellow-100 border-3 border-yellow-400 scale-105"
                    : i === 1
                    ? "bg-gray-100 border-2 border-gray-300"
                    : i === 2
                    ? "bg-orange-50 border-2 border-orange-300"
                    : "bg-amber-50"
                }`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{medals[i] || `${i + 1}.`}</span>
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.emoji}
                  </span>
                  <span className="font-extrabold text-amber-900 text-lg">{p.name}</span>
                </div>
                <span className="font-extrabold text-amber-800 text-xl">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Host Page ---
export default function HostPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { state, error, loading } = useRoomState(code);
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { play, muted, toggleMute, startMusic, stopMusic } = useSound();

  // Play sounds + music on phase transitions
  const phase = state?.room.phase;
  const prevPhaseRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (phase && phase !== prevPhaseRef.current) {
      if (phase === "question") startMusic();
      if (phase !== "question") stopMusic();
      if (phase === "reveal") play("reveal");
      if (phase === "finished") play("fanfare");
      prevPhaseRef.current = phase;
    }
  }, [phase, play, startMusic, stopMusic]);

  // Stop music on unmount
  useEffect(() => {
    return () => stopMusic();
  }, [stopMusic]);

  async function resetGame() {
    setResetting(true);
    await fetch(`/api/rooms/${code}/reset`, { method: "POST" });
    setResetting(false);
    setConfirmReset(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="retro-card p-12 text-center animate-bounce-in">
          <div className="text-5xl mb-4">🎲</div>
          <p className="text-amber-800 font-bold text-lg">A carregar sala...</p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    router.replace("/");
    return null;
  }

  const { room, quiz, players, currentQuestion, answers } = state;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <MuteButton muted={muted} onToggle={toggleMute} />
      <ReactionOverlay code={code} />
      <div className="w-full max-w-4xl">
        {room.phase === "lobby" && <HostLobby code={code} players={players} quizId={quiz.id} questions={quiz.questions} onEdit={() => setEditing(true)} />}

        {room.phase === "question" && currentQuestion && (
          <HostQuestion
            code={code}
            questionIndex={room.currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            questionText={currentQuestion.text}
            questionType={currentQuestion.type}
            options={currentQuestion.options}
            answers={answers}
            players={players}
            questionOpen={room.questionOpen}
            timeLimit={currentQuestion.timeLimit}
            questionStartedAt={room.questionStartedAt}
            onEdit={() => setEditing(true)}
            playSound={play}
          />
        )}

        {room.phase === "reveal" && currentQuestion && (
          <HostReveal
            code={code}
            questionIndex={room.currentQuestionIndex}
            totalQuestions={quiz.questions.length}
            questionText={currentQuestion.text}
            correctAnswer={currentQuestion.correctAnswer}
            answers={answers}
            players={players}
            onEdit={() => setEditing(true)}
          />
        )}

        {room.phase === "finished" && <HostFinished players={players} />}

        {/* Reset button — available in all phases except lobby */}
        {room.phase !== "lobby" && (
          <div className="text-center mt-6">
            <button
              onClick={() => setConfirmReset(true)}
              className="text-red-400 hover:text-red-600 font-bold text-sm underline"
            >
              Reiniciar Jogo
            </button>
          </div>
        )}
      </div>

      {editing && <QuizEditor quizId={quiz.id} questions={quiz.questions} onClose={() => setEditing(false)} />}

      {/* Reset confirmation dialog */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmReset(false)}>
          <div className="retro-card p-8 max-w-sm text-center animate-bounce-in" onClick={(e) => e.stopPropagation()}>
            <p className="text-amber-900 font-bold text-lg mb-4">
              Tens a certeza que queres reiniciar o jogo?
            </p>
            <p className="text-amber-600 text-sm mb-6">
              As pontuacoes e respostas serao apagadas.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setConfirmReset(false)}
                className="retro-button retro-button-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={resetGame}
                disabled={resetting}
                className="retro-button bg-red-500 hover:bg-red-600 text-white border-red-700"
              >
                {resetting ? "A reiniciar..." : "Sim, Reiniciar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
