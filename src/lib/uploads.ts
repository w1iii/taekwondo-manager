import "server-only";

import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class UploadError extends Error {}

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  tiff: "image/tiff",
  tif: "image/tiff",
  heic: "image/heic",
  heif: "image/heif",
};

function mimeFromExt(ext: string): string {
  return MIME[ext] ?? "application/octet-stream";
}

function hasCloudinary(): boolean {
  return Boolean(process.env.CLOUDINARY_URL);
}

function localUploadsAllowed(): boolean {
  const explicit = process.env.ALLOW_LOCAL_UPLOADS;
  if (explicit) return explicit !== "false";
  return process.env.NODE_ENV !== "production";
}

function extFromUrl(url: string): string {
  return url.split("?")[0].split(".").pop()?.toLowerCase() ?? "png";
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

export type UploadOptions = {
  /**
   * Upload as a Cloudinary `private` asset (never publicly reachable via a
   * guessed URL). Used for payment proofs. Private assets must be streamed
   * through an authenticated route that signs a short-lived download URL.
   */
  private?: boolean;
};

export async function saveUpload(
  file: File,
  folder: string,
  maxBytes = MAX_UPLOAD_BYTES,
  options: UploadOptions = {},
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
      type: options.private ? "private" : "upload",
      // Backstop for uploads that skip client-side compression: cap the stored
      // dimensions so a multi-MB original never occupies full Cloudinary space.
      transformation: [{ crop: "limit", width: 1600, height: 1600 }],
    });
    return result.secure_url;
  }

  if (!localUploadsAllowed()) {
    throw new UploadError(
      "Cloudinary is not configured. Uploads are unavailable — contact the administrator.",
    );
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

/**
 * Streams a stored upload as bytes. Used to gate payment-proof access behind
 * authentication: callers must verify the requester owns the payment before
 * calling this.
 *
 * Cloudinary assets are fetched through a short-lived signed URL so the raw
 * `secure_url` (public-by-URL) is never handed to the browser. Local files
 * are read from disk (development fallback only).
 */
export async function getStoredFile(
  url: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!url) return null;

  if (url.startsWith("/uploads/")) {
    const rel = url.replace(/^\/uploads\//, "");
    const filePath = path.join(process.cwd(), ".uploads", rel);
    try {
      const data = await readFile(filePath);
      return { data, contentType: mimeFromExt(extFromUrl(url)) };
    } catch {
      return null;
    }
  }

  const publicId = publicIdFromUrl(url);
  if (!publicId) return null;
  const format = extFromUrl(url);
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  const signedUrl = (type: "upload" | "private") =>
    cloudinary.utils.private_download_url(publicId, format, {
      resource_type: "image",
      type,
      attachment: false,
      expires_at: expiresAt,
    });

  let response = await fetch(signedUrl("private"));
  if (!response.ok) response = await fetch(signedUrl("upload"));
  if (!response.ok) return null;

  const contentType =
    response.headers.get("content-type") ?? mimeFromExt(format);
  return { data: Buffer.from(await response.arrayBuffer()), contentType };
}
