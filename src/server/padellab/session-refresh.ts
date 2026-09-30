import "server-only";
import type { NextRequest } from "next/server";

import { requestSessionToken } from "./request-session";
import { formatSessionCookieValue, parseSessionCookieValue } from "./session-cookie";

/**
 * Re-sign `padellab_session` for a user who already has a cookie (even if the version is stale).
 * Used during in-app password reset so abandoning the flow does not leave a broken session.
 */
export function refreshSessionCookieForRequestUser(
  req: NextRequest,
  user: { id: string; session_version: number },
): string | null {
  const parsed = parseSessionCookieValue(requestSessionToken(req));
  if (!parsed || parsed.userId !== user.id) return null;
  return formatSessionCookieValue(user.id, user.session_version);
}
