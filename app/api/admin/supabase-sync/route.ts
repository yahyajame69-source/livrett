import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticatedFromRequest, verifySameOriginRequest } from "@/lib/admin-auth";
import {
  getSupabaseSyncStatus,
  listAllProducts,
  syncLocalProductsToSupabase,
} from "@/lib/products-store";

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const syncStatus = await getSupabaseSyncStatus();
  return NextResponse.json({ syncStatus });
}

export async function POST(req: NextRequest) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }
  if (!isAdminAuthenticatedFromRequest(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await syncLocalProductsToSupabase();
  const products = await listAllProducts();
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        syncStatus: result.syncStatus,
        products,
      },
      { status: 400 }
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return NextResponse.json({
    ok: true,
    syncedCount: result.syncedCount,
    syncStatus: result.syncStatus,
    products,
  });
}
