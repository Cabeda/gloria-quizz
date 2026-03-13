/** In-memory ephemeral reaction store — no DB needed since reactions are short-lived */

export interface Reaction {
  id: string;
  roomId: string;
  playerId: string;
  emoji: string;
  createdAt: number; // Date.now() timestamp
}

const VALID_EMOJIS = ["😂", "🔥", "😱", "🎉", "👏", "😭"];
const THROTTLE_MS = 3000; // 1 reaction per 3s per player
const TTL_MS = 10000; // reactions expire after 10s

// roomId -> Reaction[]
const store = new Map<string, Reaction[]>();
// playerId -> last reaction timestamp
const lastReaction = new Map<string, number>();

let idCounter = 0;

export function isValidEmoji(emoji: string): boolean {
  return VALID_EMOJIS.includes(emoji);
}

export function isThrottled(playerId: string): boolean {
  const last = lastReaction.get(playerId);
  if (!last) return false;
  return Date.now() - last < THROTTLE_MS;
}

export function addReaction(roomId: string, playerId: string, emoji: string): Reaction {
  const now = Date.now();
  const reaction: Reaction = {
    id: String(++idCounter),
    roomId,
    playerId,
    emoji,
    createdAt: now,
  };

  const list = store.get(roomId) ?? [];
  list.push(reaction);
  store.set(roomId, list);
  lastReaction.set(playerId, now);

  return reaction;
}

export function getRecentReactions(roomId: string): Reaction[] {
  const now = Date.now();
  const list = store.get(roomId) ?? [];
  // Filter to last 10s and clean up expired
  const recent = list.filter((r) => now - r.createdAt < TTL_MS);
  store.set(roomId, recent);
  return recent;
}

/** Reset store — for testing */
export function _resetReactions() {
  store.clear();
  lastReaction.clear();
  idCounter = 0;
}
