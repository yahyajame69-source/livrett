import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicKey, isSupabaseConfigured } from "./supabase/mock";

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  age_range: string;
  cover_url: string | null;
  stock: number;
  is_available: boolean;
  created_at: string;
}

export interface ProductInput {
  title: string;
  description: string;
  price: number;
  currency: string;
  age_range: string;
  cover_url: string | null;
  stock: number;
  is_available: boolean;
}

export interface SupabaseSyncStatus {
  configured: boolean;
  hasServiceRole: boolean;
  tableReady: boolean;
  localCount: number;
  permissionDenied?: boolean;
  keyLooksPublishable?: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), ".data");
const LOCAL_PRODUCTS_FILE = path.resolve(DATA_DIR, "products.json");

const globalForProducts = globalThis as unknown as {
  __lmdplProductsStore?: Product[];
};

function readLocalProductsFromDisk(): Product[] {
  try {
    if (!LOCAL_PRODUCTS_FILE.startsWith(DATA_DIR + path.sep)) {
      return [];
    }
    if (!fs.existsSync(LOCAL_PRODUCTS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_PRODUCTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Product[]) : [];
  } catch {
    return [];
  }
}

function writeLocalProductsToDisk(items: Product[]): void {
  try {
    if (!LOCAL_PRODUCTS_FILE.startsWith(DATA_DIR + path.sep)) {
      return;
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LOCAL_PRODUCTS_FILE, JSON.stringify(items), "utf8");
  } catch {
    // Ignore disk write errors in read-only environments
  }
}

function getLocalStore(): Product[] {
  if (!globalForProducts.__lmdplProductsStore) {
    globalForProducts.__lmdplProductsStore = readLocalProductsFromDisk();
  }
  return globalForProducts.__lmdplProductsStore;
}

function saveLocalStore(items: Product[]): void {
  globalForProducts.__lmdplProductsStore = items;
  writeLocalProductsToDisk(items);
}

function isPublishableServiceKey(key: string | undefined): boolean {
  return Boolean(key && key.trim().startsWith("sb_publishable_"));
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isSupabaseConfigured() || !url || !serviceKey || isPublishableServiceKey(serviceKey)) {
    return null;
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey = getSupabasePublicKey();
  if (!isSupabaseConfigured() || !url || !publicKey) {
    return null;
  }
  return createSupabaseClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  const msg = error.message || "";
  return /schema cache|Could not find the table|relation .* does not exist/i.test(msg);
}

export function isSupabaseFallbackError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (isMissingTableError(error)) return true;
  if (error.code === "42501" || error.code === "PGRST301") return true;
  const msg = error.message || "";
  return /permission denied|Invalid API key|JWT|fetch failed|not allowed/i.test(msg);
}

const SAFE_DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const MAX_COVER_DATA_URL_LENGTH = 1_500_000;

export function sanitizeCoverUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (SAFE_DATA_IMAGE_RE.test(trimmed) && trimmed.length <= MAX_COVER_DATA_URL_LENGTH) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function validateProductPayload(body: unknown): { ok: true; data: ProductInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Données invalides." };
  }
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title || title.length > 200) {
    return { ok: false, error: "Le titre est requis (200 caractères max)." };
  }

  const description = typeof b.description === "string" ? b.description.trim().slice(0, 2000) : "";
  const age_range = typeof b.age_range === "string" ? b.age_range.trim().slice(0, 80) : "";

  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0 || price > 10_000_000) {
    return { ok: false, error: "Le prix doit être un nombre positif valide." };
  }

  const stockRaw = Number(b.stock ?? 0);
  const stock = Number.isFinite(stockRaw) && stockRaw >= 0 ? Math.floor(stockRaw) : 0;
  const is_available = Boolean(b.is_available);

  let cover_url: string | null = null;
  if (typeof b.cover_url === "string" && b.cover_url.trim().length > 0) {
    const clean = sanitizeCoverUrl(b.cover_url);
    if (!clean) {
      return {
        ok: false,
        error: "Image de couverture invalide (importez un fichier JPG/PNG/WebP ou une URL https://).",
      };
    }
    cover_url = clean;
  }

  return {
    ok: true,
    data: {
      title,
      description,
      price,
      currency: "DJF",
      age_range,
      cover_url,
      stock,
      is_available,
    },
  };
}

export async function getSupabaseSyncStatus(): Promise<SupabaseSyncStatus> {
  const configured = isSupabaseConfigured();
  const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const keyLooksPublishable = isPublishableServiceKey(rawServiceKey);
  const adminClient = getSupabaseAdminClient();
  const publicClient = getSupabasePublicClient();
  const hasServiceRole = Boolean(adminClient);
  const localCount = getLocalStore().length;

  if (!configured) {
    return {
      configured: false,
      hasServiceRole: false,
      tableReady: false,
      localCount,
      permissionDenied: false,
      keyLooksPublishable: false,
    };
  }

  let tableReady = false;
  let permissionDenied = false;

  if (publicClient) {
    try {
      const { error } = await publicClient.from("products").select("id").limit(1);
      if (!error || error.code === "42501") {
        tableReady = true;
      } else if (isMissingTableError(error)) {
        tableReady = false;
      }
    } catch {
      // Ignore network error
    }
  }

  if (adminClient) {
    try {
      const { error } = await adminClient.from("products").select("id").limit(1);
      if (!error) {
        tableReady = true;
        permissionDenied = false;
      } else if (error.code === "42501" || /permission denied|Invalid API key/i.test(error.message || "")) {
        tableReady = true;
        permissionDenied = true;
      } else if (isMissingTableError(error)) {
        tableReady = false;
      }
    } catch {
      // Ignore network error
    }
  }

  return {
    configured,
    hasServiceRole,
    tableReady,
    localCount,
    permissionDenied,
    keyLooksPublishable,
  };
}

