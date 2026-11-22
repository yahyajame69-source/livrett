import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticatedFromRequest, verifySameOriginRequest } from "@/lib/admin-auth";
import { deleteProduct, updateProduct, validateProductPayload } from "@/lib/products-store";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const id = context.params?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const parsed = validateProductPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await updateProduct(id, parsed.data);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ product: result.data });
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const id = context.params?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  const result = await deleteProduct(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
