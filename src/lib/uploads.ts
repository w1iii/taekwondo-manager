import "server-only";

import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export class UploadError extends Error {}

export async function saveUpload(
  file: File,
  folder: string,
  maxBytes = MAX_UPLOAD_BYTES,
): Promise<string> {
  if (!file || file.size === 0) {
    throw new UploadError("Attach a file.");
  }
  if (!file.type.startsWith("image/")) {
    throw new UploadError("Only image files are allowed.");
  }
  if (file.size > maxBytes) {
    throw new UploadError(`File must be ${Math.round(maxBytes / 1_048_576)} MB or smaller.`);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `${crypto.randomUUID()}.${ext}`;

  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${filename}`, file, { access: "public" });
    return blob.url;
  }

  const dir = path.join(process.cwd(), ".uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${filename}`;
}

export async function deleteUpload(url: string): Promise<void> {
  if (!url) return;

  if (url.startsWith("http")) {
    await del(url);
    return;
  }

  const rel = url.replace(/^\/uploads\//, "");
  await rm(path.join(process.cwd(), ".uploads", rel), { force: true });
}
