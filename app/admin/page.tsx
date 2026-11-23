import { isAdminAuthenticatedFromCookies } from "@/lib/admin-auth";
import { getAuthorProfile } from "@/lib/author-store";
import { getSupabaseSyncStatus, listAllProducts } from "@/lib/products-store";
import AdminGate from "@/components/AdminGate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Admin() {
  const cookieAuthed = isAdminAuthenticatedFromCookies();
  const [products, syncStatus, author] = cookieAuthed
    ? await Promise.all([
        listAllProducts(),
        getSupabaseSyncStatus(),
        Promise.resolve(getAuthorProfile()),
      ])
    : [[], null, null];

  return (
    <AdminGate
      initialAuthenticated={cookieAuthed}
      initialProducts={products}
      initialSyncStatus={syncStatus}
      initialAuthor={author}
    />
  );
}