"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useGame } from "../context/GameContext";
import type { Player } from "../types";

const TOTAL_CELLS = 31;
const COLS = 7;

// Special cell definitions with SVG icon types and colors
const CELL_THEMES: Record<number, { bg: string; icon: string; label: string }> = {
  0:  { bg: "#e74c3c", icon: "flag",      label: "Início" },
  5:  { bg: "#e84393", icon: "tent",      label: "Feira" },
  7:  { bg: "#3498db", icon: "music",     label: "Fado" },
  10: { bg: "#e84393", icon: "star",      label: "Estrela" },
  13: { bg: "#3498db", icon: "palette",   label: "Azulejo" },
  15: { bg: "#e74c3c", icon: "masks",     label: "Teatro" },
  18: { bg: "#3498db", icon: "guitar",    label: "Guitarra" },
  20: { bg: "#e84393", icon: "butterfly", label: "Jardim" },
  23: { bg: "#3498db", icon: "target",    label: "Pontaria" },
  25: { bg: "#e74c3c", icon: "clover",    label: "Sorte" },
  28: { bg: "#e84393", icon: "rainbow",   label: "Arco-íris" },
  30: { bg: "#f1c40f", icon: "trophy",    label: "Glória!" },
};

const DEFAULT_CELL_BG = "#dbb778";

/** Map cell index to CSS grid position (snaking path, bottom to top) */
function getCellGridPosition(index: number): { row: number; col: number } {
  const rowIndex = Math.floor(index / COLS);
  const posInRow = index % COLS;
  const isReversed = rowIndex % 2 === 1;
  return {
    row: 5 - rowIndex, // grid rows: 5 (bottom) to 1 (top)
    col: isReversed ? COLS - posInRow : posInRow + 1,
  };
}

