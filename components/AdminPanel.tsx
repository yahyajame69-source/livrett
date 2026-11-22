"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useAdminSession } from "./AdminSessionProvider";
import BookMockup from "./BookMockup";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_RAW_BYTES = 12 * 1024 * 1024;
const TARGET_W = 540;
const TARGET_H = 960;

async function processCoverFileTo9x16(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Format non pris en charge. Utilisez un fichier JPG, PNG ou WebP.");
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new Error("L'image est trop volumineuse (12 Mo maximum).");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Impossible de lire cette image."));
      el.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Traitement d'image indisponible dans ce navigateur.");
    }

    const srcRatio = img.naturalWidth / img.naturalHeight;
    const dstRatio = TARGET_W / TARGET_H;
    let sx = 0;
    let sy = 0;
    let sWidth = img.naturalWidth;
    let sHeight = img.naturalHeight;

    if (srcRatio > dstRatio) {
      sWidth = img.naturalHeight * dstRatio;
      sx = (img.naturalWidth - sWidth) / 2;
    } else {
      sHeight = img.naturalWidth / dstRatio;
      sy = (img.naturalHeight - sHeight) / 2;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);

    let dataUrl = canvas.toDataURL("image/webp", 0.86);
    if (!dataUrl.startsWith("data:image/webp") || dataUrl.length > 1_200_000) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.86);
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function AdminPanel({ products }: { products: any[] }) {
  const [items, setItems] = useState(products);
  const [editing, setEditing] = useState<any>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [titlePreview, setTitlePreview] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const formSectionRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { token, clearToken } = useAdminSession();
  const router = useRouter();

  const isUploadedDataUrl = coverUrl.startsWith("data:image/");

  const authHeaders = (withJson = false): Record<string, string> => {
    const headers: Record<string, string> = {
      "X-Requested-With": "XMLHttpRequest",
    };
    if (withJson) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  async function handleFileSelected(file: File | null | undefined) {
    if (!file) return;
    setProcessingImage(true);
    setMessage("");
    setIsError(false);
    try {
      const encoded = await processCoverFileTo9x16(file);
      setCoverUrl(encoded);
    } catch (err: any) {
      setIsError(true);
      setMessage(err?.message || "Impossible de préparer l'image.");
    } finally {
      setProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setIsError(false);
    const form = e.currentTarget;
    const f = new FormData(form);
    const payload = {
      title: String(f.get("title") || ""),
      description: String(f.get("description") || ""),
      price: Number(f.get("price")),
      currency: "DJF",
      age_range: String(f.get("age_range") || ""),
      cover_url: coverUrl.trim() || null,
      is_available: f.get("is_available") === "on",
      stock: Number(f.get("stock") || 0),
    };

    try {
      const endpoint = editing?.id
        ? `/api/admin/products/${encodeURIComponent(editing.id)}`
        : "/api/admin/products";
      const res = await fetch(endpoint, {
        method: editing?.id ? "PATCH" : "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          clearToken();
          router.push("/connexion");
          return;
        }
        setIsError(true);
        setMessage(data.error || "Erreur lors de l'enregistrement.");
        setBusy(false);
        return;
      }

      const listRes = await fetch("/api/admin/products", {
        cache: "no-store",
        headers: authHeaders(false),
      });
      if (listRes.ok) {
        const listData = await listRes.json().catch(() => ({}));
        setItems(listData.products || []);
      }
      if (!editing?.id) {
        form.reset();
      }
      setEditing(null);
      setCoverUrl("");
      setTitlePreview("");
      setIsError(false);
      setMessage("Produit enregistré.");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Erreur réseau lors de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders(false),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          clearToken();
          router.push("/connexion");
          return;
        }
        setIsError(true);
        setMessage(data.error || "Suppression impossible.");
        setBusy(false);
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (editing?.id === id) {
        setEditing(null);
        setCoverUrl("");
        setTitlePreview("");
      }
      setConfirmDeleteId(null);
      setIsError(false);
      setMessage("Produit supprimé.");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage("Erreur réseau lors de la suppression.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    clearToken();
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: authHeaders(false),
      });
    } finally {
      router.push("/connexion");
      router.refresh();
    }
  }

  const startEditing = (product: any) => {
    setEditing(product);
    setCoverUrl(product.cover_url || "");
    setTitlePreview(product.title || "");
    setConfirmDeleteId(null);
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const cancelEditing = () => {
    setEditing(null);
    setCoverUrl("");
    setTitlePreview("");
  };

  return (
    <main className="admin">
      <div className="wrap">
        <div className="adminTopbar">
          <div>
            <div className="brand">Le Monde des Petits Livres</div>
            <h1 style={{ margin: "6px 0 4px" }}>Tableau de bord</h1>
            <p className="muted" style={{ margin: 0 }}>
              Gestion du catalogue et des disponibilités.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link className="btn outline" href="/">
              Voir la boutique
            </Link>
            <button type="button" className="btn outline" disabled={busy} onClick={logout}>
              Déconnexion
            </button>
          </div>
        </div>
        {message && (
          <p className={isError ? "errorBox" : "notice"} role="status">
            {message}
          </p>
        )}
        <div className="row" style={{ margin: "22px 0" }}>
          <div className="panel">
            <div className="muted">Produits enregistrés</div>
            <h2 style={{ margin: "8px 0 0", fontVariantNumeric: "tabular-nums" }}>{items.length}</h2>
          </div>
          <div className="panel">
            <div className="muted">Produits disponibles</div>
            <h2 style={{ margin: "8px 0 0", fontVariantNumeric: "tabular-nums" }}>
              {items.filter((p) => p.is_available).length}
            </h2>
          </div>
        </div>
        <div className="row" style={{ alignItems: "start" }}>
          <section ref={formSectionRef} className="panel">
            <h2 style={{ marginTop: 0 }}>{editing ? "Modifier le livre" : "Ajouter un livre"}</h2>
            <form key={editing?.id || "new"} className="form" onSubmit={save}>
              <label>
                Titre
                <input
                  name="title"
                  required
                  maxLength={200}
                  defaultValue={editing?.title || ""}
                  onChange={(e) => setTitlePreview(e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea name="description" maxLength={2000} defaultValue={editing?.description || ""} />
              </label>
              <div className="row">
                <label>
                  Prix (DJF)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={editing?.price ?? ""}
                  />
                </label>
                <label>
                  Âge conseillé
                  <input
                    name="age_range"
                    maxLength={80}
                    defaultValue={editing?.age_range || ""}
                    placeholder="5–10 ans"
                  />
                </label>
              </div>

              <div>
                <div className="pinLabel">Couverture du livre (format 9:16 en 3D)</div>
                <div className="coverUploadLayout">
                  <div
                    className={dragging ? "coverDropzone isDragging" : "coverDropzone"}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      handleFileSelected(e.dataTransfer.files?.[0]);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="srOnlyInput"
                      onChange={(e) => handleFileSelected(e.target.files?.[0])}
                    />
                    <ImagePlus size={22} aria-hidden="true" />
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {processingImage
                        ? "Préparation 9:16…"
                        : "Importer une couverture depuis votre PC"}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      PNG, JPG ou WebP · recadrée automatiquement en 9:16
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                      <button
                        type="button"
                        className="btn outline"
                        style={{ padding: "8px 14px", fontSize: 12 }}
                        disabled={busy || processingImage}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} style={{ marginRight: 6 }} />
                        Choisir un fichier
                      </button>
                      {coverUrl && (
                        <button
                          type="button"
                          className="btn outline"
                          style={{ padding: "8px 12px", fontSize: 12 }}
                          disabled={busy}
                          onClick={() => setCoverUrl("")}
                        >
                          <Trash2 size={14} style={{ marginRight: 5 }} />
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="coverPreview3d" aria-label="Aperçu 3D du livre">
                    <BookMockup
                      title={titlePreview || editing?.title || "Aperçu 3D"}
                      coverUrl={coverUrl || null}
                    />
                  </div>
                </div>
                {!isUploadedDataUrl && (
                  <label style={{ display: "block", marginTop: 10 }}>
                    Ou URL de l'image de couverture
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://..."
                      style={{ marginTop: 6 }}
                    />
                  </label>
                )}
              </div>

              <label>
                Quantité en stock
                <input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
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
              <button className="btn" disabled={busy || processingImage}>
                {busy
                  ? "Enregistrement…"
                  : editing
                  ? "Enregistrer les modifications"
                  : "Publier le produit"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="btn outline"
                  disabled={busy}
                  onClick={cancelEditing}
                >
                  Annuler
                </button>
              )}
            </form>
          </section>
          <section className="panel">
            <h2 style={{ marginTop: 0 }}>Catalogue</h2>
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
                    <div className="muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {Number(p.price).toLocaleString("fr-FR")} {p.currency || "DJF"} ·{" "}
                      {p.is_available ? "Disponible" : "Indisponible"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn outline"
                      disabled={busy}
                      onClick={() => startEditing(p)}
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
                          disabled={busy}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn danger"
                        disabled={busy}
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