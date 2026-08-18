"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";

import { Button } from "@/components/ui/button";

const MARGIN = 24;

export function BracketPdfButton({
  targetId,
  filename,
  label = "Download PDF",
}: {
  targetId: string;
  filename: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    const node = document.getElementById(targetId);
    if (!node) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = await toCanvas(node, {
        pixelRatio: 2,
        // Skip font embedding: scanning stylesheets hits the cross-origin
        // Google Fonts <link> (Material Symbols) → SecurityError in console.
        // Bracket uses system mono + self-hosted sans; system fallback is fine.
        skipFonts: true,
      });
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const doc = new jsPDF({
        orientation: w >= h ? "landscape" : "portrait",
        unit: "px",
        format: [w + MARGIN * 2, h + MARGIN * 2],
        compress: true,
      });
      doc.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN, MARGIN, w, h);
      doc.save(filename);
    } catch (err) {
      console.error("Failed to generate bracket PDF", err);
      setError("Could not generate PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={download} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Download />}
        {busy ? "Generating…" : label}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
