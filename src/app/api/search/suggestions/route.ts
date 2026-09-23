import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/catalog";
import { checkRateLimits, getClientKey } from "@/server/rate-limit";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ suggestions: [] });

  const limit = await checkRateLimits([{ key: `search:ip:${await getClientKey()}`, limit: 60, windowSeconds: 60 }]);
  if (!limit.ok) return NextResponse.json({ suggestions: [] }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  const suggestions = await getSearchSuggestions(q.slice(0, 80));
  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "private, max-age=15" } });
}
