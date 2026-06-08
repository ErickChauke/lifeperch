"use server";

import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

const ALLOWED_FOLDERS = ["lifeperch/vault", "lifeperch/literature"];

// Returns a short-lived signature so the browser can upload a file directly to
// Cloudinary. The file never passes through the server, sidestepping the serverless
// request-body limit and giving the client real upload progress.
export async function getUploadSignature(folder: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : "lifeperch";
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: safeFolder },
    process.env.CLOUDINARY_API_SECRET ?? "",
  );

  return {
    signature,
    timestamp,
    folder: safeFolder,
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  };
}
