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
- [x] Unit tests for all API routes (52 tests, 9 files)
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

## Next Steps
- [ ] Verify Vercel deployment works (prisma generate in build should fix 500 errors)
- [ ] Performance optimizations (Prisma select for specific fields, parallel queries)
- [ ] Fix correctAnswer radio button bug in /create page (patch included in Prisma commit)
