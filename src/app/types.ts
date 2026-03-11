export interface Question {
  id: string;
  text: string;
  type: "open-ended" | "multiple-choice";
  options?: string[];
  correctAnswer: string;
}

export interface Quiz {
  title: string;
  questions: Question[];
}

export interface Player {
  id: string;
  name: string;
  position: number;
  color: string;
  emoji: string;
}

export type GamePhase = "menu" | "quiz-creator" | "player-setup" | "playing" | "finished";

export interface GameState {
  phase: GamePhase;
  quiz: Quiz;
  players: Player[];
  currentQuestionIndex: number;
  currentPlayerIndex: number;
  totalPositions: number;
  answeredCorrectly: boolean | null;
}
