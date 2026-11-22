import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticatedFromRequest, verifySameOriginRequest } from "@/lib/admin-auth";
import { createProduct, listAllProducts, validateProductPayload } from "@/lib/products-store";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const products = await listAllProducts();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
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

  const parsed = validateProductPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await createProduct(parsed.data);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ product: result.data }, { status: 201 });
}
