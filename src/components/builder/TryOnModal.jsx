import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Download, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TryOnModal({ profile, placed, onClose }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;

  const generate = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      // Build a description of the outfit
      const categories = ["outerwear", "top", "dress", "bottom", "shoes", "bag", "accessory"];
      const sorted = [...placed].sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category));
      const outfitDesc = sorted.map(p => `${p.name}${p.color ? ` in ${p.color}` : ""}`).join(", ");
      const itemUrls = sorted.map(p => p.processed_image_url || p.original_image_url).filter(Boolean);

      const prompt = `Professional fashion photography. A person wearing the following outfit items: ${outfitDesc}. Full body view, standing pose, studio lighting, clean white background. Fashion editorial style photography.`;

      const refUrls = avatarUrl ? [avatarUrl, ...itemUrls] : itemUrls;

      const { url } = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: refUrls.slice(0, 5), // API limit
      });

      setImageUrl(url);
      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to generate image. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, []);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = "tryon.png";
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#e8b820]" />
            <span className="font-heading font-bold text-white text-lg">AI Try-On</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[#e8b820] animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#e8b820]" />
              </div>
              <p className="text-white/50 text-sm font-body text-center">Generating your look…<br/>This takes about 15 seconds</p>
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <p className="text-red-400 mb-3">{error}</p>
              <Button onClick={generate} variant="outline" className="border-white/20 text-white bg-transparent hover:bg-white/10">
                <RefreshCw className="w-4 h-4 mr-2" /> Try again
              </Button>
            </div>
          )}

          {imageUrl && !loading && (
            <div className="space-y-4">
              <img src={imageUrl} alt="AI try-on" className="w-full rounded-xl object-cover max-h-[60vh]" />
              <div className="flex gap-2">
                <Button onClick={generate} variant="outline" className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10">
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                </Button>
                <Button onClick={handleDownload} className="flex-1 bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold">
                  <Download className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
              {!avatarUrl && (
                <p className="text-xs text-white/30 text-center font-body">
                  Upload a photo in My Avatar for a personalized try-on with your face & body.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}