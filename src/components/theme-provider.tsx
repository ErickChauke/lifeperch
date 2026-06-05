"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Wraps next-themes. Dark is the primary theme; the choice persists in
// localStorage. Toggles the `.dark` class on <html> so shadcn dark: variants work.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
