# TODO — Multiplayer Refactor

## Infrastructure
- [x] Create Neon project and database
- [x] Create database schema (quizzes, questions, rooms, players, answers)
- [x] Install dependencies (@neondatabase/serverless, nanoid, qrcode)
- [x] Set up db.ts connection helper
- [x] Update types.ts for multiplayer

## API Routes
- [x] POST /api/quizzes — Create quiz
- [x] GET /api/quizzes/[id] — Get quiz
- [x] PUT /api/quizzes/[id] — Update quiz
- [x] POST /api/rooms — Create room from quiz
- [x] GET /api/rooms/[code] — Get room state (polled)
- [x] PATCH /api/rooms/[code] — Update room phase/question (organizer)
- [x] POST /api/rooms/[code]/join — Player joins
- [x] GET /api/rooms/[code]/players — Player list
- [x] POST /api/rooms/[code]/answer — Submit answer
- [x] GET /api/rooms/[code]/answers — Get answers for current question
- [x] PATCH /api/rooms/[code]/answers/[answerId] — Mark open-ended correct/wrong

## Frontend Pages
- [x] `/` — Landing page (Create Quiz / Join Room)
- [x] `/create` — Quiz creator (saves to DB)
- [x] `/host/[code]` — Organizer big screen (lobby → questions → leaderboard)
- [x] `/play/[code]` — Player phone view (join → answer → results)

## Frontend Components
- [x] Polling hook (useRoomState)
- [x] QR code display component
- [x] Host lobby view (show players joining)
- [x] Host question view (show question + live answer count)
- [x] Host reveal view (correct answer + who got it right)
- [x] Host leaderboard view (between questions)
- [x] Host final standings
- [x] Player join screen (name entry)
- [x] Player lobby view (waiting for game start)
- [x] Player question view (MC buttons / text input)
- [x] Player waiting view (after answering)
- [x] Player reveal view (correct/wrong + points + rank)
- [x] Player final standings

## Testing & CI
- [x] Vitest config with v8 coverage (90% thresholds)
- [x] Unit tests for all API routes (62 tests, 11 files)
- [x] GitHub Actions CI workflow (test + lint)
- [x] Coverage: 99.32% statements, 93.87% branches, 95% functions, 100% lines

## Cleanup
- [x] Remove old single-player components (GameBoard, PlayerSetup, GameContext, persistence.ts)
- [x] Update layout.tsx (remove GameProvider wrapper)
- [x] Update AGENTS.md with new architecture
- [x] Update TODO.md with current progress
- [x] Build passes
- [x] Push and create PR

## Prisma Migration
- [x] Install Prisma 7.5.0 with Neon adapter
- [x] Create prisma/schema.prisma (5 models matching DB schema)
- [x] Create prisma.config.ts for Prisma 7
- [x] Generate Prisma client to src/generated/prisma/
- [x] Fix Prisma client singleton (src/app/lib/prisma.ts)
- [x] Rewrite all 9 API routes from raw SQL to Prisma
- [x] Rewrite test setup to mock Prisma instead of raw SQL
- [x] Rewrite all 9 test files (52 tests, all passing)
- [x] Add prisma generate to build + postinstall scripts
- [x] Add src/generated/ to .gitignore
- [x] Coverage maintained: 99.32% stmts, 93.87% branches, 95% funcs, 100% lines
- [x] Delete old src/app/lib/db.ts (raw SQL helper)
- [x] Commit and push Prisma migration

## Game Features (Post-Prisma)
- [x] Quiz reset — organizer can restart game from any phase
- [x] Mid-game quiz editor — inline editor on host screen (lobby, question, reveal)
- [x] Host can remove players from lobby
- [x] Player session persistence via localStorage (survives page refresh)
- [x] Graceful handling of player removal (clears localStorage, shows join screen)

## Next Steps
- [ ] Verify Vercel deployment works end-to-end

## Feature: Question Timer + Speed Bonus
Adds urgency and rewards fast answers — the core of what makes quiz games exciting.

### Backend
- [x] Add `timeLimit` column to questions table (nullable int, seconds, default null = no timer)
- [x] Update Prisma schema + generate client
- [x] Update `POST /api/rooms/[code]/answer` — record `answeredAt` timestamp, calculate speed bonus
  - Speed bonus formula: `basePoints + basePoints * (timeRemaining / timeLimit)` rounded
- [x] Update `GET /api/rooms/[code]` — include `timeLimit` in currentQuestion, include `questionStartedAt` in room state
- [x] Add `questionStartedAt` column to rooms table (nullable timestamp)
- [x] Update `PATCH /api/rooms/[code]` — set `questionStartedAt = now()` when opening a question
- [x] Tests for speed bonus calculation (fast answer, slow answer, expired, wrong+timer, no timer — 5 tests)

