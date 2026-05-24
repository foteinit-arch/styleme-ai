import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, X } from "lucide-react";
import jsPDF from "jspdf";

async function loadImageAsDataUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function LookbookExport({ outfits }) {
  const [loading, setLoading] = useState(false);

  // Top 5 with a magazine image, ordered by created_date desc (already sorted)
  const top5 = outfits.filter(o => o.magazine_url).slice(0, 5);

  if (top5.length === 0) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      // A4 landscape: 297 x 210 mm
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = 297, H = 210;

      // ── Cover page ───────────────────────────────────────────────────────
      pdf.setFillColor(26, 26, 26);
      pdf.rect(0, 0, W, H, "F");

      pdf.setTextColor(212, 160, 23);
      pdf.setFont("times", "bolditalic");
      pdf.setFontSize(52);
      pdf.text("Virtually Dressed", W / 2, H / 2 - 12, { align: "center" });

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("times", "italic");
      pdf.setFontSize(18);
      pdf.text("My Lookbook", W / 2, H / 2 + 10, { align: "center" });

      pdf.setTextColor(160, 160, 160);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`${top5.length} curated outfits`, W / 2, H / 2 + 22, { align: "center" });

      // ── One outfit per page ──────────────────────────────────────────────
      for (let i = 0; i < top5.length; i++) {
        const outfit = top5[i];
        pdf.addPage();

        // Dark background
        pdf.setFillColor(26, 26, 26);
        pdf.rect(0, 0, W, H, "F");

        // Load magazine image
        const imgData = await loadImageAsDataUrl(outfit.magazine_url);
        if (imgData) {
          // Center image with max bounds leaving room for caption
          const maxW = W - 40, maxH = H - 36;
          const img = new Image();
          img.src = imgData;
          await new Promise(r => { img.onload = r; });
          const ratio = img.naturalWidth / img.naturalHeight;
          let iw = maxW, ih = maxW / ratio;
          if (ih > maxH) { ih = maxH; iw = maxH * ratio; }
          const ix = (W - iw) / 2;
          const iy = 8;
          pdf.addImage(imgData, "JPEG", ix, iy, iw, ih);
        }

        // Caption bar at bottom
        pdf.setFillColor(26, 26, 26);
        pdf.rect(0, H - 20, W, 20, "F");

        pdf.setTextColor(212, 160, 23);
        pdf.setFont("times", "bolditalic");
        pdf.setFontSize(14);
        pdf.text(outfit.name.toUpperCase(), 14, H - 8);

        if (outfit.occasion) {
          pdf.setTextColor(160, 160, 160);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.text(outfit.occasion.toUpperCase(), W - 14, H - 8, { align: "right" });
        }

        // Page number
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.text(`${i + 1} / ${top5.length}`, W / 2, H - 8, { align: "center" });
      }

      pdf.save("virtually-dressed-lookbook.pdf");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      className="border-[#d4a017]/50 text-[#d4a017] hover:bg-[#d4a017]/10 bg-transparent"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building PDF…</>
      ) : (
        <><BookOpen className="w-4 h-4 mr-2" /> Export Lookbook</>
      )}
    </Button>
  );
}