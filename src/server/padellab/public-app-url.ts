import "server-only";

/** Public app URL (links in emails). No trailing slash. */
export function getPublicAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