### Frontend
- [x] Quiz creator (`/create`) — add timer dropdown per question (Sem limite / 10s / 20s / 30s / 60s)
- [x] Host QuizEditor — same timer dropdown
- [x] Host question view — circular countdown timer, auto-close when expired
- [x] Player question view — countdown timer, disable answer buttons when expired, "Tempo esgotado!" message
- [x] Player reveal — speed bonus breakdown ("X pontos + Y bonus de velocidade")

## Feature: Sound Effects
Even 3-4 sounds transform the vibe from silent app to party game.

### Implementation
- [x] Create `useSound` hook — Web Audio API synthesis (tick, correct, wrong, reveal, fanfare)
- [x] Create `MuteButton` component — mute toggle persisted in localStorage
- [x] Host: play countdown tick during question phase (last 5 seconds)
- [x] Host: play reveal sound when showing correct answer
- [x] Host: play fanfare on final standings
- [x] Player: play correct/wrong sound on reveal
- [x] Add mute/unmute toggle button (both host and player, persisted in localStorage)

## Feature: Live Answer Count on Host
Gives the host confidence to pace the game — "everyone answered, let's reveal!"

### Implementation
- [x] Host question view — show "X/Y responderam" counter with progress bar
- [x] Animate the counter as answers come in
- [x] Auto-advance: when all players answered, show "Todos responderam!" flash + auto-reveal after 2s

## Feature: Podium Finish
A dramatic 3rd → 2nd → 1st reveal makes the ending feel like an event.

### Implementation
- [x] New `HostFinished` podium component with staggered reveal (3rd at 0.5s, 2nd at 2s, 1st at 3.5s)
- [x] Animated podium blocks with gradient colors, rising animation (podium-rise CSS)
- [x] Crown drop animation for 1st place
- [x] Confetti burst on 1st place reveal (40 pieces)
- [x] Full leaderboard appears after podium sequence (5s)
- [x] Graceful fallback: <3 players skips podium, shows leaderboard directly
- [x] Player finished screen — shows final rank ("Ficaste em Xo lugar!")

## Feature: Player Rank Between Questions
Fuels competition by showing players where they stand after each question.

### Implementation
- [x] Player reveal view — show current rank ("Estas em 2o lugar!") with gap to 1st
- [x] Medal emojis for top 3 positions
- [x] "Estas na lideranca!" message for 1st place
- [x] Leaderboard mini-view on player screen (top 5 + player's own position highlighted)

## Feature: Emoji Reactions
Low effort, high fun — players send quick reactions that appear on the host screen.

### Backend
- [x] `POST /api/rooms/[code]/reactions` — player sends emoji reaction (throttled: 1 per 3s per player)
- [x] `GET /api/rooms/[code]/reactions` — recent reactions (last 10s)
- [x] Tests for reaction endpoint (throttle, valid emoji, room exists) — 10 tests

### Frontend
- [x] Player: reaction bar during reveal phase (5-6 emoji buttons: 😂🔥😱🎉👏😭)
- [x] Host: floating emoji animation overlay — reactions bubble up and fade out
- [x] Rate-limit UI: disable buttons for 3s after sending

## Feature: Question Reordering
Drag-to-reorder in the quiz editor helps organizers adjust on the fly.

### Implementation
- [x] Quiz creator (`/create`) — drag handle on each question, reorder via drag-and-drop
- [x] Host QuizEditor — same drag-to-reorder
- [x] Use HTML5 drag-and-drop API (no extra dependencies)
- [x] Update sortOrder on save

## Feature: Answer Streaks
"3 respostas certas seguidas!" builds momentum and adds a meta-game.

### Backend
- [ ] Track streak per player — count consecutive correct answers
- [ ] Include streak in room state response (per player)
- [ ] Streak bonus: 3+ streak = 1.5x points, 5+ streak = 2x points

### Frontend
- [ ] Player: show streak counter with fire animation ("🔥 3 seguidas!")
- [ ] Host reveal: highlight players on streaks
- [ ] Streak break notification ("Perdeste a streak!")

## Feature: Quiz Library
Save and reuse quizzes — saves organizers time for recurring events.

### Backend
- [x] `GET /api/quizzes` — list all quizzes (paginated, newest first)
- [x] `DELETE /api/quizzes/[id]` — delete quiz with cascade (answers, players, rooms, questions)
- [x] Tests for quiz listing endpoint (3 tests)
- [x] Tests for quiz delete endpoint (2 tests)

### Frontend
- [x] `/quizzes` page — show saved quizzes with title, question count, date
- [x] "Jogar" button → creates room directly, redirects to host
- [x] "Editar" button → opens quiz in editor (`/create?edit=ID`)
- [x] "Apagar" button with confirmation dialog (Sim/Nao)
- [x] `/create` supports `?edit=ID` — loads existing quiz, uses PUT to save
- [x] Landing page links to "Os Meus Quizzes"
