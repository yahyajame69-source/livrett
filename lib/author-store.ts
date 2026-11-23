import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_AUTHOR_PHOTO,
  DEFAULT_AUTHOR_PROFILE,
  type AuthorProfile,
} from "./author-defaults";

export { DEFAULT_AUTHOR_PHOTO, DEFAULT_AUTHOR_PROFILE, type AuthorProfile };

const DATA_DIR = path.resolve(process.cwd(), ".data");
const LOCAL_AUTHOR_FILE = path.resolve(DATA_DIR, "author.json");

const SAFE_DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_LOCAL_ASSET_RE = /^\/assets\/[A-Za-z0-9/_-]+\.(png|jpg|jpeg|webp)$/i;
const MAX_PHOTO_DATA_URL_LENGTH = 1_500_000;

const globalForAuthor = globalThis as unknown as {
  __lmdplAuthorProfile?: AuthorProfile;
};

export function sanitizeAuthorPhotoUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (SAFE_LOCAL_ASSET_RE.test(trimmed) && !trimmed.includes("..")) {
    return trimmed;
  }
  if (SAFE_DATA_IMAGE_RE.test(trimmed) && trimmed.length <= MAX_PHOTO_DATA_URL_LENGTH) {
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

function readAuthorFromDisk(): AuthorProfile | null {
  try {
    if (!LOCAL_AUTHOR_FILE.startsWith(DATA_DIR + path.sep)) {
      return null;
    }
    if (!fs.existsSync(LOCAL_AUTHOR_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(LOCAL_AUTHOR_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthorProfile>;
    if (!parsed || typeof parsed !== "object") return null;

    const photo = sanitizeAuthorPhotoUrl(parsed.photo_url) || DEFAULT_AUTHOR_PHOTO;
    const name = typeof parsed.name === "string" && parsed.name.trim()
      ? parsed.name.trim().slice(0, 120)
      : DEFAULT_AUTHOR_PROFILE.name;
    const role = typeof parsed.role === "string" && parsed.role.trim()
      ? parsed.role.trim().slice(0, 100)
      : DEFAULT_AUTHOR_PROFILE.role;
    const bio = typeof parsed.bio === "string" && parsed.bio.trim()
      ? parsed.bio.trim().slice(0, 600)
      : DEFAULT_AUTHOR_PROFILE.bio;

    return {
      name,
      role,
      bio,
      photo_url: photo,
      updated_at: typeof parsed.updated_at === "string" ? parsed.updated_at : DEFAULT_AUTHOR_PROFILE.updated_at,
    };
  } catch {
    return null;
  }
}

function writeAuthorToDisk(profile: AuthorProfile): void {
  try {
    if (!LOCAL_AUTHOR_FILE.startsWith(DATA_DIR + path.sep)) {
      return;
    }
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(LOCAL_AUTHOR_FILE, JSON.stringify(profile), "utf8");
  } catch {
    // Ignore write failure on read-only filesystems; memory cache still persists.
  }
}

export function getAuthorProfile(): AuthorProfile {
  if (!globalForAuthor.__lmdplAuthorProfile) {
    globalForAuthor.__lmdplAuthorProfile = readAuthorFromDisk() || { ...DEFAULT_AUTHOR_PROFILE };
  }
  return globalForAuthor.__lmdplAuthorProfile;
}

export function validateAuthorPayload(body: unknown):
  | { ok: true; data: Omit<AuthorProfile, "updated_at"> }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Données de profil invalides." };
  }
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name || name.length > 120) {
    return { ok: false, error: "Le nom de l'auteur est requis (120 caractères max)." };
  }

  const role = typeof b.role === "string" ? b.role.trim().slice(0, 100) : "";
  const bio = typeof b.bio === "string" ? b.bio.trim() : "";
  if (!bio || bio.length > 600) {
    return { ok: false, error: "Le paragraphe de présentation est requis (600 caractères max)." };
  }

  let photo_url = DEFAULT_AUTHOR_PHOTO;
  if (typeof b.photo_url === "string" && b.photo_url.trim().length > 0) {
    const clean = sanitizeAuthorPhotoUrl(b.photo_url);
    if (!clean) {
      return {
        ok: false,
        error: "Photo invalide (importez un fichier JPG/PNG/WebP ou une URL https://).",
      };
    }
    photo_url = clean;
  }

  return {
    ok: true,
    data: {
      name,
      role: role || DEFAULT_AUTHOR_PROFILE.role,
      bio,
      photo_url,
    },
  };
}

export function saveAuthorProfile(input: Omit<AuthorProfile, "updated_at">): AuthorProfile {
  const next: AuthorProfile = {
    ...input,
    updated_at: new Date().toISOString(),
  };
  globalForAuthor.__lmdplAuthorProfile = next;
  writeAuthorToDisk(next);
  return next;
}
