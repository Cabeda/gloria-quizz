"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useGame } from "../context/GameContext";
import type { Player } from "../types";

const TOTAL_CELLS = 31; // 0 (start) to 30 (finish/center)

// Special cell types for visual variety (like the Glória board)
const SPECIAL_CELLS: Record<number, { color: string; icon: string }> = {
  0: { color: "#e74c3c", icon: "🏁" },
  5: { color: "#e84393", icon: "🎪" },
  7: { color: "#3498db", icon: "🎵" },
  10: { color: "#e84393", icon: "🌟" },
  13: { color: "#3498db", icon: "🎨" },
  15: { color: "#e74c3c", icon: "🎭" },
  18: { color: "#3498db", icon: "🎸" },
  20: { color: "#e84393", icon: "🦋" },
  23: { color: "#3498db", icon: "🎯" },
  25: { color: "#e74c3c", icon: "🍀" },
  28: { color: "#e84393", icon: "🌈" },
  30: { color: "#f1c40f", icon: "🏆" },
};

const DEFAULT_CELL_COLOR = "#dbb778"; // Golden tan like the real board

/**
 * Generate spiral positions for the board.
 * The spiral starts at the outer bottom-right and winds inward clockwise
 * to the center, mimicking a classic Glória board.
 */
function generateSpiralPositions(
  total: number,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number
): { x: number; y: number; angle: number }[] {
  const positions: { x: number; y: number; angle: number }[] = [];
  // ~2.5 full turns from outside to center
  const totalAngle = 2.5 * 2 * Math.PI;
  for (let i = 0; i < total; i++) {
    const t = i / (total - 1); // 0 to 1
    const angle = -Math.PI / 2 + t * totalAngle; // start from top
    const radius = outerRadius - t * (outerRadius - innerRadius);
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    positions.push({ x, y, angle });
  }
  return positions;
}

// Board dimensions
const BOARD_SIZE = 600;
const CENTER = BOARD_SIZE / 2;
const OUTER_R = 270;
const INNER_R = 30;
const CELL_RADIUS = 22;

