import { readFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  await requireUser();

  const { path: segments } = await params;
  if (segments.some((s) => s.includes("..") || s.length === 0)) {
    return new Response("Not found", { status: 404 });
  }

  const rel = segments.join(path.sep);
  const filePath = path.join(process.cwd(), ".uploads", rel);
  const ext = path.extname(filePath).slice(1).toLowerCase();

  try {
    const data = await readFile(filePath);
    return new Response(data, {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}