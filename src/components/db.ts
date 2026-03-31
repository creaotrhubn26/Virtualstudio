import { sql } from 'drizzle-orm';

export interface DbRecord {
  id: number;
  data: Record<string, unknown>;
  created_at: string;
}

type QueryResult<T = DbRecord> = {
  rows: T[];
  rowCount: number;
};

const createMockDb = () => ({
  select: () => ({
    from: (_table: unknown) => ({
      where: (_cond: unknown) => Promise.resolve([] as DbRecord[]),
      limit: (_n: number) => Promise.resolve([] as DbRecord[]),
      orderBy: (_col: unknown) => Promise.resolve([] as DbRecord[]),
    }),
  }),
  insert: (_table: unknown) => ({
    values: (_data: unknown) => ({
      returning: () => Promise.resolve([] as DbRecord[]),
    }),
  }),
  update: (_table: unknown) => ({
    set: (_data: unknown) => ({
      where: (_cond: unknown) => Promise.resolve([] as DbRecord[]),
    }),
  }),
  delete: (_table: unknown) => ({
    where: (_cond: unknown) => Promise.resolve([] as DbRecord[]),
  }),
  execute: (_query: ReturnType<typeof sql>) => Promise.resolve({ rows: [], rowCount: 0 } as QueryResult),
});

export const db = createMockDb();
export type Db = ReturnType<typeof createMockDb>;
export default db;
