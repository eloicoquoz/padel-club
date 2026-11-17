# Padel Club · Fribourg-Gottéron

App interne (PWA) pour les collègues qui jouent au padel : comptes, saisie de matchs en 20 secondes,
classement Elo double, historique, sessions, défis, tournoi Americano, badges, news FR/DE/EN,
écran TV pour le vidéotron et post automatique dans Teams.

## Stack

- **Next.js 16** (App Router, Server Actions) + **Tailwind v4**
- **Drizzle ORM** — Postgres en prod, **PGlite** (Postgres embarqué, zéro install) en local
- Auth maison : e-mail + mot de passe (bcrypt), session JWT en cookie, code d'invitation
- Déploiement cible : **Vercel** + un Postgres (Supabase, Neon, Vercel Postgres…)

## Démarrer en local

```bash
npm install
npm run db:seed      # crée la base locale (./.pglite) + 10 joueurs de démo
npm run dev          # http://localhost:3000
```

Comptes de démo : `eloi@gotteron.ch` … `pierre@gotteron.ch`, mot de passe `padel1234`.
Code d'invitation par défaut : `GOTTERON`. Le premier compte créé est admin.

`npm run db:reset` efface la base locale.

## Variables d'environnement

| Variable             | Rôle                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`       | Postgres de prod. Absente → PGlite local dans `./.pglite`.                                 |
| `AUTH_SECRET`        | Secret des sessions (obligatoire en prod, `openssl rand -base64 32`).                      |
| `INVITE_CODE`        | Code d'invitation pour créer un compte (défaut `GOTTERON`).                                |
| `APP_URL`            | URL publique (boutons des cartes Teams), ex. `https://padel.gotteron.ch`.                  |
| `TEAMS_WEBHOOK_URL`  | Webhook entrant Teams (Workflows). Absente → pas de post.                                  |
| `TEAMS_LANG`         | Langue des posts Teams et de l'écran TV par défaut : `fr` / `de` / `en`.                   |
| `DEFAULT_LOCATION`   | Lieu pré-rempli quand on crée une session (ex. nom du centre de padel).                    |
| `AUTO_MIGRATE`       | `1` pour appliquer les migrations au démarrage (pratique sur Vercel, voir ci-dessous).     |

Copier `.env.example` en `.env.local` pour le dev.

## Déployer sur Vercel

1. Créer une base Postgres (Supabase gratuit suffit largement) et récupérer `DATABASE_URL`
   (chaîne « connection pooling / transaction » si disponible).
2. Pousser le repo sur GitHub, importer le projet dans Vercel.
3. Variables d'environnement : `DATABASE_URL`, `AUTH_SECRET`, `INVITE_CODE`, `APP_URL`, `AUTO_MIGRATE=1`
   (+ `TEAMS_WEBHOOK_URL`, `TEAMS_LANG`, `DEFAULT_LOCATION` si voulu).
4. Déployer. Au premier appel, `AUTO_MIGRATE=1` crée les tables. Tu peux ensuite le retirer et
   lancer `npm run db:migrate` à la main pour les prochaines migrations (`npm run db:generate`
   après une modif du schéma).
5. Créer ton compte sur `/register` (le premier devient admin), partager le code d'invitation.

## Fonctionnalités

| Écran               | Route               | Notes                                                                 |
| ------------------- | ------------------- | --------------------------------------------------------------------- |
| Connexion / compte  | `/login` `/register`| Choix de langue, code d'invitation                                     |
| Accueil             | `/`                 | Rang, Elo de la semaine, titre, prochaine session, défi reçu, derniers matchs |
| Classement          | `/ranking`          | Podium + liste, séries « en feu », niveau Playtomic si renseigné        |
| Saisir un match     | `/match/new`        | 4 joueurs, scores par set tapables, prévision ±Elo                      |
| Résultat            | `/match/[id]`       | Victoire (confettis, +Elo, rang, badge) ou défaite (sentence, revanche) |
| Historique          | `/history`          | Mes matchs / tous, courbe Elo 30 jours                                 |
| Sessions            | `/sessions`         | Créer, s'inscrire, paires équilibrées par Elo, lien Playtomic           |
| Défis               | `/challenges`       | Envoyer avec trash talk, accepter/décliner, saisir le résultat          |
| Americano           | `/americano`        | Tours générés automatiquement, points par match, classement du soir    |
| Profil              | `/profile`          | Stats, meilleur duo, némésis, badges, langue, niveau Playtomic         |
| Écran TV            | `/tv?lang=fr`       | Public (sans login), 1920×1080, rafraîchi toutes les 60 s               |

### Elo double

Note d'équipe = moyenne des deux joueurs. K = 40 (moins de 10 matchs), 32 (moins de 30), 24 ensuite.
Les deux coéquipiers gagnent/perdent le même delta ; somme nulle entre les équipes. Départ à 1 200.
Titres : Padawan < 1 150 ≤ Habitué < 1 250 ≤ Mur de Fribourg < 1 350 ≤ Légende de la BCF.

### Badges

`first_win`, `giant_killer` (battre une paire avec le n°1), `revenge`, `streak_3`, `streak_5`,
`bagel_given` / `bagel_taken` (6-0), `super_tiebreak`, `regular_10` (10 sessions), `early_bird`
(match avant 8 h), `socialite` (8 partenaires différents), `month_king` (à attribuer manuellement).

### News et Teams

Chaque événement (match, nouveau leader, série, badge, session, défi, americano) est stocké avec des
identifiants, et le texte est généré **dans la langue du lecteur** (`src/lib/services/events.ts`).
Les phrases fun sont dans `src/lib/i18n/{fr,de,en}.ts` (sentences de défaite, répliques de refus…).

Teams : dans le canal, « Workflows » → « Publier dans un canal lorsqu'une requête webhook est
reçue » → copier l'URL dans `TEAMS_WEBHOOK_URL`. L'app envoie une Adaptive Card à chaque match.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run typecheck`
- `npm run db:generate` — génère une migration SQL après modif de `src/lib/db/schema.ts`
- `npm run db:migrate` — applique les migrations (`DATABASE_URL` ou PGlite local)
- `npm run db:seed` — données de démo (ne fait rien si des comptes existent)
- `node scripts/e2e.mjs` — smoke test Playwright contre `http://localhost:3000` (base seedée)

## Arborescence

```
src/
  app/            routes (App Router) — (auth)/, (app)/, tv/, api/
  components/     UI (nav, formulaires, cartes…)
  lib/
    db/           schéma Drizzle + client (PGlite / Postgres)
    i18n/         dictionnaires fr/de/en + helpers
    services/     logique métier (matchs & Elo, sessions, défis, tournois, news, Teams)
    actions/      Server Actions
    elo.ts        calcul Elo double, validation des sets, titres
    americano.ts  génération des tours
drizzle/          migrations SQL
scripts/          seed, migrate, e2e
```

## Pistes v2

- Saisons mensuelles avec archivage et « roi/reine du mois » automatique
- Pronostics avant match, bonus Elo hebdo (nouveau partenaire ×1,5)
- Notifications push (PWA) pour les défis et les sessions
- SSO Microsoft via Entra (une fois validé côté M365)
- Import des réservations via l'API club Playtomic si le centre donne l'accès
