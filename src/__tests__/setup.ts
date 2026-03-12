import { vi } from "vitest";

// Deep mock of the Prisma client
// Each model gets: findUnique, findFirst, findMany, create, createMany, update, updateMany, delete, deleteMany, count
function createModelMock() {
  return {
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    count: vi.fn().mockResolvedValue(0),
  };
}

export const mockPrisma = {
  quiz: createModelMock(),
  question: createModelMock(),
  room: createModelMock(),
  player: createModelMock(),
  answer: createModelMock(),
};

vi.mock("@/app/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Mock nanoid for deterministic IDs
vi.mock("nanoid", () => ({
  nanoid: () => "test-id-1234",
}));

/** Reset all mocks between tests */
export function resetMocks() {
  for (const model of Object.values(mockPrisma)) {
    for (const fn of Object.values(model)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
  // Re-apply sensible defaults
  for (const model of Object.values(mockPrisma)) {
    model.findUnique.mockResolvedValue(null);
    model.findFirst.mockResolvedValue(null);
    model.findMany.mockResolvedValue([]);
    model.create.mockResolvedValue({});
    model.createMany.mockResolvedValue({ count: 0 });
    model.update.mockResolvedValue({});
    model.updateMany.mockResolvedValue({ count: 0 });
    model.delete.mockResolvedValue({});
    model.deleteMany.mockResolvedValue({ count: 0 });
    model.count.mockResolvedValue(0);
  }
}
