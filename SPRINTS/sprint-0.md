# Sprint 0 — foundation

## Goal
A deployed, authenticated Next.js app with an empty sidebar. No features yet. Just the skeleton every future sprint builds on.

## Branch
`sprint-0`

## Done when
- You can sign in with Google on both laptop and phone.
- A sidebar is visible after login (empty, no module links yet).
- The app is live on Vercel.
- No TypeScript errors. No console errors.

## Layer 1 — project setup
- Run: `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"`
- Install dependencies:
  `npm install prisma @prisma/client @auth/prisma-adapter next-auth@beta zod react-hook-form @hookform/resolvers date-fns recharts cloudinary`
  `npm install -D @types/node tsx`
  `npx shadcn@latest init`
- Add shadcn components: `npx shadcn@latest add button input label toast dialog`
- Create `.env.example` with these keys (no values):
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
VAULT_PIN=
- Commit: `"scaffold next.js app and install dependencies"`

## Layer 2 — database
- Initialise Prisma: `npx prisma init`
- Write the User model in `prisma/schema.prisma` (Auth.js requires specific fields):
```prisma
  model User {
    id            String    @id @default(cuid())
    name          String?
    email         String?   @unique
    emailVerified DateTime?
    image         String?
    accounts      Account[]
    sessions      Session[]
    createdAt     DateTime  @default(now())
  }

  model Account {
    id                String  @id @default(cuid())
    userId            String
    type              String
    provider          String
    providerAccountId String
    refresh_token     String?
    access_token      String?
    expires_at        Int?
    token_type        String?
    scope             String?
    id_token          String?
    session_state     String?
    user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([provider, providerAccountId])
  }

  model Session {
    id           String   @id @default(cuid())
    sessionToken String   @unique
    userId       String
    expires      DateTime
    user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  }

  model VerificationToken {
    identifier String
    token      String   @unique
    expires    DateTime
    @@unique([identifier, token])
  }
```
- Run: `npx prisma migrate dev --name init-auth`
- Commit: `"add auth schema and run initial migration"`

## Layer 3 — auth
- Create `src/lib/prisma.ts` — Prisma client singleton.
- Create `src/lib/auth.ts` — Auth.js config with Google provider and Prisma adapter.
- Create `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler.
- Create `src/app/(auth)/login/page.tsx` — login page with "Sign in with Google" button.
- Protect all `(app)` routes with a middleware check in `src/middleware.ts`.
- Commit: `"wire google auth and protect app routes"`

## Layer 4 — layout shell
- Create `src/app/(app)/layout.tsx` — shared layout with sidebar + topbar.
- Create `src/components/layout/sidebar.tsx` — empty sidebar (no module links yet, just the LifeTrack logo and user avatar).
- Create `src/components/layout/topbar.tsx` — top bar with page title and sign-out button.
- Create `src/app/(app)/dashboard/page.tsx` — empty dashboard page with "Welcome to LifeTrack" text.
- Commit: `"add layout shell with sidebar and dashboard page"`

## Layer 5 — deploy
- Push branch to GitHub.
- Connect repo to Vercel if not already done.
- Add all env vars from `.env.example` to Vercel dashboard (with real values).
- Trigger deploy. Confirm it works on phone browser.
- Open PR from `sprint-0` to `main`. Merge when green.
- Commit: `"deploy sprint 0"`
