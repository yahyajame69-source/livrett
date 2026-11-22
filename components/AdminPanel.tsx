"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPanel({ products }: { products: any[] }) {
  const [items, setItems] = useState(products);
  const [editing, setEditing] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = {
      title: String(f.get("title") || ""),
      description: String(f.get("description") || ""),
      price: Number(f.get("price")),
      currency: "DJF",
      age_range: String(f.get("age_range") || ""),
      cover_url: String(f.get("cover_url") || "") || null,
      is_available: f.get("is_available") === "on",
      stock: Number(f.get("stock") || 0),
    };

    try {
      const endpoint = editing?.id
        ? `/api/admin/products/${encodeURIComponent(editing.id)}`
        : "/api/admin/products";
      const res = await fetch(endpoint, {
        method: editing?.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/connexion");
          return;
        }
        setMessage(data.error || "Erreur lors de l'enregistrement.");
        setBusy(false);
        return;
      }

      const listRes = await fetch("/api/admin/products");
      if (listRes.ok) {
        const listData = await listRes.json();
        setItems(listData.products || []);
      }
      if (!editing?.id) {
        form.reset();
      }
      setEditing(null);
      setMessage("Produit enregistré.");
      router.refresh();
    } catch {
      setMessage("Erreur réseau lors de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/connexion");
          return;
        }
        setMessage(data.error || "Suppression impossible.");
        setBusy(false);
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      setConfirmDeleteId(null);
      setMessage("Produit supprimé.");
      router.refresh();
    } catch {
      setMessage("Erreur réseau lors de la suppression.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    router.push("/connexion");
    router.refresh();
  }

  return (
    <main className="admin">
      <div className="wrap">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 15,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="brand">Le Monde des Petits Livres</div>
            <h1>Tableau de bord</h1>
            <p className="muted">Gestion du catalogue et des disponibilités.</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a className="btn outline" href="/">
              Voir la boutique
            </a>
            <button className="btn outline" onClick={logout}>
              Déconnexion
            </button>
          </div>
        </div>
        {message && <p className="notice">{message}</p>}
        <div className="row" style={{ margin: "22px 0" }}>
          <div className="panel">
            <div className="muted">Produits enregistrés</div>
            <h2>{items.length}</h2>
          </div>
          <div className="panel">
            <div className="muted">Produits disponibles</div>
            <h2>{items.filter((p) => p.is_available).length}</h2>
          </div>
        </div>
        <div className="row" style={{ alignItems: "start" }}>
          <section className="panel">
            <h2>{editing ? "Modifier le livre" : "Ajouter un livre"}</h2>
            <form key={editing?.id || "new"} className="form" onSubmit={save}>
              <label>
                Titre
                <input name="title" required defaultValue={editing?.title || ""} />
              </label>
              <label>
                Description
                <textarea name="description" defaultValue={editing?.description || ""} />
              </label>
              <div className="row">
                <label>
                  Prix (DJF)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    required
                    defaultValue={editing?.price ?? ""}
                  />
                </label>
                <label>
                  Âge conseillé
                  <input
                    name="age_range"
                    defaultValue={editing?.age_range || ""}
                    placeholder="5–10 ans"
                  />
                </label>
              </div>
              <label>
                URL de l'image de couverture
                <input
                  name="cover_url"
                  type="url"
                  defaultValue={editing?.cover_url || ""}
                  placeholder="https://..."
                />
              </label>
              <label>
                Quantité en stock
                <input
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={editing?.stock ?? 0}
                />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  name="is_available"
                  type="checkbox"
                  defaultChecked={editing ? editing.is_available : true}
                  style={{ width: 18 }}
                />{" "}
                Disponible dans la boutique
              </label>
              <button className="btn" disabled={busy}>
                {editing ? "Enregistrer les modifications" : "Publier le produit"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => setEditing(null)}
                >
                  Annuler
                </button>
              )}
            </form>
          </section>
          <section className="panel">
            <h2>Catalogue</h2>
            {items.length === 0 ? (
              <p className="muted">Aucun produit enregistré.</p>
            ) : (
              items.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: "13px 0",
                    borderBottom: "1px solid #eee",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>{p.title}</strong>
                    <div className="muted">
                      {p.price} DJF · {p.is_available ? "Disponible" : "Indisponible"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn outline"
                      onClick={() => setEditing(p)}
                    >
                      Modifier
                    </button>
                    {confirmDeleteId === p.id ? (
                      <>
                        <button
                          type="button"
                          className="btn danger"
                          disabled={busy}
                          onClick={() => remove(p.id)}
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          className="btn outline"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => setConfirmDeleteId(p.id)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
        <p className="muted" style={{ marginTop: 25 }}>
          Les commandes sont reçues directement sur WhatsApp. Les demandes peuvent être suivies dans la conversation WhatsApp Business.
        </p>
      </div>
    </main>
  );
}