import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Download, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TryOnModal({ profile, placed, onClose, onSnapshotSaved }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;

  const generate = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const itemUrls = placed.map(p => p.processed_image_url || p.original_image_url).filter(Boolean);
      const itemDescriptions = placed.map(p => `${p.category}: ${p.name}${p.color ? ` (${p.color})` : ''}`).join(', ');

      const prompt = `You are editing image 1. Do not create a new person. The person in image 1 must remain EXACTLY the same — same face, same expression, same hair, same skin tone, same body, same pose. Do not change anything about the person at all. The ONLY edit is: replace the clothing they are wearing with the exact garments shown in the other reference images (${itemDescriptions}). Reproduce those garments accurately — same color, same style, same cut as shown. The full body must be visible from head to toe — do not crop any part. Plain white background. Photorealistic.`;

      const refUrls = [avatarUrl, ...itemUrls].filter(Boolean);

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

  const handleSaveSnapshot = async () => {
    if (!imageUrl) return;
    setSaving(true);
    try {
      const snapshot = {
        snapshot_url: imageUrl,
        placed_items: placed, // Store full placed items with all data
      };
      if (onSnapshotSaved) onSnapshotSaved(snapshot);
      onClose();
    } catch (err) {
      setError("Failed to save snapshot. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#e8b820]" />
            <span className="font-heading font-bold text-white text-lg">AI Try-On ({placed.length} item{placed.length !== 1 ? 's' : ''})</span>
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
                <Button onClick={handleSaveSnapshot} disabled={saving} className="flex-1 bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold">
                  {saving ? "Saving..." : "Use as Avatar"}
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