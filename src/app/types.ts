// Shared types for the multiplayer quiz game

export interface Question {
  id: string;
  text: string;
  type: "open-ended" | "multiple-choice";
  options?: string[];
  correctAnswer?: string;
  points: number;
  sortOrder: number;
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
