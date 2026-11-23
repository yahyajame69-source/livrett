"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_AUTHOR_PROFILE, type AuthorProfile } from "@/lib/author-defaults";
import type { SupabaseSyncStatus } from "@/lib/products-store";
import { useAdminSession } from "./AdminSessionProvider";
import AdminPanel from "./AdminPanel";

export default function AdminGate({
  initialAuthenticated,
  initialProducts,
  initialSyncStatus,
  initialAuthor,
}: {
  initialAuthenticated: boolean;
  initialProducts: any[];
  initialSyncStatus: SupabaseSyncStatus | null;
  initialAuthor: AuthorProfile | null;
}) {
  const { token, clearToken } = useAdminSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(initialAuthenticated);
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [syncStatus, setSyncStatus] = useState<SupabaseSyncStatus | null>(initialSyncStatus);
  const [author, setAuthor] = useState<AuthorProfile>(initialAuthor || DEFAULT_AUTHOR_PROFILE);
  const [checking, setChecking] = useState(!initialAuthenticated);

  useEffect(() => {
    if (initialAuthenticated) {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    if (!token) {
      router.replace("/connexion");
      return;
    }

    let active = true;
    Promise.all([
      fetch("/api/admin/products", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/author", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([prodRes, authRes]) => {
        if (!active) return;
        if (!prodRes.ok) {
          clearToken();
          router.replace("/connexion");
          return;
        }
        const prodData = await prodRes.json().catch(() => ({}));
        const authData = authRes.ok ? await authRes.json().catch(() => ({})) : {};
        if (!active) return;
        setProducts(Array.isArray(prodData.products) ? prodData.products : []);
        setSyncStatus(prodData.syncStatus || null);
        if (authData?.author) {
          setAuthor(authData.author);
        }
        setAuthorized(true);
        setChecking(false);
      })
      .catch(() => {
        if (active) {
          router.replace("/connexion");
        }
      });

    return () => {
      active = false;
    };
  }, [initialAuthenticated, token, clearToken, router]);

  if (checking || !authorized) {
    return (
      <main className="admin connexionMain">
        <div className="wrap" style={{ maxWidth: 460 }}>
          <div className="panel connexionPanel">
            <div className="brand">Le Monde des Petits Livres</div>
            <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
              Vérification de la session administrateur…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <AdminPanel
      products={products}
      initialSyncStatus={syncStatus}
      initialAuthor={author}
    />
  );
}
