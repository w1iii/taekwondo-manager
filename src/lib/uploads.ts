import "server-only";

import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class UploadError extends Error {}

function hasCloudinary(): boolean {
  return Boolean(process.env.CLOUDINARY_URL);
}

function publicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("res.cloudinary.com")) return null;
    const segments = parsed.pathname.split("/");
    const versionIndex = segments.findIndex((s) => /^v\d+$/.test(s));
    if (versionIndex === -1) return null;
    return segments
      .slice(versionIndex + 1)
      .join("/")
      .replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return null;
  }
}

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

  const filename = `${crypto.randomUUID()}`;

  if (hasCloudinary()) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      public_id: filename,
      resource_type: "image",
    });
    return result.secure_url;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const dir = path.join(process.cwd(), ".uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${filename}.${ext}`), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${filename}.${ext}`;
}

export async function deleteUpload(url: string): Promise<void> {
  if (!url) return;

  if (url.startsWith("/uploads/")) {
    const rel = url.replace(/^\/uploads\//, "");
    await rm(path.join(process.cwd(), ".uploads", rel), { force: true });
    return;
  }

  const publicId = publicIdFromUrl(url);
  if (publicId) {
    await cloudinary.uploader.destroy(publicId);
  }
}
