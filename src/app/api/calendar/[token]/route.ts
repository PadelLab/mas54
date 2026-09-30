import { NextResponse } from "next/server";
import { buildUserCalendarFeed, verifyCalendarFeedToken } from "@/server/padellab/calendar-feed";
import { getSql, withAppSql } from "@/server/padellab/neon-client";
import { bootstrapDatabase } from "@/server/padellab/seed-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const userId = verifyCalendarFeedToken(token);
  if (!userId) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const sql = getSql();
    await bootstrapDatabase(sql);
    const ics = await withAppSql({ userId }, (appSql) => buildUserCalendarFeed(appSql, userId));
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="plus54.ics"',
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/calendar]", detail);
    return new NextResponse("Calendar unavailable", { status: 500 });
  }
}
