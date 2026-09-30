import "server-only";
import crypto from "node:crypto";

type Jwk = { kid?: string; kty?: string; crv?: string; x?: string };

let jwksCache: { fetchedAt: number; keys: Jwk[] } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

function authBaseUrl(): string {
  return (process.env.NEON_AUTH_BASE_URL ?? "").replace(/\/+$/, "");
}

async function loadJwks(): Promise<Jwk[]> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const base = authBaseUrl();
  if (!base) throw new Error("NEON_AUTH_BASE_URL is not set");
  const res = await fetch(`${base}/.well-known/jwks.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`);
  const data = (await res.json()) as { keys?: Jwk[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];
  jwksCache = { fetchedAt: now, keys };
  return keys;
}

export async function verifyNeonAuthWebhook(rawBody: string, headers: Headers): Promise<unknown> {
  const signature = headers.get("x-neon-signature");
  const kid = headers.get("x-neon-signature-kid");
  const timestamp = headers.get("x-neon-timestamp");
  if (!signature || !kid || !timestamp) {
    throw new Error("Missing Neon webhook headers");
  }

  const keys = await loadJwks();
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error(`JWKS key ${kid} not found`);

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const [headerB64, emptyPayload, signatureB64] = signature.split(".");
  if (emptyPayload !== "") throw new Error("Expected detached JWS");
  if (!headerB64 || !signatureB64) throw new Error("Malformed Neon signature");

  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signaturePayload = `${timestamp}.${payloadB64}`;
  const signaturePayloadB64 = Buffer.from(signaturePayload, "utf8").toString("base64url");
  const signingInput = `${headerB64}.${signaturePayloadB64}`;
  const isValid = crypto.verify(null, Buffer.from(signingInput), publicKey, Buffer.from(signatureB64, "base64url"));
  if (!isValid) throw new Error("Invalid webhook signature");

  const ageMs = Date.now() - Number(timestamp);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) {
    throw new Error("Webhook timestamp too old");
  }

  return JSON.parse(rawBody) as unknown;
}

export type NeonAuthWebhookPayload = {
  event_type?: string;
  user?: { email?: string | null; name?: string | null };
  event_data?: {
    otp_code?: string;
    otp_type?: string;
    link_type?: string;
    link_url?: string;
  };
};
