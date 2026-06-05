"use server";

import { signOut } from "@/lib/auth";

// Signs the current user out and returns them to the login screen.
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
