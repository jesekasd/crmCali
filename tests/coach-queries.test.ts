import test from "node:test";
import assert from "node:assert/strict";
import { listCoachPaymentsPage, listCoachProgressPage, listCoachStudentsPage } from "@/lib/coach/queries";
import { Payment, ProgressEntry, Student } from "@/types/domain";

type Operation = {
  method: string;
  args: unknown[];
};

class FakeQuery<T> implements PromiseLike<{ data: T[]; error: null }> {
  operations: Operation[] = [];

  constructor(private readonly rows: T[]) {}

  select(...args: unknown[]) {
    this.operations.push({ method: "select", args });
    return this;
  }

  eq(...args: unknown[]) {
    this.operations.push({ method: "eq", args });
    return this;
  }

  neq(...args: unknown[]) {
    this.operations.push({ method: "neq", args });
    return this;
  }

  in(...args: unknown[]) {
    this.operations.push({ method: "in", args });
    return this;
  }

  order(...args: unknown[]) {
    this.operations.push({ method: "order", args });
    return this;
  }

  range(...args: unknown[]) {
    this.operations.push({ method: "range", args });
    return this;
  }

  gte(...args: unknown[]) {
    this.operations.push({ method: "gte", args });
    return this;
  }

  lte(...args: unknown[]) {
    this.operations.push({ method: "lte", args });
    return this;
  }

  or(...args: unknown[]) {
    this.operations.push({ method: "or", args });
    return this;
  }

  then<TResult1 = { data: T[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.rows, error: null }).then(onfulfilled, onrejected);
  }
}

class FakeSupabase {
  queries: FakeQuery<unknown>[] = [];
  private readonly tableQueues: Record<string, unknown[][]>;

  constructor(tableQueues: Record<string, unknown[][]>) {
    this.tableQueues = Object.fromEntries(
      Object.entries(tableQueues).map(([table, rows]) => [table, rows.map((rowSet) => [...rowSet])])
    );
  }

  from(table: string) {
    const rows = this.tableQueues[table]?.shift() ?? [];
    const query = new FakeQuery(rows);
    this.queries.push(query);
    return query;
  }
}

function hasOperation(query: FakeQuery<unknown>, method: string, ...args: unknown[]) {
  return query.operations.some((operation) => {
    if (operation.method !== method || operation.args.length !== args.length) {
      return false;
    }

    return operation.args.every((value, index) => Object.is(value, args[index]));
  });
}

const studentsFixture: Student[] = [
  {
    id: "student-1",
    coach_id: "coach-1",
    name: "Alicia",
    level: "intermediate",
    goal: "Handstand",
    start_date: "2026-01-01",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "student-2",
    coach_id: "coach-1",
    name: "Bruno",
    level: "advanced",
    goal: "Planche",
    start_date: "2026-01-02",
    status: "inactive",
    created_at: "2026-01-02T00:00:00.000Z"
  },
  {
    id: "student-3",
    coach_id: "coach-1",
    name: "Clara",
    level: "beginner",
    goal: "Muscle up",
    start_date: "2026-01-03",
    status: "active",
    created_at: "2026-01-03T00:00:00.000Z"
  }
];

