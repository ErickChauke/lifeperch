import { getUploadSignature } from "@/actions/upload";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB (Cloudinary free tier)

export type UploadResult = {
  url: string;
  publicId: string;
  format: string | null;
  bytes: number | null;
};

// Uploads a file straight from the browser to Cloudinary using a signature from
// the server, reporting progress. Resolves with the fields the vault/literature
// actions store. Runs client-side only (uses XMLHttpRequest).
export async function uploadFile(
  file: File,
  folder: "lifeperch/vault" | "lifeperch/literature",
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const sig = await getUploadSignature(folder);

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("signature", sig.signature);

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const r = JSON.parse(xhr.responseText);
        resolve({
          url: r.secure_url,
          publicId: r.public_id,
          format: r.format ?? null,
          bytes: r.bytes ?? null,
        });
      } else {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(form);
  });
}
