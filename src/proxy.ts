import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge instance without the Prisma adapter. The authorized callback in
// authConfig redirects unauthenticated requests to /login. Next 16 calls this
// the proxy convention (formerly middleware).
export const { auth: proxy } = NextAuth(authConfig);

export default proxy;

export const config = {
  // Runs on every route except the auth API, the login page, and static assets.
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
