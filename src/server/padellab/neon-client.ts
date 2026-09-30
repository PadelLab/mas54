import "server-only";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { parseSessionCookieValue } from "./session-cookie";

export type Sql = ReturnType<typeof neon>;

/**
 * `channel_binding=require` (sometimes suggested by the Neon dashboard) often fails with the
 * HTTP `@neondatabase/serverless` driver. We drop the parameter so the client connects with normal SCRAM.
 */
export function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    u.searchParams.delete("channel_binding");
    let out = u.toString();
    out = out.replace(/\?$/, "");
    return out;
  } catch {
    return trimmed
      .replace(/([?&])channel_binding=[^&]*/gi, "$1")
      .replace(/\?&/g, "?")
      .replace(/[?&]$/g, "");
  }
}

let _sql: Sql | null = null;
let _lastNormalizedUrl: string | null = null;
let _pool: Pool | null = null;
let _poolUrl: string | null = null;
let _wsConfigured = false;

function configureLocalNeonProxy(connectionString: string) {
  try {
    const u = new URL(connectionString);
    const host = u.hostname.toLowerCase();
    const isLocalProxyHost = host === "db.localtest.me" || host === "localhost" || host === "127.0.0.1";
    if (!isLocalProxyHost) return;

    neonConfig.fetchEndpoint = () => "http://127.0.0.1:4444/sql";
  } catch {
    // Ignore malformed URLs here; validation happens in getSql.
  }
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function isPoolConnectTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; code?: number | string; message?: string };
  return (
    e.name === "TimeoutError" ||
    e.code === 23 ||
    e.code === "ETIMEDOUT" ||
    /timeout|aborted/i.test(e.message ?? "")
  );
}

function resolvedDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw?.trim()) {
    throw new Error("DATABASE_URL não está definido. Configure a connection string do Neon.");
  }
  const url = normalizeDatabaseUrl(raw);
  if (!url) {
    throw new Error("DATABASE_URL está vazio após normalização.");
  }
  return url;
}

export function getSql(): Sql {
  const url = resolvedDatabaseUrl();
  if (_sql && _lastNormalizedUrl === url) {
    return _sql;
  }
  configureLocalNeonProxy(url);
  _lastNormalizedUrl = url;
  _sql = neon(url);
  return _sql;
}

async function configureLocalPoolWebSocket() {
  if (_wsConfigured || isVercelRuntime()) return;
  const { default: WS } = await import("ws");
  neonConfig.webSocketConstructor = WS;
  _wsConfigured = true;
}

function getPool(): Pool {
  const url = resolvedDatabaseUrl();
  if (_pool && _poolUrl === url) return _pool;
  configureLocalNeonProxy(url);
  _poolUrl = url;
  _pool = new Pool({
    connectionString: url,
    max: 4,
    idleTimeoutMillis: 5 * 60_000,
    connectionTimeoutMillis: 12_000,
  });
  _pool.on("error", (err: Error) => {
    console.error("[neon pool]", err.message);
  });
  return _pool;
}

async function connectAppClient() {
  await configureLocalPoolWebSocket();
  const pool = getPool();
  try {
    return await pool.connect();
  } catch (first) {
    if (!isPoolConnectTimeout(first)) throw first;
    return await pool.connect();
  }
}

type QueryClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

function taggedFromParts(strings: TemplateStringsArray, values: unknown[]) {
  let text = String(strings[0] ?? "");
  const params: unknown[] = [];
  for (let i = 0; i < values.length; i++) {
    params.push(values[i] === undefined ? null : values[i]);
    text += `$${params.length}${strings[i + 1] ?? ""}`;
  }
  return { text, params };
}

function makeTaggedSql(client: QueryClient): Sql {
  /** A Postgres connection does not accept parallel queries (`Promise.all`). */
  let queue: Promise<unknown> = Promise.resolve();
  const fn = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const { text, params } = taggedFromParts(strings, values);
    const run = queue.then(async () => {
      const result = await client.query(text, params);
      return result.rows;
    });
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }) as Sql;
  return fn;
}

/**
 * Serverless (Vercel): each query is one HTTP transaction with session GUCs +
 * `padellab_app`. The `ws` Pool crashes on Lambda (`mask is not a function`).
 */
function makeHttpRlsSql(httpSql: Sql, userId: string, role: string): Sql {
  let queue: Promise<unknown> = Promise.resolve();
  const fn = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const { text, params } = taggedFromParts(strings, values);
    const run = queue.then(async () => {
      const results = await httpSql.transaction((txn) => [
        txn`SELECT set_config('app.user_id', ${userId}, true), set_config('app.user_role', ${role}, true)`,
        txn.query("SET LOCAL ROLE padellab_app"),
        txn.query(text, params),
      ]);
      return results[2];
    });
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }) as Sql;
  return fn;
}

export type AppSqlContext = {
  sessionCookie?: string | null;
  /** Identity already known (e.g. signed calendar feed). */
  userId?: string | null;
};

/**
 * Run queries as `padellab_app` (does not own the tables and has no BYPASSRLS)
 * with `app.user_id` / `app.user_role`. Migrations should use `getSql()` (`neondb_owner`).
 */
export async function withAppSql<T>(ctx: AppSqlContext, fn: (sql: Sql) => Promise<T>): Promise<T> {
  const parsed = parseSessionCookieValue(ctx.sessionCookie ?? null);
  const userId = (ctx.userId ?? parsed?.userId ?? "").trim();

  if (isVercelRuntime()) {
    const httpSql = getSql();
    let role = "anon";
    if (userId) {
      const found = (await httpSql`
        SELECT role::text AS role FROM users WHERE id = ${userId} LIMIT 1
      `) as { role: string }[];
      role = found[0]?.role || "anon";
    }
    return fn(makeHttpRlsSql(httpSql, userId, role));
  }

  const client = await connectAppClient();
  const sql = makeTaggedSql(client);
  try {
    await client.query("BEGIN");
    let role = "anon";
    if (userId) {
      const found = (await client.query("SELECT role::text AS role FROM users WHERE id = $1 LIMIT 1", [userId])) as {
        rows: { role: string }[];
      };
      role = found.rows[0]?.role || "anon";
    }
    await client.query("SET LOCAL ROLE padellab_app");
    await client.query("SELECT set_config('app.user_id', $1, true), set_config('app.user_role', $2, true)", [
      userId,
      role,
    ]);
    const result = await fn(sql);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
}