export async function listAvailableProducts(): Promise<Product[]> {
  const localAvailable = getLocalStore().filter((p) => p.is_available);
  const adminClient = getSupabaseAdminClient();
  const client = adminClient || getSupabasePublicClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(9);
      if (!error && Array.isArray(data)) {
        if (adminClient && localAvailable.length === 0) {
          return data as Product[];
        }
        const seen = new Set(localAvailable.map((p) => p.id));
        const merged = [
          ...localAvailable,
          ...(data as Product[]).filter((p) => !seen.has(p.id)),
        ];
        return merged.slice(0, 9);
      }
    } catch {
      // Fallback to local store
    }
  }
  return localAvailable.slice(0, 9);
}

export async function listAllProducts(): Promise<Product[]> {
  const localItems = getLocalStore();
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        if (localItems.length === 0) {
          return data as Product[];
        }
        const seen = new Set(localItems.map((p) => p.id));
        return [...localItems, ...(data as Product[]).filter((p) => !seen.has(p.id))];
      }
    } catch {
      // Fallback to local store
    }
  }
  return [...localItems];
}

export async function createProduct(input: ProductInput): Promise<{ data?: Product; error?: string; storedLocally?: boolean }> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .insert(input)
        .select()
        .single();
      if (!error) {
        return { data: data as Product };
      }
      if (!isSupabaseFallbackError(error)) {
        return { error: error.message };
      }
    } catch {
      // Fallback to local store
    }
  }

  const created: Product = {
    id: crypto.randomUUID(),
    ...input,
    created_at: new Date().toISOString(),
  };
  const updated = [created, ...getLocalStore()];
  saveLocalStore(updated);
  return { data: created, storedLocally: true };
}

export async function updateProduct(id: string, input: ProductInput): Promise<{ data?: Product; error?: string }> {
  const store = getLocalStore();
  const localIdx = store.findIndex((item) => item.id === id);

  const supabase = getSupabaseAdminClient();
  if (supabase && localIdx === -1) {
    try {
      const { data, error } = await supabase
        .from("products")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (!error) {
        return { data: data as Product };
      }
      if (!isSupabaseFallbackError(error)) {
        return { error: error.message };
      }
    } catch {
      // Fallback to local store
    }
  }

  if (localIdx === -1) {
    return { error: "Produit introuvable." };
  }
  const updatedProduct: Product = {
    ...store[localIdx],
    ...input,
  };
  const next = store.slice();
  next[localIdx] = updatedProduct;
  saveLocalStore(next);
  return { data: updatedProduct };
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const store = getLocalStore();
  const localIdx = store.findIndex((item) => item.id === id);

  if (localIdx !== -1) {
    const next = store.slice();
    next.splice(localIdx, 1);
    saveLocalStore(next);
    return {};
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (!error) {
        return {};
      }
      if (!isSupabaseFallbackError(error)) {
        return { error: error.message };
      }
    } catch {
      // Fallback
    }
  }

  return { error: "Produit introuvable." };
}

export async function syncLocalProductsToSupabase(): Promise<{
  ok: boolean;
  syncedCount: number;
  syncStatus: SupabaseSyncStatus;
  error?: string;
}> {
  const status = await getSupabaseSyncStatus();
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      ok: false,
      syncedCount: 0,
      syncStatus: status,
      error: "Clé serveur SUPABASE_SERVICE_ROLE_KEY non configurée.",
    };
  }

  if (!status.tableReady) {
    return {
      ok: false,
      syncedCount: 0,
      syncStatus: status,
      error: "La table public.products n'est pas encore créée dans Supabase. Exécutez le script SQL dans SQL Editor puis réessayez.",
    };
  }

  const localItems = getLocalStore();
  if (localItems.length === 0) {
    return { ok: true, syncedCount: 0, syncStatus: status };
  }

  const rows = localItems.map((item) => ({
    title: item.title,
    description: item.description,
    price: item.price,
    currency: item.currency || "DJF",
    age_range: item.age_range,
    cover_url: item.cover_url,
    stock: item.stock,
    is_available: item.is_available,
  }));

  const { error } = await supabase.from("products").insert(rows);
  if (error) {
    return {
      ok: false,
      syncedCount: 0,
      syncStatus: status,
      error: error.message,
    };
  }

  saveLocalStore([]);
  const nextStatus = await getSupabaseSyncStatus();
  return { ok: true, syncedCount: rows.length, syncStatus: nextStatus };
}
