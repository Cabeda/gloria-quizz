# AGENTS.md — Quem conhece a Graça?

## Project Overview

A real-time multiplayer party quiz game (Kahoot-style) where an organizer displays questions on a big screen and players answer from their phones. Built on top of a retro Portuguese "Glória" board game aesthetic. All UI is in Portuguese (pt-PT).

The game is called **"Quem conhece a Graça?"**.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **UI:** React 19 with React Compiler enabled (`reactCompiler: true` in next.config.ts)
- **Styling:** Tailwind CSS 4 with custom CSS animations in `globals.css`
- **Database:** Neon Postgres (via `@neondatabase/serverless`)
- **Real-time:** HTTP polling every 1.5s via Next.js API routes
- **QR Code:** `qrcode` library (client-side generation)
- **Testing:** Vitest with `@vitest/coverage-v8` (90% threshold)
- **Package Manager:** pnpm

## Project Structure

```
src/app/
├── layout.tsx              # Root layout (clean, no providers)
├── page.tsx                # Landing page — Create Quiz / Join Room
├── globals.css             # Tailwind imports + retro theme + animations
├── types.ts                # Shared TypeScript types (Question, Quiz, Player, Answer, Room, RoomState)
├── lib/
│   └── db.ts               # Neon Postgres connection helper
├── hooks/
│   └── useRoomState.ts     # Polling hook — fetches room state every 1.5s
├── create/
│   └── page.tsx            # Quiz creator — saves to DB, creates room, redirects to host
├── host/
│   └── [code]/
│       └── page.tsx        # Organizer big screen (lobby → question → reveal → leaderboard → finished)
├── play/
│   └── [code]/
│       └── page.tsx        # Player phone view (join → lobby → answer → reveal → finished)
└── api/
    ├── quizzes/
    │   ├── route.ts        # POST — create quiz + questions
    │   └── [id]/
    │       └── route.ts    # GET / PUT — read or update quiz
    └── rooms/
        ├── route.ts        # POST — create room from quiz
        └── [code]/
            ├── route.ts    # GET — room state (polled) / PATCH — update phase
            ├── join/
            │   └── route.ts    # POST — player joins room
            ├── players/
            │   └── route.ts    # GET — player list
            ├── answer/
            │   └── route.ts    # POST — submit answer
            └── answers/
                ├── route.ts    # GET — answers for current question
                └── [answerId]/
                    └── route.ts    # PATCH — mark open-ended answer correct/wrong

src/__tests__/
├── setup.ts                # Mock DB + nanoid setup
└── api/                    # Unit tests for all API routes (9 files, 52 tests)
```

## Game Flow

1. **Landing** (`/`) → organizer clicks "Criar Quiz" or player enters room code
2. **Quiz Creator** (`/create`) → organizer writes questions, saves to DB, room is created
3. **Lobby** → organizer sees QR code + player list on big screen; players join from phones
4. **Question** → question displayed on both screens; players answer on phone (MC buttons or text input)
5. **Reveal** → correct answer shown; organizer marks open-ended answers; scores update
6. **Repeat** steps 4-5 for each question
7. **Finished** → final leaderboard on both screens with confetti

## Key Architecture Decisions

- **Multi-page app with App Router:** Each screen is a separate route (`/`, `/create`, `/host/[code]`, `/play/[code]`).
- **No client-side state management library:** Each page manages its own state. Room state is fetched via polling.
- **HTTP polling (not WebSockets):** `useRoomState` hook polls `GET /api/rooms/[code]` every 1.5s. Simple, reliable, no infra needed.
- **Neon Postgres:** All game state persisted in DB. Schema: `quizzes`, `questions`, `rooms`, `players`, `answers`.
- **Auto-check for MC questions:** When a player submits a multiple-choice answer, the API auto-checks against `correctAnswer` and awards points immediately.
- **Manual check for open-ended:** Organizer sees all answers on big screen and taps "Certo"/"Errado" to award points.
- **Scoring:** Per-question points (default 1), configurable by organizer when creating questions.
- **Join mechanism:** QR code (generated client-side with `qrcode`) + 6-char room code.
- **Styling:** Retro 60s board game aesthetic using custom CSS classes (`.retro-card`, `.retro-button`, `.retro-input`) and warm amber/orange color palette.
- **Animations:** CSS keyframe animations (wave, bounce-in, slide-up, confetti-fall, pulse-glow) defined in `globals.css`.

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm start        # Serve production build
pnpm lint         # Run ESLint
pnpm test         # Run tests with Vitest
pnpm test:coverage # Run tests with coverage report
```

## Database Schema

- **quizzes** — id, title, created_at
- **questions** — id, quiz_id, text, type, options (jsonb), correct_answer, points, sort_order
- **rooms** — id (6-char code), quiz_id, phase, current_question_index, question_open, created_at, updated_at
- **players** — id, room_id, name, emoji, color, score, is_connected, joined_at
- **answers** — id, room_id, question_id, player_id, answer_text, is_correct, answered_at

Connection string is in `.env.local` (gitignored).

## Testing

- **Framework:** Vitest with `@vitest/coverage-v8`
- **Coverage scope:** `src/app/api/**/*.ts` only (business logic). Hooks and lib are excluded as thin wrappers.
- **Coverage thresholds:** 90% for statements, branches, functions, and lines
- **Mock approach:** `createMockSql()` matches SQL query patterns via regex. `nanoid` mocked to return deterministic IDs.
- **CI:** GitHub Actions workflow runs tests with coverage + lint on every push/PR.

## Task Tracking

- **TODO.md** must be kept up to date during development. Mark tasks as done (`[x]`) as you complete them. Add new tasks as they arise.

## Conventions

- All user-facing text must be in **pt-PT** (Portuguese from Portugal).
- Components are `"use client"` since the entire app is interactive.
- No `useMemo`/`useCallback` wrappers needed — the React Compiler handles this.
- CSS animations go in `globals.css`. Tailwind utility classes for layout and spacing.
- Player limit: up to 10 players per room.
- **Question types:**
  - **Multiple choice:** Players select an answer on their phone, auto-checked against `correctAnswer`. Correct = points awarded immediately.
  - **Open-ended:** Players type answers on phone → all answers appear on organizer screen → organizer taps to mark correct ones → points awarded.