test("listCoachStudentsPage excludes archived by default and applies search filters", async () => {
  const supabase = new FakeSupabase({ students: [studentsFixture] });
  const result = await listCoachStudentsPage({
    supabase,
    coachId: "coach-1",
    page: 2,
    pageSize: 2,
    search: "planche",
    status: "all"
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.hasNextPage, true);

  const [query] = supabase.queries;
  assert.ok(query instanceof FakeQuery);
  assert.ok(hasOperation(query, "eq", "coach_id", "coach-1"));
  assert.ok(hasOperation(query, "neq", "status", "archived"));
  assert.ok(hasOperation(query, "range", 2, 4));
  assert.ok(hasOperation(query, "or", "name.ilike.%planche%,goal.ilike.%planche%,level.ilike.%planche%"));
});

test("listCoachStudentsPage allows explicit archived filter without default exclusion", async () => {
  const supabase = new FakeSupabase({ students: [[]] });

  await listCoachStudentsPage({
    supabase,
    coachId: "coach-1",
    page: 1,
    pageSize: 12,
    search: "",
    status: "archived"
  });

  const [query] = supabase.queries;
  assert.ok(query instanceof FakeQuery);
  assert.ok(hasOperation(query, "eq", "status", "archived"));
  assert.equal(query.operations.some((operation) => operation.method === "neq"), false);
});

test("listCoachProgressPage scopes both history and chart queries", async () => {
  const historyRows: ProgressEntry[] = [
    {
      id: "progress-1",
      student_id: "student-1",
      pullups: 10,
      pushups: 20,
      muscle_ups: 1,
      handstand_seconds: 15,
      date: "2026-03-09",
      created_at: "2026-03-09T00:00:00.000Z"
    },
    {
      id: "progress-2",
      student_id: "student-1",
      pullups: 11,
      pushups: 21,
      muscle_ups: 1,
      handstand_seconds: 16,
      date: "2026-03-08",
      created_at: "2026-03-08T00:00:00.000Z"
    },
    {
      id: "progress-3",
      student_id: "student-1",
      pullups: 12,
      pushups: 22,
      muscle_ups: 1,
      handstand_seconds: 17,
      date: "2026-03-07",
      created_at: "2026-03-07T00:00:00.000Z"
    }
  ];

  const chartRows = historyRows.slice(0, 2);
  const supabase = new FakeSupabase({ progress: [historyRows, chartRows] });
  const result = await listCoachProgressPage({
    supabase,
    studentId: "student-1",
    page: 2,
    pageSize: 2,
    startDate: "2026-03-01",
    endDate: "2026-03-09",
    chartLimit: 2
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.hasNextPage, true);
  assert.equal(result.chartEntries.length, 2);

  const [historyQuery, chartQuery] = supabase.queries;
  assert.ok(historyQuery instanceof FakeQuery);
  assert.ok(chartQuery instanceof FakeQuery);
  assert.ok(hasOperation(historyQuery, "eq", "student_id", "student-1"));
  assert.ok(hasOperation(historyQuery, "range", 2, 4));
  assert.ok(hasOperation(historyQuery, "gte", "date", "2026-03-01"));
  assert.ok(hasOperation(historyQuery, "lte", "date", "2026-03-09"));
  assert.ok(hasOperation(chartQuery, "range", 0, 1));
});

test("listCoachPaymentsPage returns zeroed summary when no students are scoped", async () => {
  const supabase = new FakeSupabase({});
  const result = await listCoachPaymentsPage({
    supabase,
    studentIds: [],
    page: 1,
    pageSize: 20,
    startDate: "2026-03-01",
    endDate: "2026-03-09",
    status: "all"
  });

  assert.deepEqual(result, {
    items: [],
    hasNextPage: false,
    summary: {
      monthlyRevenue: 0,
      pendingCount: 0,
      overdueCount: 0
    }
  });
  assert.equal(supabase.queries.length, 0);
});

test("listCoachPaymentsPage applies status to the page query and computes summary metrics", async () => {
  const pageRows: Payment[] = [
    {
      id: "payment-1",
      student_id: "student-1",
      amount: 30,
      status: "pending",
      date: "2026-03-08",
      created_at: "2026-03-08T00:00:00.000Z"
    },
    {
      id: "payment-2",
      student_id: "student-2",
      amount: 20,
      status: "pending",
      date: "2026-03-07",
      created_at: "2026-03-07T00:00:00.000Z"
    },
    {
      id: "payment-3",
      student_id: "student-3",
      amount: 10,
      status: "pending",
      date: "2026-03-06",
      created_at: "2026-03-06T00:00:00.000Z"
    }
  ];

  const summaryRows: Payment[] = [
    {
      id: "payment-4",
      student_id: "student-1",
      amount: 80,
      status: "paid",
      date: "2026-03-02",
      created_at: "2026-03-02T00:00:00.000Z"
    },
    {
      id: "payment-5",
      student_id: "student-2",
      amount: 15,
      status: "pending",
      date: "2026-03-03",
      created_at: "2026-03-03T00:00:00.000Z"
    },
    {
      id: "payment-6",
      student_id: "student-3",
      amount: 25,
      status: "overdue",
      date: "2026-03-04",
      created_at: "2026-03-04T00:00:00.000Z"
    }
  ];

  const supabase = new FakeSupabase({ payments: [pageRows, summaryRows] });
  const result = await listCoachPaymentsPage({
    supabase,
    studentIds: ["student-1", "student-2", "student-3"],
    page: 1,
    pageSize: 2,
    startDate: "2026-03-01",
    endDate: "2026-03-09",
    status: "pending",
    referenceDate: "2026-03-09"
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.hasNextPage, true);
  assert.equal(result.summary.monthlyRevenue, 80);
  assert.equal(result.summary.pendingCount, 1);
  assert.equal(result.summary.overdueCount, 1);

  const [pageQuery, summaryQuery] = supabase.queries;
  assert.ok(pageQuery instanceof FakeQuery);
  assert.ok(summaryQuery instanceof FakeQuery);
  assert.ok(hasOperation(pageQuery, "eq", "status", "pending"));
  assert.equal(summaryQuery.operations.some((operation) => operation.method === "eq" && operation.args[0] === "status"), false);
  assert.ok(hasOperation(pageQuery, "gte", "date", "2026-03-01"));
  assert.ok(hasOperation(summaryQuery, "lte", "date", "2026-03-09"));
});
