"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { GameState, GamePhase, Quiz, Player } from "../types";
import { saveState, loadState, clearState } from "../lib/persistence";

const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#e84393",
  "#2c3e50",
  "#d35400",
];

const PLAYER_EMOJIS = ["🧒", "👧", "👦", "👶", "🧒", "👧", "👦", "👶", "🧒", "👧"];

const TOTAL_POSITIONS = 30;

const initialState: GameState = {
  phase: "menu",
  quiz: { questions: [] },
  players: [],
  currentQuestionIndex: 0,
  totalPositions: TOTAL_POSITIONS,
  answeredCorrectly: null,
};

type Action =
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "SET_QUIZ"; quiz: Quiz }
  | { type: "ADD_PLAYER"; name: string }
  | { type: "REMOVE_PLAYER"; id: string }
  | { type: "MOVE_PLAYER"; playerId: string; position: number }
  | { type: "ADVANCE_PLAYER"; playerId: string; steps: number }
  | { type: "NEXT_QUESTION" }
  | { type: "PREV_QUESTION" }
  | { type: "GO_TO_QUESTION"; index: number }
  | { type: "ANSWER_CORRECT" }
  | { type: "ANSWER_WRONG" }
  | { type: "RESET_ANSWER" }
  | { type: "RESET_GAME" }
  | { type: "RESTART_GAME" }
  | { type: "RESTORE_STATE"; state: GameState };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "SET_QUIZ": {
      // Clamp question index if questions were removed
      const clampedIdx =
        action.quiz.questions.length > 0
          ? Math.min(state.currentQuestionIndex, action.quiz.questions.length - 1)
          : 0;
      return { ...state, quiz: action.quiz, currentQuestionIndex: clampedIdx };
    }

    case "ADD_PLAYER": {
      const idx = state.players.length;
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: action.name,
        position: 0,
        color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
        emoji: PLAYER_EMOJIS[idx % PLAYER_EMOJIS.length],
      };
      return { ...state, players: [...state.players, newPlayer] };
    }

    case "REMOVE_PLAYER":
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.id),
      };

    case "MOVE_PLAYER":
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId
            ? { ...p, position: Math.min(action.position, state.totalPositions) }
            : p
        ),
      };

    case "ADVANCE_PLAYER":
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                position: Math.min(
                  p.position + action.steps,
                  state.totalPositions
                ),
              }
            : p
        ),
      };

    case "ANSWER_CORRECT":
      return { ...state, answeredCorrectly: true };

    case "ANSWER_WRONG":
      return { ...state, answeredCorrectly: false };

    case "RESET_ANSWER":
      return { ...state, answeredCorrectly: null };

    case "NEXT_QUESTION": {
      const nextQuestionIndex =
        (state.currentQuestionIndex + 1) % state.quiz.questions.length;
      const winner = state.players.find(
        (p) => p.position >= state.totalPositions
      );
      return {
        ...state,
        currentQuestionIndex: nextQuestionIndex,
        answeredCorrectly: null,
        phase: winner ? "finished" : state.phase,
      };
    }

    case "PREV_QUESTION": {
      const totalQuestions = state.quiz.questions.length;
      const prevQuestionIndex =
        state.currentQuestionIndex === 0
          ? totalQuestions - 1
          : state.currentQuestionIndex - 1;
      return {
        ...state,
        currentQuestionIndex: prevQuestionIndex,
        answeredCorrectly: null,
      };
    }

    case "GO_TO_QUESTION":
      return {
        ...state,
        currentQuestionIndex: Math.max(0, Math.min(action.index, state.quiz.questions.length - 1)),
        answeredCorrectly: null,
      };

    case "RESTART_GAME":
      // Keep quiz and players, reset positions and turn state
      return {
        ...state,
        phase: "playing",
        players: state.players.map((p) => ({ ...p, position: 0 })),
        currentQuestionIndex: 0,
        answeredCorrectly: null,
      };

    case "RESET_GAME":
      return { ...initialState };

    case "RESTORE_STATE":
      return action.state;

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  isLoading: boolean;
  hasSavedGame: boolean;
  resumeGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [savedGame, setSavedGame] = useState<GameState | null>(null);

  // Load saved state on mount (don't auto-restore — let user choose)
  useEffect(() => {
    loadState<GameState>()
      .then((saved) => {
        if (saved && saved.phase !== "menu") {
          // Strip legacy fields
          const { currentPlayerIndex: _, ...clean } = saved as GameState & { currentPlayerIndex?: number };
          setSavedGame({ ...initialState, ...clean } as GameState);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  function resumeGame() {
    if (savedGame) {
      dispatch({ type: "RESTORE_STATE", state: savedGame });
      setSavedGame(null);
    }
  }

  // Persist state to IndexedDB on every change (skip while loading)
  useEffect(() => {
    if (isLoading) return;
    if (state.phase === "menu") {
      // Only clear if user explicitly reset (no pending saved game)
      if (!savedGame) clearState().catch(() => {});
    } else {
      saveState(state).catch(() => {});
    }
  }, [state, isLoading, savedGame]);

  return (
    <GameContext.Provider value={{ state, dispatch, isLoading, hasSavedGame: !!savedGame, resumeGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
