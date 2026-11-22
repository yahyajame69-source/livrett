import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Le Monde des Petits Livres",
  description: "Des histoires merveilleuses et des livres éducatifs pour les enfants."
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="fr"><body>{children}</body></html>;
}