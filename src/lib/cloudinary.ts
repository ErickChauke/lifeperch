import { v2 as cloudinary } from "cloudinary";

// Configured from the Cloudinary env vars (see .env.example). secure: true so
// delivery URLs are always https.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB (Cloudinary free tier)

// The signed upload API has no way to cap a file's size server-side (Cloudinary
// confirmed this isn't supported), so this is the real enforcement: called from
// each action right after a fresh upload, it destroys the asset and rejects when
// the client-side check in lib/upload.ts was bypassed. Reused, already-accepted
// assets (bytes unchanged from a prior save) always pass, so this only ever
// blocks a genuinely new oversized upload.
export async function assertUploadSize(
  bytes: number | null | undefined,
  publicId: string | null | undefined,
): Promise<void> {
  if (bytes == null || !publicId || bytes <= MAX_UPLOAD_BYTES) return;
  await destroyAsset(publicId);
  throw new Error("File exceeds the 10 MB upload limit");
}

// Best-effort delete of an uploaded asset. The resource type is not stored, so
// each candidate is tried; a missing asset is not treated as an error. Callers
// rely on this never throwing (a Cloudinary outage should not block a delete),
// so a failure across every candidate is logged here rather than surfaced,
// making an orphaned asset observable in the logs instead of silent.
export async function destroyAsset(publicId: string): Promise<void> {
  for (const resource_type of ["image", "raw", "video"] as const) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type });
      if (result.result === "ok") return;
    } catch {
      // try the next resource type
    }
  }
  console.error(`destroyAsset: could not delete Cloudinary asset ${publicId}`);
}

// Matches a stored Cloudinary delivery URL:
// /<cloud>/<resource_type>/<type>/v<version>/<public_id.ext>
const DELIVERY_URL =
  /^https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/(upload|private|authenticated)\/(?:v(\d+)\/)?([^?#]+)$/;

// Rebuilds a stored Cloudinary delivery URL as a signed URL so restricted
// types (pdf, zip) are deliverable. Non-Cloudinary and already signed URLs
// pass through unchanged.
export function signedFileUrl(url: string): string {
  const match = url.match(DELIVERY_URL);
  if (!match) return url;
  const [, resourceType, type, version, publicId] = match;
  if (publicId.startsWith("s--")) return url;
  try {
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type,
      sign_url: true,
      secure: true,
      analytics: false,
      ...(version ? { version } : {}),
    });
  } catch {
    return url;
  }
}