const SPIRAL_POSITIONS = generateSpiralPositions(
  TOTAL_CELLS,
  CENTER,
  CENTER,
  OUTER_R,
  INNER_R
);

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
  const svgRef = useRef<SVGSVGElement>(null);

  const currentPlayer = state.players[state.currentPlayerIndex];
  const currentQuestion = state.quiz.questions[state.currentQuestionIndex];

  // Sorted ranking by position (descending)
  const rankedPlayers = useMemo(
    () => [...state.players].sort((a, b) => b.position - a.position),
    [state.players]
  );

  // Detect ranking changes and trigger animations
  useEffect(() => {
    const currentRanking = rankedPlayers.map((p) => p.id);
    if (prevRanking.length > 0) {
      const newMovedUp = new Set<string>();
      currentRanking.forEach((id, newIdx) => {
        const oldIdx = prevRanking.indexOf(id);
        if (oldIdx > newIdx && oldIdx !== -1) {
          newMovedUp.add(id);
        }
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
        steps: 1 + Math.floor(Math.random() * 3),
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

  // Convert screen coords to SVG coords
  function screenToSVG(clientX: number, clientY: number): { x: number; y: number } {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  // Drag and drop handlers
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

    const svgCoords = screenToSVG(dragPos.x, dragPos.y);

    // Find closest cell in SVG space
    let closestPos = 0;
    let closestDist = Infinity;

    SPIRAL_POSITIONS.forEach((pos, idx) => {
      const dist = Math.hypot(svgCoords.x - pos.x, svgCoords.y - pos.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestPos = idx;
      }
    });

    if (closestDist < CELL_RADIUS * 3) {
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

  // Draw the spiral path connecting cells
  function getSpiralPath(): string {
    if (SPIRAL_POSITIONS.length < 2) return "";
    let d = `M ${SPIRAL_POSITIONS[0].x} ${SPIRAL_POSITIONS[0].y}`;
    for (let i = 1; i < SPIRAL_POSITIONS.length; i++) {
      const p = SPIRAL_POSITIONS[i];
      d += ` L ${p.x} ${p.y}`;
    }
    return d;
  }

  return (
    <div className="w-full h-screen flex flex-col lg:flex-row gap-4 p-2 overflow-hidden">
      {/* Board */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div
          className="rounded-3xl p-3 shadow-2xl relative w-full h-full max-h-[95vh] aspect-square mx-auto"
          style={{
            background: "linear-gradient(145deg, #4a7c59 0%, #3d6b4a 50%, #2d5a3a 100%)",
            border: "6px solid #2d4a35",
            maxWidth: "95vh",
          }}
        >
          {/* Board title */}
          <h2
            className="text-2xl lg:text-3xl font-extrabold text-center mb-1 drop-shadow-lg"
            style={{
              fontFamily: "Georgia, serif",
              color: "#fdf2e0",
              textShadow: "2px 2px 4px rgba(0,0,0,0.4)",
            }}
          >
            Quem conhece a Graça?
          </h2>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }}
          >
            {/* Background circle */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={OUTER_R + 20}
              fill="#3d6b4a"
              stroke="#2d4a35"
              strokeWidth="3"
            />

            {/* Spiral path (the track) */}
            <path
              d={getSpiralPath()}
              fill="none"
              stroke="#8B6914"
              strokeWidth={CELL_RADIUS * 2 + 6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
            />
            <path
              d={getSpiralPath()}
              fill="none"
              stroke="#c4956a"
              strokeWidth={CELL_RADIUS * 2 + 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
            />

            {/* Cells */}
            {SPIRAL_POSITIONS.map((pos, idx) => {
              const special = SPECIAL_CELLS[idx];
              const cellColor = special?.color || DEFAULT_CELL_COLOR;
              const isStart = idx === 0;
              const isFinish = idx === TOTAL_CELLS - 1;
              const playersHere = getPlayersAtPosition(idx);
              const isCurrentPlayerHere = playersHere.some(
                (p) => p.id === currentPlayer?.id
              );

              return (
                <g key={idx}>
                  {/* Cell background */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={CELL_RADIUS}
                    fill={cellColor}
                    stroke="#5a3e1b"
                    strokeWidth="2"
                    opacity={special ? 1 : 0.85}
                  />

                  {/* Inner highlight */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={CELL_RADIUS - 3}
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="1"
                  />

                  {/* Pulse for current player cell */}
                  {isCurrentPlayerHere && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={CELL_RADIUS + 4}
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="r"
                        values={`${CELL_RADIUS + 2};${CELL_RADIUS + 8};${CELL_RADIUS + 2}`}
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.1;0.6"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Cell number */}
                  <text
                    x={pos.x}
                    y={pos.y + (special ? -4 : 1)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={special ? "9" : "11"}
                    fontWeight="bold"
                    fill={special ? "#fff" : "#5a3e1b"}
                    style={{ pointerEvents: "none" }}
                  >
                    {idx}
                  </text>

                  {/* Special icon */}
                  {special && (
                    <text
                      x={pos.x}
                      y={pos.y + 8}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      style={{ pointerEvents: "none" }}
                    >
                      {special.icon}
                    </text>
                  )}

                  {/* Start / Finish labels */}
                  {isStart && (
                    <text
                      x={pos.x}
                      y={pos.y + CELL_RADIUS + 14}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#fdf2e0"
                    >
                      INÍCIO
                    </text>
                  )}
                  {isFinish && (
                    <text
                      x={pos.x}
                      y={pos.y - CELL_RADIUS - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#f1c40f"
                    >
                      GLÓRIA!
                    </text>
                  )}

                  {/* Players on this cell */}
                  {playersHere.map((player, pi) => {
                    const offsetAngle = (pi * 2 * Math.PI) / Math.max(playersHere.length, 1);
                    const offsetR = playersHere.length > 1 ? 12 : 0;
                    const px = pos.x + offsetR * Math.cos(offsetAngle);
                    const py = pos.y + offsetR * Math.sin(offsetAngle) - 2;

                    return (
                      <g
                        key={player.id}
                        className={`player-piece ${hoppingPlayerId === player.id ? "animate-hop" : ""}`}
                        onMouseDown={(e) => handleDragStart(e, player)}
                        onTouchStart={(e) => handleDragStart(e, player)}
                        style={{ cursor: "grab" }}
                      >
                        {/* Player pawn shadow */}
                        <ellipse
                          cx={px}
                          cy={py + 10}
                          rx="7"
                          ry="3"
                          fill="rgba(0,0,0,0.25)"
                        />
                        {/* Pawn body */}
                        <circle
                          cx={px}
                          cy={py}
                          r="9"
                          fill={player.color}
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        {/* Pawn head */}
                        <circle
                          cx={px}
                          cy={py - 9}
                          r="5"
                          fill={player.color}
                          stroke="#fff"
                          strokeWidth="1.5"
                        />
                        {/* Emoji face */}
                        <text
                          x={px}
                          y={py - 7}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="7"
                          style={{ pointerEvents: "none" }}
                        >
                          {player.emoji}
                        </text>
                        {/* Waving hand */}
                        <g className="animate-wave" style={{ transformOrigin: `${px + 8}px ${py - 2}px` }}>
                          <text
                            x={px + 10}
                            y={py - 2}
                            fontSize="7"
                            style={{ pointerEvents: "none" }}
                          >
                            👋
                          </text>
                        </g>
                        {/* Name label */}
                        <text
                          x={px}
                          y={py + 18}
                          textAnchor="middle"
                          fontSize="6"
                          fontWeight="bold"
                          fill="#fdf2e0"
                          stroke="#333"
                          strokeWidth="0.3"
                          style={{ pointerEvents: "none" }}
                        >
                          {player.name.length > 6 ? player.name.slice(0, 6) + "…" : player.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Center decoration */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={INNER_R + 15}
              fill="#fdf2e0"
              stroke="#8B6914"
              strokeWidth="3"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={INNER_R + 8}
              fill="#fffbf0"
              stroke="#c4956a"
              strokeWidth="2"
            />
            <text
              x={CENTER}
              y={CENTER - 6}
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fill="#8B6914"
              style={{ fontFamily: "Georgia, serif" }}
            >
              GLÓRIA
            </text>
            <text
              x={CENTER}
              y={CENTER + 10}
              textAnchor="middle"
              fontSize="16"
            >
              🏆
            </text>
          </svg>

          {/* Decorative corners */}
          <div className="absolute top-2 left-2 text-2xl opacity-60">🎲</div>
          <div className="absolute top-2 right-2 text-2xl opacity-60">🎪</div>
          <div className="absolute bottom-2 left-2 text-2xl opacity-60">🌟</div>
          <div className="absolute bottom-2 right-2 text-2xl opacity-60">🎵</div>
        </div>
      </div>

      {/* Sidebar: current turn + question */}
      <div className="lg:w-80 flex flex-col gap-3 lg:max-h-screen lg:overflow-y-auto shrink-0">
        {/* Player ranking */}
        <div className="retro-card p-4">
          <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
            <span>🏅</span> Classificação
          </h3>
          <div className="space-y-2">
            {rankedPlayers.map((player, i) => {
              const isCurrentTurn = player.id === currentPlayer?.id;
              const justMovedUp = movedUpIds.has(player.id);
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all duration-500 ease-in-out ${
                    isCurrentTurn
                      ? "bg-amber-100 border-amber-400"
                      : "bg-amber-50 border-transparent"
                  } ${justMovedUp ? "animate-rank-up" : ""}`}
                  style={{
                    order: i,
                    transform: justMovedUp ? undefined : "translateY(0)",
                  }}
                >
                  <span className={`w-7 text-center font-extrabold text-lg ${justMovedUp ? "animate-bounce-in" : ""}`}>
                    {medal || `${i + 1}.`}
                  </span>

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 ${justMovedUp ? "animate-hop" : ""}`}
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

                  <span className="flex-1 font-bold text-amber-900 text-sm truncate">
                    {player.name}
                  </span>

                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all duration-300 ${
                      justMovedUp
                        ? "bg-green-200 text-green-800 scale-110"
                        : "bg-amber-200 text-amber-800"
                    }`}
                  >
                    Casa {player.position}
                  </span>

                  {justMovedUp && (
                    <span className="text-green-500 text-sm font-bold animate-bounce-in">
                      ▲
                    </span>
                  )}

                  {isCurrentTurn && (
                    <span className="text-xs text-amber-600 font-bold">
                      ← Vez
                    </span>
                  )}
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
