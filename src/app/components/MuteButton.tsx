"use client";

export function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-40 w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-lg hover:bg-amber-200 transition-colors"
      title={muted ? "Ativar som" : "Silenciar"}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
