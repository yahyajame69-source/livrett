export interface AuthorProfile {
  name: string;
  role: string;
  bio: string;
  photo_url: string;
  updated_at: string;
}

export const DEFAULT_AUTHOR_PHOTO = "/assets/aistudio/1000128564_c9abf6f5.png";

export const DEFAULT_AUTHOR_PROFILE: AuthorProfile = {
  name: "ADEN Mohamed Warsama",
  role: "Auteur & Créateur de la collection",
  bio: "Passionné par l'éveil et la réussite des plus jeunes, ADEN Mohamed Warsama imagine, écrit et publie lui-même chaque livre de cette boutique pour transmettre le goût de lire, nourrir la curiosité et faire grandir nos enfants avec joie.",
  photo_url: DEFAULT_AUTHOR_PHOTO,
  updated_at: "2026-01-01T00:00:00.000Z",
};
