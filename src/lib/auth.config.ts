import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe Auth.js config. Holds no database adapter so it can run in
// middleware. The full config in auth.ts extends this with the Prisma adapter.
export const authConfig = {
  pages: { signIn: "/login" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Returns true when a session exists. Middleware uses this to gate routes.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
