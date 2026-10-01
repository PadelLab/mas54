import "server-only";

/** Production site used in emails when env still has a tunnel or localhost. */
const PRODUCTION_APP_URL = "https://mas54.vercel.app";

function hostnameOf(raw: string): string | null {
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(withProto).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Cloudflare quick tunnels, ngrok, etc. must never appear in credential emails. */
function isEphemeralPublicHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".trycloudflare.com") ||
    host === "trycloudflare.com" ||
    host.endsWith(".ngrok-free.app") ||
    host.endsWith(".ngrok.app") ||
    host.endsWith(".ngrok.io") ||
    host.endsWith(".loca.lt")
  );
}

function normalizePublicUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  const withProto = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const host = hostnameOf(withProto);
  if (!host || isEphemeralPublicHost(host)) return null;
  try {
    return new URL(withProto).origin;
  } catch {
    return null;
  }
}

/** Public URL for email links and calendar feeds. Never a Cloudflare/ngrok tunnel. */
export function getPublicAppUrl(): string {
  const fromExplicit = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL ?? "");
  if (fromExplicit) return fromExplicit;

  const fromProduction = normalizePublicUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "");
  if (fromProduction) return fromProduction;

  if (process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production") {
    const fromDeployment = normalizePublicUrl(process.env.VERCEL_URL ?? "");
    if (fromDeployment) return fromDeployment;
  }

  if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
    return "http://localhost:3000";
  }

  return PRODUCTION_APP_URL;
}
