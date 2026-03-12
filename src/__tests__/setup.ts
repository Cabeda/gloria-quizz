import { vi } from "vitest";

/**
 * Creates a mock SQL tagged-template function.
 * Call mockSql.mockQuery(pattern, rows) to set up responses.
 * The pattern is matched against the raw SQL string (first template element).
 */
export function createMockSql() {
  const handlers: { pattern: RegExp; rows: unknown[] | ((vals: unknown[]) => unknown[]) }[] = [];

  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const raw = strings.join("?").replace(/\s+/g, " ").trim();
    for (const h of handlers) {
      if (h.pattern.test(raw)) {
        const result = typeof h.rows === "function" ? h.rows(values) : h.rows;
        return Promise.resolve(result);
      }
    }
    return Promise.resolve([]);
  }) as ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) & {
    mockQuery: (pattern: RegExp, rows: unknown[] | ((vals: unknown[]) => unknown[])) => void;
    clearHandlers: () => void;
  };

  sql.mockQuery = (pattern, rows) => {
    handlers.unshift({ pattern, rows }); // newest first so overrides work
  };

  sql.clearHandlers = () => {
    handlers.length = 0;
  };

  return sql;
}

// Shared mock sql instance
export const mockSql = createMockSql();

// Mock getDb to return our mock
vi.mock("@/app/lib/db", () => ({
  getDb: () => mockSql,
}));

// Mock nanoid for deterministic IDs
vi.mock("nanoid", () => ({
  nanoid: () => "test-id-1234",
}));
