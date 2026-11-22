# Le Monde des Petits Livres

Boutique Next.js en français : catalogue de livres, maquettes de livres en 3D CSS, commandes WhatsApp et administration protégée par Supabase Auth.

## 1. Prérequis
- Node.js 20+
- Un compte Supabase
- Un numéro WhatsApp au format international, chiffres uniquement (ex. 25377531900)

## 2. Installation
```bash
npm install
cp .env.example .env.local
```
Renseigne dans `.env.local` l'URL et la clé publique/anon de ton projet Supabase ainsi que ton numéro WhatsApp. Ne mets JAMAIS la clé `service_role` dans une variable `NEXT_PUBLIC_*` ni dans le navigateur.

## 3. Base de données
Dans Supabase > SQL Editor, exécute `supabase/schema.sql`.
Dans Authentication > Users, crée ton utilisateur administrateur avec ton adresse e-mail et un mot de passe fort.
Copie son UUID puis exécute :
```sql
insert into public.profiles(id, role)
values ('UUID_DE_TON_UTILISATEUR', 'admin')
on conflict (id) do update set role='admin';
```
Ne partage pas ce mot de passe. Active la confirmation d'adresse e-mail et configure les règles de sécurité de ton projet.

## 4. Démarrer
```bash
npm run dev
```
Ouvre http://localhost:3000. Administration : http://localhost:3000/connexion puis `/admin`.

## 5. Images de couverture
Pour le prototype, colle une URL HTTPS d'image dans le formulaire produit. Pour une mise en production, crée un bucket Supabase Storage privé/public adapté et ajoute un téléversement avec validation de type et taille.

## 6. Personnalisation indispensable avant publication
- Remplacer `25377531900` par le numéro WhatsApp réel dans `.env.local`.
- Ajouter les couvertures, les descriptions et les prix confirmés.
- Ajouter les mentions légales, politique de confidentialité, conditions de vente et politique de livraison/retour.
- Tester l'affichage mobile, les commandes WhatsApp et les permissions RLS.
- Déployer sur Vercel et configurer les variables d'environnement de production.

## Fonctionnement
- Les produits disponibles sont visibles publiquement.
- L'administrateur authentifié et dont le profil porte le rôle `admin` peut créer, modifier et supprimer les produits.
- Les visiteurs commandent via un lien WhatsApp prérempli.
- Le livre 3D de la page d'accueil est une maquette CSS interactive. Les couvertures réelles peuvent ensuite être intégrées en mockups 3D WebGL pour une rotation plus réaliste.

## Limites du premier prototype
Ce dépôt constitue une base fonctionnelle à configurer. Il n'inclut pas encore un suivi de commandes centralisé, une gestion de livraison, ni un système de téléversement d'images. Les commandes WhatsApp sont initiées par les clients et ne sont pas enregistrées automatiquement dans la base.
