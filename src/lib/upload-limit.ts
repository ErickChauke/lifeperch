// Dependency-free so both client components (via lib/upload.ts) and server
// actions (via lib/cloudinary.ts) can import it without pulling the
// server-only cloudinary SDK into a browser bundle.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB (Cloudinary free tier)