/** Simple SVG illustrations for special cells */
function CellIcon({ type }: { type: string }) {
  const s = { stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const vb = "0 0 32 32";

  switch (type) {
    case "flag":
      return (
        <svg viewBox={vb} className="cell-icon">
          <line x1="8" y1="6" x2="8" y2="28" {...s} strokeWidth={2.5} />
          <polygon points="10,6 26,11 10,16" fill="#fff" opacity={0.9} />
        </svg>
      );
    case "tent":
      return (
        <svg viewBox={vb} className="cell-icon">
          <polygon points="16,4 28,26 4,26" fill="none" {...s} strokeWidth={2} />
          <line x1="16" y1="4" x2="16" y2="26" {...s} strokeWidth={1.5} />
          <path d="M10,26 Q16,20 22,26" fill="none" {...s} strokeWidth={1.5} />
        </svg>
      );
    case "music":
      return (
        <svg viewBox={vb} className="cell-icon">
          <ellipse cx="9" cy="23" rx="5" ry="3.5" fill="#fff" />
          <ellipse cx="23" cy="20" rx="5" ry="3.5" fill="#fff" />
          <line x1="14" y1="23" x2="14" y2="7" {...s} strokeWidth={2} />
          <line x1="28" y1="20" x2="28" y2="5" {...s} strokeWidth={2} />
          <line x1="14" y1="7" x2="28" y2="5" {...s} strokeWidth={2.5} />
        </svg>
      );
    case "star":
      return (
        <svg viewBox={vb} className="cell-icon">
          <polygon
            points="16,3 19.5,12 29,12 21.5,18 24,27 16,22 8,27 10.5,18 3,12 12.5,12"
            fill="#fff" opacity={0.9}
          />
        </svg>
      );
    case "palette":
      return (
        <svg viewBox={vb} className="cell-icon">
          <ellipse cx="16" cy="17" rx="13" ry="11" fill="#fff" opacity={0.85} />
          <circle cx="10" cy="13" r="2.5" fill="#e74c3c" />
          <circle cx="16" cy="10" r="2.5" fill="#3498db" />
          <circle cx="22" cy="13" r="2.5" fill="#f1c40f" />
          <circle cx="11" cy="20" r="2.5" fill="#27ae60" />
        </svg>
      );
    case "masks":
      return (
        <svg viewBox={vb} className="cell-icon">
          <circle cx="11" cy="15" r="8" fill="#fff" opacity={0.85} />
          <circle cx="21" cy="15" r="8" fill="#fff" opacity={0.65} />
          <path d="M7,14 Q11,19 15,14" stroke="#5a3e1b" strokeWidth={1.5} fill="none" />
          <path d="M17,15 Q21,11 25,15" stroke="#5a3e1b" strokeWidth={1.5} fill="none" />
          <circle cx="8" cy="12" r="1" fill="#5a3e1b" /><circle cx="14" cy="12" r="1" fill="#5a3e1b" />
          <circle cx="18" cy="12" r="1" fill="#5a3e1b" /><circle cx="24" cy="12" r="1" fill="#5a3e1b" />
        </svg>
      );
    case "guitar":
      return (
        <svg viewBox={vb} className="cell-icon">
          <ellipse cx="14" cy="22" rx="8" ry="6" fill="#fff" opacity={0.85} />
          <ellipse cx="14" cy="22" rx="3" ry="2" fill="#5a3e1b" opacity={0.4} />
          <line x1="20" y1="18" x2="28" y2="4" {...s} strokeWidth={2.5} />
          <line x1="26" y1="3" x2="30" y2="7" {...s} strokeWidth={2} />
        </svg>
      );
    case "butterfly":
      return (
        <svg viewBox={vb} className="cell-icon">
          <ellipse cx="10" cy="12" rx="7" ry="8" fill="#fff" opacity={0.7} transform="rotate(-15 10 12)" />
          <ellipse cx="22" cy="12" rx="7" ry="8" fill="#fff" opacity={0.7} transform="rotate(15 22 12)" />
          <ellipse cx="12" cy="22" rx="5" ry="6" fill="#fff" opacity={0.5} transform="rotate(-10 12 22)" />
          <ellipse cx="20" cy="22" rx="5" ry="6" fill="#fff" opacity={0.5} transform="rotate(10 20 22)" />
          <line x1="16" y1="6" x2="16" y2="28" stroke="#fff" strokeWidth={2} />
        </svg>
      );
    case "target":
      return (
        <svg viewBox={vb} className="cell-icon">
          <circle cx="16" cy="16" r="12" fill="none" stroke="#fff" strokeWidth={2} />
          <circle cx="16" cy="16" r="8" fill="none" stroke="#fff" strokeWidth={2} />
          <circle cx="16" cy="16" r="4" fill="#fff" />
        </svg>
      );
    case "clover":
      return (
        <svg viewBox={vb} className="cell-icon">
          <circle cx="16" cy="10" r="5" fill="#fff" opacity={0.85} />
          <circle cx="10" cy="16" r="5" fill="#fff" opacity={0.85} />
          <circle cx="22" cy="16" r="5" fill="#fff" opacity={0.85} />
          <circle cx="16" cy="22" r="5" fill="#fff" opacity={0.85} />
          <line x1="16" y1="22" x2="16" y2="30" stroke="#fff" strokeWidth={2} />
        </svg>
      );
    case "rainbow":
      return (
        <svg viewBox={vb} className="cell-icon">
          <path d="M4,24 A12,12 0 0,1 28,24" fill="none" stroke="#fff" strokeWidth={3} opacity={0.9} />
          <path d="M7,24 A9,9 0 0,1 25,24" fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.6} />
          <path d="M10,24 A6,6 0 0,1 22,24" fill="none" stroke="#fff" strokeWidth={2} opacity={0.4} />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox={vb} className="cell-icon">
          <path d="M10,6 L10,16 Q16,22 22,16 L22,6 Z" fill="#fff" opacity={0.9} />
          <path d="M10,8 Q4,8 4,14 Q4,18 10,16" fill="none" stroke="#fff" strokeWidth={2} />
          <path d="M22,8 Q28,8 28,14 Q28,18 22,16" fill="none" stroke="#fff" strokeWidth={2} />
          <rect x="13" y="22" width="6" height="3" fill="#fff" opacity={0.8} />
          <rect x="10" y="25" width="12" height="3" rx="1" fill="#fff" opacity={0.8} />
        </svg>
      );
    default:
      return null;
  }
}

