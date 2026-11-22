import { NextRequest, NextResponse } from "next/server";
import { buildSessionSetCookieHeader, verifySameOriginRequest } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildSessionSetCookieHeader(req, "", 0));
  return res;
}
