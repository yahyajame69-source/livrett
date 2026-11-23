import { isAdminAuthenticatedFromCookies } from "@/lib/admin-auth";
import { getSupabaseSyncStatus, listAllProducts } from "@/lib/products-store";
import AdminGate from "@/components/AdminGate";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const cookieAuthed = isAdminAuthenticatedFromCookies();
  const [products, syncStatus] = cookieAuthed
    ? await Promise.all([listAllProducts(), getSupabaseSyncStatus()])
    : [[], null];

  return (
    <AdminGate
      initialAuthenticated={cookieAuthed}
      initialProducts={products}
      initialSyncStatus={syncStatus}
    />
  );
}