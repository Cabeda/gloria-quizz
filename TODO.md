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
- [ ] `/` — Landing page (Create Quiz / Join Room)
- [ ] `/create` — Quiz creator (saves to DB)
- [ ] `/host/[code]` — Organizer big screen (lobby → questions → leaderboard)
- [ ] `/play/[code]` — Player phone view (join → answer → results)

## Frontend Components
- [ ] Polling hook (useRoomState, useInterval)
- [ ] QR code display component
- [ ] Host lobby view (show players joining)
- [ ] Host question view (show question + live answer count)
- [ ] Host reveal view (correct answer + who got it right)
- [ ] Host leaderboard view (between questions)
- [ ] Host final standings
- [ ] Player lobby view (waiting for game start)
- [ ] Player question view (answer buttons / text input)
- [ ] Player waiting view (after answering)
- [ ] Player result view (correct/wrong + points)

## Cleanup
- [ ] Remove old single-player components (GameBoard, PlayerSetup, GameContext, persistence.ts)
- [ ] Update layout.tsx (remove GameProvider wrapper)
- [ ] Update AGENTS.md with new architecture
- [ ] Build passes
- [ ] Push and create PR
