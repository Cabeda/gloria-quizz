"use client";

import { useGame } from "./context/GameContext";
import { MainMenu } from "./components/MainMenu";
import { QuizCreator } from "./components/QuizCreator";
import { PlayerSetup } from "./components/PlayerSetup";
import { GameBoard } from "./components/GameBoard";
import { WinnerScreen } from "./components/WinnerScreen";

export default function Home() {
  const { state, isLoading } = useGame();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="retro-card p-12 text-center animate-bounce-in">
          <div className="text-5xl mb-4">🎲</div>
          <p className="text-amber-800 font-bold text-lg">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={state.phase === "playing" ? "h-screen overflow-hidden" : "min-h-screen flex flex-col items-center justify-center p-4"}>
      {state.phase === "menu" && <MainMenu />}
      {state.phase === "quiz-creator" && <QuizCreator />}
      {state.phase === "player-setup" && <PlayerSetup />}
      {state.phase === "playing" && <GameBoard />}
      {state.phase === "finished" && <WinnerScreen />}
    </div>
  );
}
