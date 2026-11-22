import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionSetCookieHeader,
  checkRateLimit,
  claimInitialAdminCode,
  clearFailedAttempts,
  getClientKey,
  isAdminAuthenticatedFromRequest,
  isAdminCodeConfigured,
  isValidSixDigitCode,
  recordFailedAttempt,
  signAdminSessionToken,
  verifyAdminCode,
  verifySameOriginRequest,
} from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    configured: isAdminCodeConfigured(),
    authenticated: isAdminAuthenticatedFromRequest(req),
  });
}

export async function POST(req: NextRequest) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  let body: { action?: string; code?: unknown; confirmCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const action = body.action === "setup" ? "setup" : "login";

  if (action === "setup") {
    if (isAdminCodeConfigured()) {
      return NextResponse.json(
        { error: "Un code administrateur est déjà configuré." },
        { status: 409 }
      );
    }
    if (!isValidSixDigitCode(body.code)) {
      return NextResponse.json(
        { error: "Le code doit contenir exactement 6 chiffres." },
        { status: 400 }
      );
    }
    if (body.code !== body.confirmCode) {
      return NextResponse.json(
        { error: "Les deux codes à 6 chiffres ne correspondent pas." },
        { status: 400 }
      );
    }

    const claimed = claimInitialAdminCode(body.code);
    if (!claimed.ok) {
      return NextResponse.json({ error: claimed.error || "Configuration impossible." }, { status: 409 });
    }

    const token = signAdminSessionToken();
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", buildSessionSetCookieHeader(req, token));
    return res;
  }

  const clientKey = getClientKey(req);
  const limit = checkRateLimit(clientKey);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${limit.retryAfterSec} secondes.` },
      { status: 429 }
    );
  }

  if (!isAdminCodeConfigured()) {
    return NextResponse.json(
      { error: "Veuillez d'abord configurer votre code à 6 chiffres." },
      { status: 400 }
    );
  }

  if (!isValidSixDigitCode(body.code) || !verifyAdminCode(body.code)) {
    recordFailedAttempt(clientKey);
    return NextResponse.json({ error: "Code à 6 chiffres incorrect." }, { status: 401 });
  }

  clearFailedAttempts(clientKey);
  const token = signAdminSessionToken();
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildSessionSetCookieHeader(req, token));
  return res;
}
