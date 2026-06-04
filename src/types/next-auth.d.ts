import type { DefaultSession } from "next-auth";

// Adds the user id to the session type so server code can scope by user.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
