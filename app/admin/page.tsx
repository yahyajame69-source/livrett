import { isAdminAuthenticatedFromCookies } from "@/lib/admin-auth";
import { listAllProducts } from "@/lib/products-store";
import AdminGate from "@/components/AdminGate";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const cookieAuthed = isAdminAuthenticatedFromCookies();
  const products = cookieAuthed ? await listAllProducts() : [];

  return (
    <AdminGate
      initialAuthenticated={cookieAuthed}
      initialProducts={products}
    />
  );
}