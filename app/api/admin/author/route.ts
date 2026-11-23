import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticatedFromRequest, verifySameOriginRequest } from "@/lib/admin-auth";
import { getAuthorProfile, saveAuthorProfile, validateAuthorPayload } from "@/lib/author-store";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const author = getAuthorProfile();
  return NextResponse.json({ author });
}

export async function PATCH(req: NextRequest) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const parsed = validateAuthorPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const author = saveAuthorProfile(parsed.data);
  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({ author });
}
