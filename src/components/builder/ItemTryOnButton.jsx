import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, RefreshCw, Download } from "lucide-react";

export default function ItemTryOnButton({ item, profile, variant = "button" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;

  const generate = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const itemUrl = item.processed_image_url || item.original_image_url;
      const prompt = `Professional fashion photography. A person wearing a ${item.category}${item.color ? ` in ${item.color}` : ""}${item.name ? `: ${item.name}` : ""}. Full body view, standing pose, studio lighting, clean white background. Fashion editorial style photography.`;

      const refUrls = avatarUrl && itemUrl ? [avatarUrl, itemUrl] : itemUrl ? [itemUrl] : [];

      const { url } = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: refUrls,
      });

      setImageUrl(url);
    } catch (err) {
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${item.name || "item"}-tryon.png`;
    a.target = "_blank";
    a.click();
  };

  return (
    <>
      <button
        data-ctrl="true"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
          if (!imageUrl) generate();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        title="AI Try-On"
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          background: "#e8b820",
          color: "black",
          border: "2px solid white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={e => e.target === e.currentTarget && setIsOpen(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e8b820]" />
                <span className="font-heading font-bold text-white text-lg">Try {item.name}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition">
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
                  <p className="text-white/50 text-sm font-body text-center">Generating try-on…<br/>This takes about 15 seconds</p>
                </div>
              )}

              {error && (
                <div className="text-center py-10">
                  <p className="text-red-400 mb-3 text-sm">{error}</p>
                  <button onClick={generate} className="px-3 py-2 border border-white/20 text-white bg-transparent hover:bg-white/10 rounded-md text-sm inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Try again
                  </button>
                </div>
              )}

              {imageUrl && !loading && (
                <div className="space-y-4">
                  <img src={imageUrl} alt="Item try-on" className="w-full rounded-xl object-cover max-h-[60vh]" />
                  <div className="flex gap-2">
                    <button onClick={generate} className="flex-1 px-3 py-2 border border-white/20 text-white bg-transparent hover:bg-white/10 rounded-md text-sm inline-flex items-center justify-center gap-1">
                      <RefreshCw className="w-4 h-4" /> Regenerate
                    </button>
                    <button onClick={handleDownload} className="flex-1 px-3 py-2 bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold rounded-md text-sm inline-flex items-center justify-center gap-1">
                      <Download className="w-4 h-4" /> Save
                    </button>
                  </div>
                  {!avatarUrl && (
                    <p className="text-xs text-white/30 text-center font-body">
                      Upload a photo in My Avatar for a personalized try-on.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}