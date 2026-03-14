// Shared types for the multiplayer quiz game

export interface Question {
  id: string;
  text: string;
  type: "open-ended" | "multiple-choice";
  options?: string[];
  correctAnswer?: string;
  points: number;
  sortOrder: number;
  timeLimit?: number | null;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  createdAt?: string;
}

export interface Player {
  id: string;
  roomId: string;
  name: string;
  emoji: string;
  color: string;
  score: number;
  isConnected: boolean;
  joinedAt?: string;
  streak?: number;
}

export interface Answer {
  id: string;
  roomId: string;
  questionId: string;
  playerId: string;
  answerText: string;
  isCorrect: boolean | null;
  answeredAt?: string;
  playerName?: string;
  playerEmoji?: string;
  playerColor?: string;
}

export type RoomPhase = "lobby" | "playing" | "question" | "reveal" | "finished";

export interface Room {
  id: string;
  quizId: string;
  phase: RoomPhase;
  currentQuestionIndex: number;
  questionOpen: boolean;
  questionStartedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomState {
  room: Room;
  quiz: Quiz;
  players: Player[];
  currentQuestion: Question | null;
  answers: Answer[];
}

// --- Ranking utilities ---

export interface RankedPlayer extends Player {
  rank: number;
}

/** Sort players by score descending and assign dense ranks (ties share the same rank).
 *  Example: scores [10, 10, 5, 3] → ranks [1, 1, 2, 3]
 *  This uses "dense ranking" so the next rank after a tie is rank+1, not rank+tiedCount. */
export function rankPlayers(players: Player[]): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  let currentRank = 0;
  let lastScore: number | null = null;

  return sorted.map((p) => {
    if (p.score !== lastScore) {
      currentRank++;
      lastScore = p.score;
    }
    return { ...p, rank: currentRank };
  });
}

/** Get the dense rank for a specific player within a sorted list. */
export function getPlayerRank(players: Player[], playerId: string): number {
  const ranked = rankPlayers(players);
  return ranked.find((p) => p.id === playerId)?.rank ?? ranked.length;
}

/** Medal emoji for ranks 1-3, or "{rank}." for others. */
export function rankLabel(rank: number): string {
  const medals = ["🥇", "🥈", "🥉"];
  return medals[rank - 1] || `${rank}.`;
}
