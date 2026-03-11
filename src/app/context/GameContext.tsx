"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type { GameState, GamePhase, Quiz, Player, Question } from "../types";

const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#e84393",
];

const PLAYER_EMOJIS = ["🧒", "👧", "👦", "👶", "🧒", "👧", "👦", "👶"];

const TOTAL_POSITIONS = 30;

const initialState: GameState = {
  phase: "menu",
  quiz: { title: "", questions: [] },
  players: [],
  currentQuestionIndex: 0,
  currentPlayerIndex: 0,
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
  | { type: "NEXT_TURN" }
  | { type: "ANSWER_CORRECT" }
  | { type: "ANSWER_WRONG" }
  | { type: "RESET_ANSWER" }
  | { type: "RESET_GAME" };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "SET_QUIZ":
      return { ...state, quiz: action.quiz };

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

    case "NEXT_TURN": {
      const nextPlayerIndex =
        (state.currentPlayerIndex + 1) % state.players.length;
      const nextQuestionIndex =
        (state.currentQuestionIndex + 1) % state.quiz.questions.length;
      // Check if someone won
      const winner = state.players.find(
        (p) => p.position >= state.totalPositions
      );
      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        currentQuestionIndex: nextQuestionIndex,
        answeredCorrectly: null,
        phase: winner ? "finished" : state.phase,
      };
    }

    case "RESET_GAME":
      return {
        ...initialState,
      };

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