export function GameBoard() {
  const { state, dispatch } = useGame();
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [dragPlayerId, setDragPlayerId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoppingPlayerId, setHoppingPlayerId] = useState<string | null>(null);
  const [prevRanking, setPrevRanking] = useState<string[]>([]);
  const [movedUpIds, setMovedUpIds] = useState<Set<string>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);

  const currentQuestion = state.quiz.questions[state.currentQuestionIndex];

  const rankedPlayers = useMemo(
    () => [...state.players].sort((a, b) => b.position - a.position),
    [state.players]
  );

  useEffect(() => {
    const currentRanking = rankedPlayers.map((p) => p.id);
    if (prevRanking.length > 0) {
      const newMovedUp = new Set<string>();
      currentRanking.forEach((id, newIdx) => {
        const oldIdx = prevRanking.indexOf(id);
        if (oldIdx > newIdx && oldIdx !== -1) newMovedUp.add(id);
      });
      if (newMovedUp.size > 0) {
        setMovedUpIds(newMovedUp);
        const timer = setTimeout(() => setMovedUpIds(new Set()), 1000);
        return () => clearTimeout(timer);
      }
    }
    setPrevRanking(currentRanking);
  }, [rankedPlayers]);

  const winner = state.players.find((p) => p.position >= state.totalPositions);
  useEffect(() => {
    if (winner) dispatch({ type: "SET_PHASE", phase: "finished" });
  }, [winner, dispatch]);

  function handleAskQuestion() {
    setShowQuestion(true);
    setSelectedAnswer("");
    setShowResult(false);
    dispatch({ type: "RESET_ANSWER" });
  }

  function handleSubmitAnswer() {
    setShowResult(true);
  }

  function handleNextQuestion() {
    dispatch({ type: "NEXT_QUESTION" });
    setShowQuestion(false);
    setSelectedAnswer("");
    setShowResult(false);
  }

  function getPlayersAtPosition(pos: number): Player[] {
    return state.players.filter((p) => p.position === pos);
  }

  // --- DOM-based drag and drop ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, player: Player) => {
      e.preventDefault();
      e.stopPropagation();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setDragPlayerId(player.id);
      setDragPos({ x: clientX, y: clientY });
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
    // Find cell under cursor
    const el = document.elementFromPoint(dragPos.x, dragPos.y);
    const cellEl = el?.closest("[data-cell-index]") as HTMLElement | null;
    if (cellEl) {
      const position = parseInt(cellEl.dataset.cellIndex!);
      dispatch({ type: "MOVE_PLAYER", playerId: dragPlayerId, position });
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

  // --- Direction arrows at row transitions ---
  function getArrow(index: number): string | null {
    const rowIndex = Math.floor(index / COLS);
    const posInRow = index % COLS;
    if (posInRow === COLS - 1 && rowIndex < 4) return "↑"; // end of L→R row
    if (posInRow === 0 && rowIndex % 2 === 1) return "↑"; // start of R→L row (came from below)
    return null;
  }

  return (
    <div className="w-full h-screen flex flex-col lg:flex-row gap-2 p-1 overflow-hidden">
      {/* Board */}
      <div className="flex-1 flex items-center justify-center min-h-0 min-w-0">
        <div className="board-frame checkered-border rounded-2xl" style={{ padding: 8, maxHeight: '100%', maxWidth: '100%' }}>
          <div
            ref={boardRef}
            className="board-inner rounded-xl p-3"
            style={{ background: "linear-gradient(145deg, #4a7c59 0%, #3d6b4a 50%, #2d5a3a 100%)" }}
          >
            {/* Title */}
            <h2
              className="text-xl lg:text-2xl font-extrabold text-center mb-2 drop-shadow-lg"
              style={{ fontFamily: "Georgia, serif", color: "#fdf2e0", textShadow: "2px 2px 4px rgba(0,0,0,0.4)" }}
            >
              Quem conhece a Graça?
            </h2>

            {/* Grid board */}
            <div className="board-grid">
              {Array.from({ length: TOTAL_CELLS }, (_, i) => {
                const { row, col } = getCellGridPosition(i);
                const theme = CELL_THEMES[i];
                const playersHere = getPlayersAtPosition(i);
                const isFinish = i === TOTAL_CELLS - 1;
                const arrow = getArrow(i);
                const tokenSize = playersHere.length > 8 ? 14 : playersHere.length > 4 ? 18 : 22;

                return (
                  <div
                    key={i}
                    data-cell-index={i}
                    className={`board-cell ${theme ? "board-cell--special" : ""} ${isFinish ? "board-cell--finish" : ""}`}
                    style={{
                      gridRow: row,
                      gridColumn: col,
                      backgroundColor: theme?.bg || DEFAULT_CELL_BG,
                    }}
                  >
                    {/* Cell number */}
                    <span className="board-cell__number">{i}</span>

                    {/* Icon */}
                    {theme && <CellIcon type={theme.icon} />}

                    {/* Label */}
                    {theme && <span className="board-cell__label">{theme.label}</span>}

                    {/* Direction arrow */}
                    {arrow && <span className="board-cell__arrow">{arrow}</span>}

                    {/* Players */}
                    {playersHere.length > 0 && (
                      <div className="board-cell__players">
                        {playersHere.map((player) => (
                          <div
                            key={player.id}
                            className={`board-token group ${hoppingPlayerId === player.id ? "animate-hop" : ""}`}
                            style={{ backgroundColor: player.color, width: tokenSize, height: tokenSize, fontSize: tokenSize * 0.5 }}
                            onMouseDown={(e) => handleDragStart(e, player)}
                            onTouchStart={(e) => handleDragStart(e, player)}
                            data-player-name={player.name}
                          >
                            <span className="group-hover:hidden">
                              {player.name[0]}
                            </span>
                            <span className="hidden group-hover:block animate-wave">
                              {player.emoji}
                            </span>
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
      </div>

      {/* Sidebar */}
      <div className="lg:w-72 flex flex-col gap-2 min-h-0 shrink-0 overflow-hidden">
        {/* Ranking */}
        <div className="retro-card p-4 flex flex-col min-h-0 flex-1">
          <h3 className="text-lg font-bold text-gloria-brown mb-3 flex items-center gap-2 shrink-0">
            <span>🏅</span> Classificação
          </h3>
          <div className="space-y-2 overflow-y-auto min-h-0">
            {rankedPlayers.map((player, i) => {
              const justMovedUp = movedUpIds.has(player.id);
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all duration-500 bg-gloria-cream border-transparent ${justMovedUp ? "animate-rank-up" : ""}`}
                >
                  <span className={`w-7 text-center font-extrabold text-lg ${justMovedUp ? "animate-bounce-in" : ""}`}>
                    {medal || `${i + 1}.`}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 ${justMovedUp ? "animate-hop" : ""}`}
                    style={{ backgroundColor: player.color, borderColor: "white" }}
                  >
                    <span className="animate-wave" style={{ animationDelay: `${i * 0.4}s` }}>
                      {player.emoji}
                    </span>
                  </div>
                  <span className="flex-1 font-bold text-gloria-brown text-sm truncate">{player.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all duration-300 ${
                      justMovedUp ? "bg-green-200 text-green-800 scale-110" : "bg-gloria-tan text-gloria-brown"
                    }`}
                  >
                    Casa {player.position}
                  </span>
                  {justMovedUp && <span className="text-green-500 text-sm font-bold animate-bounce-in">▲</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Question area */}
        <div className="retro-card p-5">
          {!showQuestion ? (
            <div className="text-center">
              <div className="text-4xl mb-3">🎲</div>
              <p className="text-gloria-brown font-bold text-lg mb-1">Pergunta {state.currentQuestionIndex + 1}/{state.quiz.questions.length}</p>
              <p className="text-gloria-brown-light text-sm mb-4">Quem responde primeiro, avança!</p>
              <button className="retro-button w-full" onClick={handleAskQuestion}>Ver Pergunta</button>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">❓</span>
                <span className="text-xs bg-gloria-tan text-gloria-brown-light px-2 py-0.5 rounded-full">
                  Pergunta {state.currentQuestionIndex + 1}/{state.quiz.questions.length}
                </span>
              </div>
              <p className="text-gloria-brown font-bold text-lg mb-4">{currentQuestion?.text}</p>

              {!showResult ? (
                <>
                  {currentQuestion?.type === "multiple-choice" && currentQuestion.options ? (
                    <div className="space-y-2 mb-4">
                      {currentQuestion.options.map((opt, i) => (
                        <div
                          key={i}
                          className="w-full text-left p-3 rounded-lg border-2 bg-gloria-cream border-gloria-tan"
                        >
                          <span className="text-gloria-brown-light font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                          <span className="text-gloria-brown">{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center mb-4">
                      <div className="text-3xl mb-2">🗣️</div>
                      <p className="text-blue-800 font-bold text-sm">Pergunta aberta!</p>
                      <p className="text-blue-600 text-sm mt-1">Lê em voz alta.</p>
                    </div>
                  )}
                  {currentQuestion?.type === "multiple-choice" && (
                    <button className="retro-button retro-button-green w-full mb-2" onClick={handleSubmitAnswer}>
                      Revelar Resposta
                    </button>
                  )}
                  <button className="retro-button retro-button-secondary w-full" onClick={handleNextQuestion}>
                    Próxima Pergunta
                  </button>
                </>
              ) : (
                <div className="animate-bounce-in">
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center mb-4">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-green-800 font-bold text-lg">Resposta:</p>
                    <p className="text-green-700 font-bold text-xl mt-1">{currentQuestion?.correctAnswer}</p>
                    <p className="text-green-600 text-sm mt-2">Arrasta quem acertou no tabuleiro!</p>
                  </div>
                  <button className="retro-button retro-button-secondary w-full" onClick={handleNextQuestion}>
                    Próxima Pergunta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drag hint */}
        <div className="retro-card p-3 text-center">
          <p className="text-gloria-brown-light text-xs">Arrasta os jogadores no tabuleiro para os mover manualmente</p>
        </div>

        {/* Game actions */}
        <div className="retro-card p-3 flex flex-col gap-2">
          <button className="retro-button retro-button-secondary text-sm py-2 w-full" onClick={() => dispatch({ type: "SET_PHASE", phase: "quiz-creator" })}>
            Editar Quiz
          </button>
          <button className="retro-button retro-button-secondary text-sm py-2 w-full" onClick={() => dispatch({ type: "RESTART_GAME" })}>
            Reiniciar Jogo
          </button>
          <button className="text-gloria-brown-light hover:text-gloria-brown text-xs underline" onClick={() => dispatch({ type: "RESET_GAME" })}>
            Voltar ao Menu
          </button>
        </div>
      </div>

      {/* Drag ghost */}
      {isDragging && dragPlayerId && (
        <div className="fixed pointer-events-none z-50" style={{ left: dragPos.x - 18, top: dragPos.y - 18 }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 shadow-lg"
            style={{
              backgroundColor: state.players.find((p) => p.id === dragPlayerId)?.color || "#ccc",
              borderColor: "white",
              transform: "scale(1.3)",
            }}
          >
            {state.players.find((p) => p.id === dragPlayerId)?.name[0]}
          </div>
        </div>
      )}
    </div>
  );
}
