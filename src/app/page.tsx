"use client";

import { useGame } from "./context/GameContext";
import { MainMenu } from "./components/MainMenu";
import { QuizCreator } from "./components/QuizCreator";
import { PlayerSetup } from "./components/PlayerSetup";
import { GameBoard } from "./components/GameBoard";
import { WinnerScreen } from "./components/WinnerScreen";

export default function Home() {
  const { state } = useGame();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {state.phase === "menu" && <MainMenu />}
      {state.phase === "quiz-creator" && <QuizCreator />}
      {state.phase === "player-setup" && <PlayerSetup />}
      {state.phase === "playing" && <GameBoard />}
      {state.phase === "finished" && <WinnerScreen />}
    </div>
  );
}
