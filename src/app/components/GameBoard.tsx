"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useGame } from "../context/GameContext";
import type { Player } from "../types";

const TOTAL_CELLS = 31; // 0 (start) to 30 (finish)
const COLS = 7;

// Generate a snaking board path (left-to-right, then right-to-left, etc.)
function generateBoardLayout(): { row: number; col: number }[] {
  const positions: { row: number; col: number }[] = [];
  const totalRows = Math.ceil(TOTAL_CELLS / COLS);
  let idx = 0;
  for (let row = totalRows - 1; row >= 0; row--) {
    const isEvenFromBottom = (totalRows - 1 - row) % 2 === 0;
    for (let c = 0; c < COLS && idx < TOTAL_CELLS; c++) {
      const col = isEvenFromBottom ? c : COLS - 1 - c;
      positions.push({ row, col });
      idx++;
    }
  }
  return positions;
}

const BOARD_LAYOUT = generateBoardLayout();

const CELL_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#e67e22",
  "#9b59b6", "#1abc9c", "#e84393", "#e74c3c", "#3498db",
  "#2ecc71", "#f1c40f", "#e67e22", "#9b59b6", "#1abc9c",
  "#e84393", "#e74c3c", "#3498db", "#2ecc71", "#f1c40f",
  "#e67e22", "#9b59b6", "#1abc9c", "#e84393", "#e74c3c",
  "#3498db", "#2ecc71", "#f1c40f", "#e67e22", "#9b59b6",
  "#f1c40f",
];

const CELL_DECORATIONS = [
  "🏁", "🌟", "🎈", "🎪", "🌻", "🎵", "🍭", "🎨", "🌈", "🎠",
  "🦋", "🎯", "🍀", "🎸", "🌸", "🎤", "🍬", "🎭", "🌺", "🎹",
  "🦄", "🎳", "🍩", "🎺", "🌼", "🎶", "🍫", "🎪", "🌻", "🎵",
  "🏆",
];

