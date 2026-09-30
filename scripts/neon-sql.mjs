/**
 * Neon client for CLI scripts (add-test-*, etc.).
 * Supports Neon cloud and local Postgres via docker-compose + local-neon-http-proxy.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { neon, neonConfig } from "@neondatabase/serverless";

export function loadDatabaseUrl() {
  const p = join(process.cwd(), ".env.local");
  if (existsSync(p)) {
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      if (t.startsWith("DATABASE_URL=")) {
        let v = t.slice("DATABASE_URL=".length).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        return v;
      }
    }
  }
  return process.env.DATABASE_URL?.trim() || "";
}

function normalizeDatabaseUrl(raw) {
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

function configureLocalNeonProxy(connectionString) {
  try {
    const u = new URL(connectionString);
    const host = u.hostname.toLowerCase();
    const isLocalProxyHost = host === "db.localtest.me" || host === "localhost" || host === "127.0.0.1";
    if (!isLocalProxyHost) return;

    neonConfig.fetchEndpoint = (h) => {
      if (h === "db.localtest.me" || h === "localhost" || h === "127.0.0.1") {
        return `http://${h}:4444/sql`;
      }
      return `https://${h}/sql`;
    };
  } catch {
    // Invalid URL — getSql fails later.
  }
}

export function getScriptSql() {
  const raw = loadDatabaseUrl();
  if (!raw) {
    throw new Error("Set DATABASE_URL or create .env.local with DATABASE_URL=...");
  }
  const url = normalizeDatabaseUrl(raw);
  configureLocalNeonProxy(url);
  return neon(url);
}
