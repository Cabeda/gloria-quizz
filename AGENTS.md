# AGENTS.md — Quem conhece a Graça?

## Project Overview

A single-page web app board game inspired by the classic Portuguese "Glória" board game, combined with a quiz mechanic. Designed to be displayed on a big screen for group play. All UI is in Portuguese (pt-PT).

The game is called **"Quem conhece a Graça?"**.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **UI:** React 19 with React Compiler enabled (`reactCompiler: true` in next.config.ts)
- **Styling:** Tailwind CSS 4 with custom CSS animations in `globals.css`
- **Package Manager:** pnpm

## Project Structure

```
src/app/
├── layout.tsx              # Root layout, wraps everything in GameProvider
├── page.tsx                # Main SPA entry — renders current game phase
├── globals.css             # Tailwind imports + retro theme + animations
├── types.ts                # Shared TypeScript types (Question, Quiz, Player, GameState)
├── context/
│   └── GameContext.tsx      # Game state management via useReducer + Context
└── components/
    ├── MainMenu.tsx         # Landing screen with "Criar Quiz" button
    ├── QuizCreator.tsx      # Form to create quiz questions (open-ended or multiple choice)
    ├── PlayerSetup.tsx      # Add 2-8 players by name
    ├── GameBoard.tsx        # The Glória board + question sidebar + drag-and-drop
    └── WinnerScreen.tsx     # Victory screen with confetti and final standings
```

## Game Flow

1. **Menu** → 2. **Quiz Creator** (write questions) → 3. **Player Setup** (add players) → 4. **Playing** (board + questions) → 5. **Finished** (winner screen)

All state transitions are managed through `GameContext` via a reducer with `SET_PHASE` actions.

## Key Architecture Decisions

- **Single-page SPA:** All screens are rendered in `page.tsx` based on `state.phase`. No routing needed.
- **State management:** `useReducer` + React Context. No external state libraries. The React Compiler handles memoization automatically.
- **Drag-and-drop:** Custom implementation using mouse/touch events with snap-to-closest-cell logic. No external DnD library.
- **Board layout:** A snaking grid path (left-to-right, then right-to-left per row) generated programmatically. 31 cells (0=start, 30=finish), 7 columns.
- **Styling:** Retro 60s board game aesthetic using custom CSS classes (`.retro-card`, `.retro-button`, `.retro-input`) and warm amber/orange color palette.
- **Animations:** CSS keyframe animations (wave, bounce-in, slide-up, hop, confetti-fall, pulse-glow) defined in `globals.css`.

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm start        # Serve production build
pnpm lint         # Run ESLint
```

## Task Tracking

- **TODO.md** must be kept up to date during development. Mark tasks as done (`[x]`) as you complete them. Add new tasks as they arise. This file is the source of truth for what's left to do.

## Conventions

- All user-facing text must be in **pt-PT** (Portuguese from Portugal).
- Components are `"use client"` since the entire app is interactive.
- No `useMemo`/`useCallback` wrappers needed — the React Compiler handles this.
- Keep all game state in `GameContext`. Do not introduce additional state stores.
- CSS animations go in `globals.css`. Tailwind utility classes for layout and spacing.
- Player limit: 2–8 players. Board has 31 positions (0–30).
- **Question types:**
  - **Multiple choice:** Players select an answer, auto-checked against `correctAnswer`. Correct = auto-advance on the board.
  - **Open-ended:** Only the question text is shown. The host reads it aloud, judges answers verbally, and manually drags correct players forward on the board. No `correctAnswer` is stored.