export function GameBoard() {
  const { state, dispatch } = useGame();
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const boardRef = useRef<HTMLDivElement>(null);

  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentQuestion = state.quiz.questions[state.currentQuestionIndex];
  const totalRows = Math.ceil(TOTAL_CELLS / COLS);

  const winner = state.players.find((p) => p.position >= state.totalPositions);

  useEffect(() => {
    if (winner) {
      dispatch({ type: "SET_PHASE", phase: "finished" });
    }
  }, [winner, dispatch]);

  function handleAskQuestion() {
    setShowQuestion(true);
    setSelectedAnswer("");
    setShowResult(false);
    dispatch({ type: "RESET_ANSWER" });
  }

  function handleSubmitAnswer() {
    const isCorrect =
      selectedAnswer.trim().toLowerCase() ===
      (currentQuestion.correctAnswer || "").trim().toLowerCase();

    if (isCorrect) {
      dispatch({ type: "ANSWER_CORRECT" });
      dispatch({
        type: "ADVANCE_PLAYER",
        playerId: currentPlayer.id,
        steps: 1 + Math.floor(Math.random() * 3), // 1-3 steps
      });
      setHoppingPlayerId(currentPlayer.id);
      setTimeout(() => setHoppingPlayerId(null), 500);
    } else {
      dispatch({ type: "ANSWER_WRONG" });
    }
    setShowResult(true);
  }

  function handleNextTurn() {
    dispatch({ type: "NEXT_TURN" });
    setShowQuestion(false);
    setSelectedAnswer("");
    setShowResult(false);
  }

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, player: Player) => {
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setDragPlayerId(player.id);
      setDragPos({ x: clientX, y: clientY });
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(true);
    },
    []
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragPos({ x: clientX, y: clientY });
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !dragPlayerId) {
      setIsDragging(false);
      setDragPlayerId(null);
      return;
    }

    // Find closest cell
    let closestPos = 0;
    let closestDist = Infinity;

    cellRefs.current.forEach((el, pos) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(dragPos.x - cx, dragPos.y - cy);
      if (dist < closestDist) {
        closestDist = dist;
        closestPos = pos;
      }
    });

    // Snap to closest if within reasonable distance
    if (closestDist < 80) {
      dispatch({
        type: "MOVE_PLAYER",
        playerId: dragPlayerId,
        position: closestPos,
      });
      setHoppingPlayerId(dragPlayerId);
      setTimeout(() => setHoppingPlayerId(null), 500);
    }

    setIsDragging(false);
    setDragPlayerId(null);
  }, [isDragging, dragPlayerId, dragPos, dispatch]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("touchend", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  function getPlayersAtPosition(pos: number): Player[] {
    return state.players.filter((p) => p.position === pos);
  }

  function setCellRef(pos: number, el: HTMLDivElement | null) {
    if (el) {
      cellRefs.current.set(pos, el);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 p-4">
      {/* Board */}
      <div className="flex-1">
        <div className="retro-card p-6">
          <h2
            className="text-3xl font-extrabold text-amber-900 text-center mb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Quem conhece a Graça?
          </h2>

          <div
            ref={boardRef}
            className="grid gap-2 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${totalRows}, 1fr)`,
              maxWidth: "600px",
            }}
          >
            {BOARD_LAYOUT.map((cell, pos) => {
              const playersHere = getPlayersAtPosition(pos);
              const isStart = pos === 0;
              const isFinish = pos === TOTAL_CELLS - 1;
              const isCurrentPlayerHere = playersHere.some(
                (p) => p.id === currentPlayer?.id
              );

              return (
                <div
                  key={pos}
                  ref={(el) => setCellRef(pos, el)}
                  className={`board-cell relative flex flex-col items-center justify-center rounded-xl aspect-square border-2 ${
                    isCurrentPlayerHere ? "animate-pulse-glow" : ""
                  }`}
                  style={{
                    gridRow: cell.row + 1,
                    gridColumn: cell.col + 1,
                    backgroundColor: CELL_COLORS[pos] + "22",
                    borderColor: CELL_COLORS[pos] + "66",
                  }}
                >
                  {/* Cell number */}
                  <span
                    className="text-xs font-bold absolute top-0.5 left-1"
                    style={{ color: CELL_COLORS[pos] }}
                  >
                    {pos}
                  </span>

                  {/* Decoration */}
                  <span className="text-lg leading-none">
                    {CELL_DECORATIONS[pos]}
                  </span>

                  {/* Special labels */}
                  {isStart && (
                    <span className="text-[8px] font-bold text-green-700 uppercase">
                      Início
                    </span>
                  )}
                  {isFinish && (
                    <span className="text-[8px] font-bold text-amber-700 uppercase">
                      Fim
                    </span>
                  )}

                  {/* Players on this cell */}
                  {playersHere.length > 0 && (
                    <div className="absolute -bottom-1 flex gap-0.5 justify-center">
                      {playersHere.map((player) => (
                        <div
                          key={player.id}
                          className={`player-piece text-lg ${
                            dragPlayerId === player.id ? "dragging" : ""
                          } ${hoppingPlayerId === player.id ? "animate-hop" : ""}`}
                          style={{
                            filter:
                              dragPlayerId === player.id
                                ? "drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
                                : "none",
                          }}
                          onMouseDown={(e) => handleDragStart(e, player)}
                          onTouchStart={(e) => handleDragStart(e, player)}
                          title={player.name}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-sm border-2"
                            style={{
                              backgroundColor: player.color,
                              borderColor: "white",
                            }}
                          >
                            <span
                              className="animate-wave"
                              style={{
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${1.5 + Math.random()}s`,
                              }}
                            >
                              {player.emoji}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar: current turn + question */}
      <div className="lg:w-96 flex flex-col gap-4">
        {/* Player scoreboard */}
        <div className="retro-card p-4">
          <h3 className="text-lg font-bold text-amber-900 mb-3">Jogadores</h3>
          <div className="space-y-2">
            {state.players.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  i === state.currentPlayerIndex
                    ? "bg-amber-100 border-2 border-amber-400"
                    : "bg-amber-50 border-2 border-transparent"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2"
                  style={{
                    backgroundColor: player.color,
                    borderColor: "white",
                  }}
                >
                  <span
                    className="animate-wave"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  >
                    {player.emoji}
                  </span>
                </div>
                <span className="flex-1 font-bold text-amber-900 text-sm">
                  {player.name}
                </span>
                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  Casa {player.position}
                </span>
                {i === state.currentPlayerIndex && (
                  <span className="text-xs text-amber-600 font-bold">
                    ← Vez
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Question area */}
        <div className="retro-card p-5">
          {!showQuestion ? (
            <div className="text-center">
              <div className="text-4xl mb-3">🎲</div>
              <p className="text-amber-800 font-bold text-lg mb-1">
                Vez de {currentPlayer?.name}
              </p>
              <p className="text-amber-600 text-sm mb-4">
                Responde corretamente para avançar!
              </p>
              <button className="retro-button w-full" onClick={handleAskQuestion}>
                Ver Pergunta
              </button>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">❓</span>
                <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                  Pergunta {state.currentQuestionIndex + 1}/{state.quiz.questions.length}
                </span>
              </div>

              <p className="text-amber-900 font-bold text-lg mb-4">
                {currentQuestion?.text}
              </p>

              {!showResult ? (
                <>
                  {currentQuestion?.type === "open-ended" ? (
                    /* Open-ended: host reads question aloud, drags players manually */
                    <div className="mb-4">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center mb-4">
                        <div className="text-3xl mb-2">🗣️</div>
                        <p className="text-blue-800 font-bold text-sm">
                          Pergunta aberta!
                        </p>
                        <p className="text-blue-600 text-sm mt-1">
                          Lê a pergunta em voz alta. Arrasta no tabuleiro os jogadores que acertarem.
                        </p>
                      </div>
                      <button
                        className="retro-button retro-button-secondary w-full"
                        onClick={handleNextTurn}
                      >
                        Próxima Pergunta
                      </button>
                    </div>
                  ) : currentQuestion?.type === "multiple-choice" &&
                  currentQuestion.options ? (
                    <div className="space-y-2 mb-4">
                      {currentQuestion.options.map((opt, i) => (
                        <button
                          key={i}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedAnswer === opt
                              ? "bg-amber-200 border-amber-500 font-bold"
                              : "bg-amber-50 border-amber-200 hover:border-amber-400"
                          }`}
                          onClick={() => setSelectedAnswer(opt)}
                        >
                          <span className="text-amber-700 font-bold mr-2">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span className="text-amber-900">{opt}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {currentQuestion?.type === "multiple-choice" && (
                    <button
                      className="retro-button retro-button-green w-full"
                      onClick={handleSubmitAnswer}
                      disabled={!selectedAnswer.trim()}
                    >
                      Responder
                    </button>
                  )}
                </>
              ) : (
                <div className="animate-bounce-in">
                  {state.answeredCorrectly ? (
                    <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center mb-4">
                      <div className="text-4xl mb-2">🎉</div>
                      <p className="text-green-800 font-bold text-lg">
                        Correto!
                      </p>
                      <p className="text-green-600 text-sm">
                        {currentPlayer?.name} avança no tabuleiro!
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center mb-4">
                      <div className="text-4xl mb-2">😅</div>
                      <p className="text-red-800 font-bold text-lg">
                        Errado!
                      </p>
                      <p className="text-red-600 text-sm">
                        A resposta era:{" "}
                        <span className="font-bold">
                          {currentQuestion?.correctAnswer}
                        </span>
                      </p>
                    </div>
                  )}

                  <button
                    className="retro-button retro-button-secondary w-full"
                    onClick={handleNextTurn}
                  >
                    Próximo Jogador
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drag hint */}
        <div className="retro-card p-3 text-center">
          <p className="text-amber-600 text-xs">
            Arrasta os jogadores no tabuleiro para os mover manualmente
          </p>
        </div>
      </div>

      {/* Dragging ghost */}
      {isDragging && dragPlayerId && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x - 18,
            top: dragPos.y - 18,
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 shadow-lg"
            style={{
              backgroundColor:
                state.players.find((p) => p.id === dragPlayerId)?.color || "#ccc",
              borderColor: "white",
              transform: "scale(1.3)",
            }}
          >
            {state.players.find((p) => p.id === dragPlayerId)?.emoji}
          </div>
        </div>
      )}
    </div>
  );
}
