"use client";

import { useState } from "react";
import { useGame } from "../context/GameContext";
import type { Question, Quiz } from "../types";

const emptyQuestion = (): Partial<Question> => ({
  text: "",
  type: "multiple-choice",
  options: ["", "", "", ""],
  correctAnswer: "",
});

export function QuizCreator() {
  const { state, dispatch } = useGame();
  const isEditing = state.players.length > 0;

  const [questions, setQuestions] = useState<Question[]>(
    state.quiz.questions.length > 0 ? [...state.quiz.questions] : []
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>(emptyQuestion());

  const isEditingQuestion = editingId !== null;

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditingQuestion({
      text: q.text,
      type: q.type,
      options: q.type === "multiple-choice" ? (q.options?.length ? [...q.options, ""] : ["", "", "", ""]) : [],
      correctAnswer: q.correctAnswer || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingQuestion(emptyQuestion());
  }

  function updateQuestion() {
    if (!editingQuestion.text?.trim()) return;
    const isMultipleChoice = editingQuestion.type === "multiple-choice";
    if (isMultipleChoice && !editingQuestion.correctAnswer?.trim()) return;

    const updatedQ: Question = {
      id: editingId!,
      text: editingQuestion.text.trim(),
      type: editingQuestion.type || "multiple-choice",
      ...(isMultipleChoice
        ? {
            correctAnswer: editingQuestion.correctAnswer!.trim(),
            options: editingQuestion.options?.filter((o) => o.trim()),
          }
        : {}),
    };

    setQuestions((prev) => prev.map((q) => (q.id === editingId ? updatedQ : q)));
    cancelEdit();
  }

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
    setEditingQuestion(emptyQuestion());
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function saveAndContinue() {
    if (questions.length === 0) return;
    const quiz: Quiz = { questions };
    dispatch({ type: "SET_QUIZ", quiz });

    if (isEditing) {
      dispatch({ type: "SET_PHASE", phase: "playing" });
    } else {
      dispatch({ type: "SET_PHASE", phase: "player-setup" });
    }
  }

  function handleBack() {
    dispatch({ type: "SET_PHASE", phase: isEditing ? "playing" : "menu" });
  }

  return (
    <div className="retro-card p-8 max-w-2xl w-fullanimate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-extrabold text-gloria-brown" style={{ fontFamily: "Georgia, serif" }}>
          {isEditing ? "Editar Quiz" : "Criar Quiz"}
        </h2>
        <button className="text-gloria-brown-light hover:text-gloria-brown text-sm underline" onClick={handleBack}>
          Voltar
        </button>
      </div>

      {isEditing && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-6">
          <p className="text-blue-700 text-sm">
            Clica numa pergunta para editar. O jogo continua de onde parou.
          </p>
        </div>
      )}

      {/* Existing questions */}
      {questions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-gloria-brown font-bold mb-2">Perguntas ({questions.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {questions.map((q, i) => {
              const isBeingEdited = editingId === q.id;
              return (
                <div
                  key={q.id}
                  className={`bg-gloria-cream border-2 rounded-lg p-3 animate-slide-up ${
                    isBeingEdited ? "border-blue-400 ring-2 ring-blue-200" : "border-gloria-tan"
                  }`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {isBeingEdited ? (
                    <div className="space-y-3">
                      <input
                        className="retro-input w-full"
                        placeholder="Escreve a pergunta..."
                        value={editingQuestion.text || ""}
                        onChange={(e) => setEditingQuestion((prev) => ({ ...prev, text: e.target.value }))}
                      />

                      <div className="flex gap-3 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`edit-type-${q.id}`}
                            checked={editingQuestion.type === "multiple-choice"}
                            onChange={() =>
                              setEditingQuestion((prev) => ({
                                ...prev,
                                type: "multiple-choice",
                                options: prev.options?.filter((o) => o.trim()).length
                                  ? prev.options.filter((o) => o.trim())
                                  : ["", "", "", ""],
                              }))
                            }
                            className="accent-gloria-brown-light"
                          />
                          <span className="text-gloria-brown font-medium text-sm">Multipla</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`edit-type-${q.id}`}
                            checked={editingQuestion.type === "open-ended"}
                            onChange={() =>
                              setEditingQuestion((prev) => ({
                                ...prev,
                                type: "open-ended",
                                options: [],
                                correctAnswer: undefined,
                              }))
                            }
                            className="accent-gloria-brown-light"
                          />
                          <span className="text-gloria-brown font-medium text-sm">Aberta</span>
                        </label>
                      </div>

                      {editingQuestion.type === "multiple-choice" && (
                        <>
                          <div className="space-y-1">
                            {(editingQuestion.options || []).map((opt, j) => (
                              <input
                                key={j}
                                className="retro-input w-full text-sm"
                                placeholder={`Opcao ${j + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(editingQuestion.options || [])];
                                  newOpts[j] = e.target.value;
                                  setEditingQuestion((prev) => ({ ...prev, options: newOpts }));
                                }}
                              />
                            ))}
                            <button
                              className="text-gloria-brown-light hover:text-gloria-brown text-xs font-medium"
                              onClick={() =>
                                setEditingQuestion((prev) => ({
                                  ...prev,
                                  options: [...(prev.options || []), ""],
                                }))
                              }
                            >
                              + opcao
                            </button>
                          </div>
                          <div>
                            <label className="block text-gloria-brown-light text-xs font-medium mb-1">
                              Resposta correta
                            </label>
                            {editingQuestion.options?.some((o) => o.trim()) ? (
                              <select
                                className="retro-input w-full text-sm"
                                value={editingQuestion.correctAnswer || ""}
                                onChange={(e) =>
                                  setEditingQuestion((prev) => ({
                                    ...prev,
                                    correctAnswer: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Seleciona...</option>
                                {editingQuestion.options
                                  ?.filter((o) => o.trim())
                                  .map((opt, j) => (
                                    <option key={j} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <input
                                className="retro-input w-full text-sm"
                                placeholder="Resposta correta..."
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
                        </>
                      )}

                      {editingQuestion.type === "open-ended" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700">
                          Avaliada pelo apresentador.
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          className="retro-button retro-button-green text-sm py-1 flex-1"
                          onClick={updateQuestion}
                          disabled={
                            !editingQuestion.text?.trim() ||
                            (editingQuestion.type === "multiple-choice" && !editingQuestion.correctAnswer?.trim())
                          }
                        >
                          Guardar
                        </button>
                        <button
                          className="retro-button retro-button-secondary text-sm py-1 px-4"
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        className="flex-1 min-w-0 text-left"
                        onClick={() => startEdit(q)}
                      >
                        <span className="font-bold text-gloria-brown-light mr-2">{i + 1}.</span>
                        <span className="text-gloria-brown truncate">{q.text}</span>
                        <span className="ml-2 text-xs bg-gloria-tan text-gloria-brown-light px-2 py-0.5 rounded-full">
                          {q.type === "open-ended" ? "Aberta" : "Multipla"}
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(q.id);
                        }}
                        className="ml-2 text-red-400 hover:text-red-600 text-lg font-bold"
                        aria-label={`Remover pergunta ${i + 1}`}
                      >
                        x
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New question form */}
      {!isEditingQuestion && (
        <div className="bg-gloria-cream border-2 border-dashed border-gloria-brown-light rounded-xl p-5 mb-6">
          <h3 className="text-gloria-brown font-bold mb-3">Nova Pergunta</h3>

          <div className="mb-3">
            <input
              className="retro-input w-full"
              placeholder="Escreve a pergunta..."
              value={editingQuestion.text || ""}
              onChange={(e) => setEditingQuestion((prev) => ({ ...prev, text: e.target.value }))}
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
                className="accent-gloria-brown-light"
              />
              <span className="text-gloria-brown font-medium">Escolha multipla</span>
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
                className="accent-gloria-brown-light"
              />
              <span className="text-gloria-brown font-medium">Resposta aberta</span>
            </label>
          </div>

          {editingQuestion.type === "multiple-choice" && (
            <div className="mb-3 space-y-2">
              <label className="block text-gloria-brown-light text-sm font-medium">Opcoes</label>
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
                className="text-gloria-brown-light hover:text-gloria-brown text-sm font-medium"
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
              <label className="block text-gloria-brown-light text-sm font-medium mb-1">
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
      )}

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