export interface Question {
  id: string;
  text: string;
  type: "open-ended" | "multiple-choice";
  options?: string[];
  /** Only required for multiple-choice. Open-ended questions are judged by the host. */
  correctAnswer?: string;
}

export interface Quiz {
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
  totalPositions: number;
  answeredCorrectly: boolean | null;
}
