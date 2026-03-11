"use client";

import { useState } from "react";
import { useGame } from "../context/GameContext";
import type { Question, Quiz } from "../types";

export function QuizCreator() {
  const { state, dispatch } = useGame();

  // If we have players, we're editing mid-game
  const isEditing = state.players.length > 0;

  const [title, setTitle] = useState(state.quiz.title || "");
  const [questions, setQuestions] = useState<Question[]>(
    state.quiz.questions.length > 0 ? state.quiz.questions : []
  );

  const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({
    text: "",
    type: "multiple-choice",
    options: ["", "", "", ""],
    correctAnswer: "",
  });

  function addQuestion() {
    if (!editingQuestion.text?.trim()) return;
    const isMultipleChoice = editingQuestion.type === "multiple-choice";
    if (isMultipleChoice && !editingQuestion.correctAnswer?.trim()) return;

    const newQ: Question = {
      id: crypto.randomUUID(),
      text: editingQuestion.text!.trim(),
      type: editingQuestion.type || "multiple-choice",
      ...(isMultipleChoice
        ? {
            correctAnswer: editingQuestion.correctAnswer!.trim(),
            options: editingQuestion.options?.filter((o) => o.trim()),
          }
        : {}),
    };

    setQuestions((prev) => [...prev, newQ]);
    setEditingQuestion({
      text: "",
      type: "multiple-choice",
      options: ["", "", "", ""],
      correctAnswer: "",
    });
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function saveAndContinue() {
    if (questions.length === 0) return;
    const quiz: Quiz = { title: title.trim() || "Quiz sem titulo", questions };
    dispatch({ type: "SET_QUIZ", quiz });

    if (isEditing) {
      // Return to the game
      dispatch({ type: "SET_PHASE", phase: "playing" });
    } else {
      dispatch({ type: "SET_PHASE", phase: "player-setup" });
    }
  }

  function handleBack() {
    if (isEditing) {
      dispatch({ type: "SET_PHASE", phase: "playing" });
    } else {
      dispatch({ type: "SET_PHASE", phase: "menu" });
    }
  }

  return (
    <div className="retro-card p-8 max-w-2xl w-full animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold text-amber-900" style={{ fontFamily: "Georgia, serif" }}>
          {isEditing ? "Editar Quiz" : "Criar Quiz"}
        </h2>
        <button
          className="text-amber-600 hover:text-amber-800 text-sm underline"
          onClick={handleBack}
        >
          Voltar
        </button>
      </div>

      {isEditing && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-6">
          <p className="text-blue-700 text-sm">
            Podes adicionar ou remover perguntas. O jogo continua de onde parou.
          </p>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-amber-800 font-bold mb-1">Titulo do Quiz</label>
        <input
          className="retro-input w-full"
          placeholder="Ex: Conhecimentos Gerais"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Existing questions */}
      {questions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-amber-800 font-bold mb-2">
            Perguntas ({questions.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center justify-between bg-amber-50 border-2 border-amber-200 rounded-lg p-3 animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-amber-700 mr-2">{i + 1}.</span>
                  <span className="text-amber-900 truncate">{q.text}</span>
                  <span className="ml-2 text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                    {q.type === "open-ended" ? "Aberta" : "Escolha multipla"}
                  </span>
                </div>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="ml-2 text-red-400 hover:text-red-600 text-lg font-bold"
                  aria-label={`Remover pergunta ${i + 1}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New question form */}
      <div className="bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl p-5 mb-6">
        <h3 className="text-amber-800 font-bold mb-3">Nova Pergunta</h3>

        <div className="mb-3">
          <input
            className="retro-input w-full"
            placeholder="Escreve a pergunta..."
            value={editingQuestion.text || ""}
            onChange={(e) =>
              setEditingQuestion((prev) => ({ ...prev, text: e.target.value }))
            }
          />
        </div>

        <div className="mb-3 flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="qtype"
              checked={editingQuestion.type === "multiple-choice"}
              onChange={() =>
                setEditingQuestion((prev) => ({
                  ...prev,
                  type: "multiple-choice",
                  options: prev.options?.length ? prev.options : ["", "", "", ""],
                }))
              }
              className="accent-amber-600"
            />
            <span className="text-amber-800 font-medium">Escolha multipla</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="qtype"
              checked={editingQuestion.type === "open-ended"}
              onChange={() =>
                setEditingQuestion((prev) => ({
                  ...prev,
                  type: "open-ended",
                  options: [],
                }))
              }
              className="accent-amber-600"
            />
            <span className="text-amber-800 font-medium">Resposta aberta</span>
          </label>
        </div>

        {editingQuestion.type === "multiple-choice" && (
          <div className="mb-3 space-y-2">
            <label className="block text-amber-700 text-sm font-medium">Opcoes</label>
            {(editingQuestion.options || []).map((opt, i) => (
              <input
                key={i}
                className="retro-input w-full text-sm"
                placeholder={`Opcao ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(editingQuestion.options || [])];
                  newOpts[i] = e.target.value;
                  setEditingQuestion((prev) => ({ ...prev, options: newOpts }));
                }}
              />
            ))}
            <button
              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
              onClick={() =>
                setEditingQuestion((prev) => ({
                  ...prev,
                  options: [...(prev.options || []), ""],
                }))
              }
            >
              + Adicionar opcao
            </button>
          </div>
        )}

        {editingQuestion.type === "multiple-choice" && (
          <div className="mb-3">
            <label className="block text-amber-700 text-sm font-medium mb-1">
              Resposta correta
            </label>
            {editingQuestion.options?.some((o) => o.trim()) ? (
              <select
                className="retro-input w-full"
                value={editingQuestion.correctAnswer || ""}
                onChange={(e) =>
                  setEditingQuestion((prev) => ({
                    ...prev,
                    correctAnswer: e.target.value,
                  }))
                }
              >
                <option value="">Seleciona a resposta correta...</option>
                {editingQuestion.options
                  ?.filter((o) => o.trim())
                  .map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                className="retro-input w-full"
                placeholder="Escreve a resposta correta..."
                value={editingQuestion.correctAnswer || ""}
                onChange={(e) =>
                  setEditingQuestion((prev) => ({
                    ...prev,
                    correctAnswer: e.target.value,
                  }))
                }
              />
            )}
          </div>
        )}

        {editingQuestion.type === "open-ended" && (
          <div className="mb-3 bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
            <p className="text-blue-700 text-sm">
              As perguntas abertas sao avaliadas pelo apresentador. Arrasta os jogadores que acertarem no tabuleiro.
            </p>
          </div>
        )}

        <button
          className="retro-button retro-button-secondary text-sm py-2 px-6"
          onClick={addQuestion}
          disabled={
            !editingQuestion.text?.trim() ||
            (editingQuestion.type === "multiple-choice" && !editingQuestion.correctAnswer?.trim())
          }
        >
          Adicionar Pergunta
        </button>
      </div>

      <button
        className="retro-button retro-button-green w-full text-xl"
        onClick={saveAndContinue}
        disabled={questions.length === 0}
      >
        {isEditing
          ? `Guardar e Voltar ao Jogo (${questions.length} pergunta${questions.length !== 1 ? "s" : ""})`
          : `Continuar (${questions.length} pergunta${questions.length !== 1 ? "s" : ""})`}
      </button>
    </div>
  );
}
