"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface QuizSummary {
  id: string;
  title: string;
  createdAt: string;
  questionCount: number;
}

export default function QuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await fetch("/api/quizzes");
      if (res.ok) {
        setQuizzes(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  async function handleUseQuiz(quizId: string) {
    setCreating(quizId);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/host/${data.code}`);
      }
    } finally {
      setCreating(null);
    }
  }

  async function handleDelete(quizId: string) {
    setDeleting(quizId);
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
      if (res.ok) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      }
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-8">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/")}
            className="text-amber-700 hover:text-amber-900 font-bold text-sm"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-amber-900">
            Os Meus Quizzes
          </h1>
          <button
            onClick={() => router.push("/create")}
            className="retro-button text-sm !py-2 !px-4"
          >
            + Novo
          </button>
        </div>

        {loading && (
          <div className="retro-card p-8 text-center">
            <p className="text-amber-700 animate-pulse">A carregar...</p>
          </div>
        )}

        {!loading && quizzes.length === 0 && (
          <div className="retro-card p-8 text-center animate-bounce-in">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-amber-800 font-bold mb-2">Ainda nao tens quizzes</p>
            <p className="text-amber-600 text-sm mb-4">
              Cria o teu primeiro quiz para comecar!
            </p>
            <button
              onClick={() => router.push("/create")}
              className="retro-button"
            >
              Criar Quiz
            </button>
          </div>
        )}

        {!loading && quizzes.length > 0 && (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="retro-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-slide-up"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-amber-900 truncate">
                    {quiz.title}
                  </h2>
                  <p className="text-amber-600 text-sm">
                    {quiz.questionCount} {quiz.questionCount === 1 ? "pergunta" : "perguntas"} · {formatDate(quiz.createdAt)}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleUseQuiz(quiz.id)}
                    disabled={creating === quiz.id}
                    className="retro-button text-sm !py-1.5 !px-3"
                  >
                    {creating === quiz.id ? "A criar..." : "Jogar"}
                  </button>
                  <button
                    onClick={() => router.push(`/create?edit=${quiz.id}`)}
                    className="retro-button retro-button-secondary text-sm !py-1.5 !px-3"
                  >
                    Editar
                  </button>
                  {confirmDelete === quiz.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(quiz.id)}
                        disabled={deleting === quiz.id}
                        className="bg-red-600 text-white font-bold text-sm py-1.5 px-3 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        {deleting === quiz.id ? "..." : "Sim"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="bg-gray-300 text-gray-700 font-bold text-sm py-1.5 px-3 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Nao
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(quiz.id)}
                      className="bg-red-100 text-red-700 font-bold text-sm py-1.5 px-3 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Apagar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
