"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Question } from "../types";

interface DraftQuestion {
  text: string;
  type: "open-ended" | "multiple-choice";
  options: string[];
  correctAnswerIndex: number | null;
  points: number;
  timeLimit: number | null;
}

const emptyQuestion = (): DraftQuestion => ({
  text: "",
  type: "multiple-choice",
  options: ["", "", "", ""],
  correctAnswerIndex: null,
  points: 1,
  timeLimit: null,
});

function questionToDraft(q: Question): DraftQuestion {
  const options = q.type === "multiple-choice" && q.options?.length
    ? [...q.options, ...Array(Math.max(0, 4 - q.options.length)).fill("")]
    : ["", "", "", ""];
  const correctAnswerIndex = q.correctAnswer && q.options
    ? q.options.indexOf(q.correctAnswer)
    : null;
  return {
    text: q.text,
    type: q.type as "open-ended" | "multiple-choice",
    options,
    correctAnswerIndex: correctAnswerIndex !== null && correctAnswerIndex !== undefined && correctAnswerIndex >= 0 ? correctAnswerIndex : null,
    points: q.points || 1,
    timeLimit: q.timeLimit ?? null,
  };
}

export default function CreateQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-amber-700 animate-pulse">A carregar...</p>
      </div>
    }>
      <CreateQuizInner />
    </Suspense>
  );
}

function CreateQuizInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editId) return;
    async function loadQuiz() {
      try {
        const res = await fetch(`/api/quizzes/${editId}`);
        if (!res.ok) {
          setError("Quiz nao encontrado");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setTitle(data.title);
        setQuestions(data.questions.map(questionToDraft));
      } catch {
        setError("Erro ao carregar quiz");
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [editId]);

  function updateQuestion(idx: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  }

  function updateOption(qIdx: number, optIdx: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === optIdx ? value : o)) }
          : q
      )
    );
  }

  function removeQuestion(idx: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  }

  async function handleSave() {
    setError("");
    if (!title.trim()) {
      setError("Da um titulo ao quiz!");
      return;
    }

    const valid = questions.every((q) => {
      if (!q.text.trim()) return false;
      if (q.type === "multiple-choice") {
        const filled = q.options.filter((o) => o.trim());
        if (filled.length < 2) return false;
        if (q.correctAnswerIndex === null || !q.options[q.correctAnswerIndex]?.trim()) return false;
      }
      return true;
    });

    if (!valid) {
      setError(
        "Verifica as perguntas: cada uma precisa de texto, e as de escolha multipla precisam de pelo menos 2 opcoes e uma resposta correta."
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        questions: questions.map((q) => ({
          text: q.text.trim(),
          type: q.type,
          options: q.type === "multiple-choice" ? q.options.filter((o) => o.trim()) : [],
          correctAnswer: q.type === "multiple-choice" && q.correctAnswerIndex !== null
            ? q.options[q.correctAnswerIndex]?.trim()
            : undefined,
          points: q.points,
          timeLimit: q.timeLimit,
        })),
      };

      if (editId) {
        // Update existing quiz
        const res = await fetch(`/api/quizzes/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao guardar");
        }
        router.push("/quizzes");
      } else {
        // Create new quiz + room
        const res = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erro ao guardar");
        }

        const { id: quizId } = await res.json();

        // Create room immediately
        const roomRes = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId }),
        });

        if (!roomRes.ok) throw new Error("Erro ao criar sala");
        const { code } = await roomRes.json();

        router.push(`/host/${code}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 py-8">
      <div className="retro-card p-6 md:p-8 max-w-2xl w-full animate-bounce-in">
        <h1 className="text-2xl md:text-3xl font-extrabold text-amber-900 mb-6 text-center">
          {editId ? "Editar Quiz" : "Criar Quiz"}
        </h1>

        {loading ? (
          <p className="text-amber-700 text-center animate-pulse py-8">A carregar quiz...</p>
        ) : (
        <>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titulo do quiz..."
          className="retro-input w-full text-lg mb-6"
        />

        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 animate-slide-up"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-amber-800">
                  Pergunta {qIdx + 1}
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-amber-600 font-bold">Pontos:</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={q.points}
                    onChange={(e) =>
                      updateQuestion(qIdx, { points: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="retro-input w-20 text-center text-sm py-1 px-2"
                  />
                  <label className="text-xs text-amber-600 font-bold">Tempo:</label>
                  <select
                    value={q.timeLimit ?? ""}
                    onChange={(e) =>
                      updateQuestion(qIdx, { timeLimit: e.target.value ? parseInt(e.target.value) : null })
                    }
                    className="retro-input text-sm py-1 px-2"
                  >
                    <option value="">Sem limite</option>
                    <option value="10">10s</option>
                    <option value="20">20s</option>
                    <option value="30">30s</option>
                    <option value="60">60s</option>
                  </select>
                  {questions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      className="text-red-500 hover:text-red-700 font-bold text-lg px-2"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={q.text}
                onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                placeholder="Escreve a pergunta..."
                className="retro-input w-full mb-3 resize-none"
                rows={2}
              />

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => updateQuestion(qIdx, { type: "multiple-choice" })}
                  className={`text-xs font-bold px-3 py-1 rounded-lg border-2 transition-colors ${
                    q.type === "multiple-choice"
                      ? "bg-amber-600 text-white border-amber-700"
                      : "bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  Escolha Multipla
                </button>
                <button
                  onClick={() => updateQuestion(qIdx, { type: "open-ended" })}
                  className={`text-xs font-bold px-3 py-1 rounded-lg border-2 transition-colors ${
                    q.type === "open-ended"
                      ? "bg-amber-600 text-white border-amber-700"
                      : "bg-white text-amber-700 border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  Resposta Aberta
                </button>
              </div>

              {q.type === "multiple-choice" && (
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIdx}`}
                        checked={q.correctAnswerIndex === optIdx}
                        onChange={() => updateQuestion(qIdx, { correctAnswerIndex: optIdx })}
                        className="w-4 h-4 accent-green-600"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                        placeholder={`Opcao ${optIdx + 1}`}
                        className="retro-input flex-1 text-sm py-1.5"
                      />
                    </div>
                  ))}
                  <p className="text-xs text-amber-600 mt-1">
                    Seleciona o radio da resposta correta
                  </p>
                </div>
              )}

              {q.type === "open-ended" && (
                <p className="text-xs text-amber-600 italic">
                  O organizador avalia as respostas manualmente durante o jogo.
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="retro-button retro-button-secondary w-full mt-4"
        >
          + Adicionar Pergunta
        </button>

        {error && (
          <p className="text-red-600 font-bold text-center mt-4">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="retro-button retro-button-green w-full mt-4"
        >
          {saving ? "A guardar..." : editId ? "Guardar Alteracoes" : "Guardar e Criar Sala"}
        </button>

        <button
          onClick={() => router.push(editId ? "/quizzes" : "/")}
          className="block mx-auto mt-4 text-amber-700 hover:text-amber-900 font-bold text-sm underline"
        >
          {editId ? "Voltar aos quizzes" : "Voltar ao menu"}
        </button>
        </>
        )}
      </div>
    </div>
  );
}
