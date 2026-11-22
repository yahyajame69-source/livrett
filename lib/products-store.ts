import crypto from "node:crypto";
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

const globalForProducts = globalThis as unknown as {
  __lmdplProductsStore?: Product[];
};

function getMemoryStore(): Product[] {
  if (!globalForProducts.__lmdplProductsStore) {
    globalForProducts.__lmdplProductsStore = [];
  }
  return globalForProducts.__lmdplProductsStore;
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured() || !url || !serviceKey) {
    return null;
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getSupabasePublicKey();
  if (!isSupabaseConfigured() || !url || !publicKey) {
    return null;
  }
  return createSupabaseClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function sanitizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
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
    const clean = sanitizeHttpUrl(b.cover_url);
    if (!clean) {
      return { ok: false, error: "L'URL de couverture doit commencer par https:// ou http://." };
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

export async function listAvailableProducts(): Promise<Product[]> {
  const supabase = getSupabaseAdminClient() || getSupabasePublicClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false })
        .limit(9);
      if (!error && Array.isArray(data)) {
        return data as Product[];
      }
    } catch {
      // Fallback to in-memory store
    }
  }
  return getMemoryStore()
    .filter((p) => p.is_available)
    .slice(0, 9);
}

export async function listAllProducts(): Promise<Product[]> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) {
        return data as Product[];
      }
    } catch {
      // Fallback to in-memory store
    }
  }
  return [...getMemoryStore()];
}

export async function createProduct(input: ProductInput): Promise<{ data?: Product; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .insert(input)
      .select()
      .single();
    if (error) return { error: error.message };
    return { data: data as Product };
  }

  const created: Product = {
    id: crypto.randomUUID(),
    ...input,
    created_at: new Date().toISOString(),
  };
  getMemoryStore().unshift(created);
  return { data: created };
}

export async function updateProduct(id: string, input: ProductInput): Promise<{ data?: Product; error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("products")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) return { error: error.message };
    return { data: data as Product };
  }

  const store = getMemoryStore();
  const idx = store.findIndex((item) => item.id === id);
  if (idx === -1) {
    return { error: "Produit introuvable." };
  }
  const updated: Product = {
    ...store[idx],
    ...input,
  };
  store[idx] = updated;
  return { data: updated };
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { error: error.message };
    return {};
  }

  const store = getMemoryStore();
  const idx = store.findIndex((item) => item.id === id);
  if (idx === -1) {
    return { error: "Produit introuvable." };
  }
  store.splice(idx, 1);
  return {};
}
