import { redirect } from "next/navigation";
import { isAdminAuthenticatedFromCookies } from "@/lib/admin-auth";
import { listAllProducts } from "@/lib/products-store";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!isAdminAuthenticatedFromCookies()) {
    redirect("/connexion");
  }
  const products = await listAllProducts();
  return <AdminPanel products={products} />;
}