export const MAX_COMPRESS_DIMENSION = 1600;
export const COMPRESS_QUALITY = 0.85;

/**
 * Downscales an image in the browser before upload. Keeps a capped maximum
 * dimension so phone screenshots (often 3000+ px wide, multi-MB) shrink to a
 * fraction of their original size, cutting Cloudinary storage and upload
 * time. Returns the original File when the image is small or can't be
 * decoded, and never returns a result larger than the input.
 */
export async function compressImageFile(
  file: File,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
  const { maxDimension = MAX_COMPRESS_DIMENSION, quality = COMPRESS_QUALITY } = opts;

  if (!file.type.startsWith("image/")) return file;
  if (file.size < 256 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, quality),
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: file.type });
  } catch {
    return file;
  }
}
