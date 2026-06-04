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
    // Stores the user id on the token at sign-in.
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    // Surfaces the user id on the session so server actions can scope queries.
    session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
