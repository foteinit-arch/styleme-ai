import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Download, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Step 1: Describe the avatar person ────────────────────────────────────────
async function generateAvatarDescription(avatarUrl) {
  const result = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `Look at this image and write a detailed physical description of the person shown. Cover ALL of these attributes in a single structured paragraph:
- Face shape
- Skin tone (be specific, e.g. "warm medium-tan", "light porcelain", "deep brown")
- Hair color, length, style, and texture
- Eye color
- Eyebrow shape
- Approximate age range
- Body proportions and build
- Height impression (tall/average/petite)
- Posture and current pose

Be precise and specific. This description will be used to reproduce this exact person in a new AI image.`,
    file_urls: [avatarUrl],
  });
  return typeof result === "string" ? result : JSON.stringify(result);
}

// ── Step 2: Describe the garments in text ─────────────────────────────────────
async function describeGarments(garmentUrls) {
  if (!garmentUrls.length) return "casual outfit";
  const result = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `Look at these ${garmentUrls.length} clothing item image(s) and describe each one in detail: type of garment, exact color(s), pattern, cut, style, fabric appearance, and any notable details. Be concise but very specific about colors and style. Number each item.`,
    file_urls: garmentUrls,
  });
  return typeof result === "string" ? result : JSON.stringify(result);
}

// ── Step 3: Generate try-on — avatar as ONLY image reference ──────────────────
async function generateTryOnImage(avatarUrl, garmentUrls, avatarDescription, extraEmphasis = "") {
  // Describe garments in text — do NOT pass garment images to avoid model identity theft
  const garmentDescription = await describeGarments(garmentUrls);

  const emphasisBlock = extraEmphasis ? ` ${extraEmphasis}` : "";

  const prompt = `You are generating a fashion photo. The reference image shows a specific real person. You MUST reproduce that exact person — identical face structure, skin tone, hair color and style, eye color, and body proportions. Do NOT substitute a different person or model.

The person should be shown wearing this specific outfit: ${garmentDescription}

Person description for reference: ${avatarDescription}

Requirements:
- The face and physical appearance MUST exactly match the reference image person
- Pure white background
- Full body visible from top of head to feet, no cropping
- Professional fashion photo style${emphasisBlock}`;

  const { url } = await base44.integrations.Core.GenerateImage({
    prompt,
    existing_image_urls: [avatarUrl],
  });

  return url;
}

// ── Step 4: Quality gate ───────────────────────────────────────────────────────
async function scoreResult(avatarUrl, generatedUrl) {
  try {
    const scores = await base44.integrations.Core.InvokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Compare image 1 (original avatar) and image 2 (AI-generated try-on result). Score each dimension from 1 to 10 as integers:
- identity_match: How closely does the person in image 2 match the person in image 1? (face, hair, skin tone, body — 10 = identical, 1 = completely different person)
- garment_visible: Are clothes clearly visible and well-rendered? (10 = yes, 1 = no)
- full_body_framing: Is the full body visible from head to toe with no cropping? (10 = perfect, 1 = cropped)
Return ONLY a JSON object with keys: identity_match, garment_visible, full_body_framing.`,
      file_urls: [avatarUrl, generatedUrl],
      response_json_schema: {
        type: "object",
        properties: {
          identity_match: { type: "integer" },
          garment_visible: { type: "integer" },
          full_body_framing: { type: "integer" },
        },
      },
    });
    return scores;
  } catch {
    return { identity_match: 10, garment_visible: 10, full_body_framing: 10 };
  }
}

function buildEmphasis(scores) {
  const failing = [];
  if ((scores?.identity_match ?? 10) < 7) failing.push("CRITICAL: The output person MUST have the identical face, hair, and skin tone as the person in the reference image. Do not change any facial features.");
  if ((scores?.garment_visible ?? 10) < 7) failing.push("Make sure the outfit is clearly visible and well-rendered on the person.");
  if ((scores?.full_body_framing ?? 10) < 7) failing.push("Show the complete full body from head to feet without any cropping.");
  return failing.join(" ");
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function TryOnModal({ profile, placed, onClose, onSnapshotSaved }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [qualityWarning, setQualityWarning] = useState(false);

  const descriptionRef = useRef(null);

  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;
  const garmentUrls = (placed || []).map(p => p.processed_image_url || p.original_image_url).filter(Boolean);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setQualityWarning(false);

    try {
      // Step 1: describe avatar fresh every time
      setLoadingStep("Analyzing your avatar…");
      descriptionRef.current = await generateAvatarDescription(avatarUrl);

      // Step 2: generate
      setLoadingStep("Generating your look…");
      const firstUrl = await generateTryOnImage(avatarUrl, garmentUrls, descriptionRef.current);

      // Step 3: quality gate
      setLoadingStep("Checking quality…");
      const scores = await scoreResult(avatarUrl, firstUrl);
      const passed = (scores.identity_match ?? 10) >= 7 && (scores.garment_visible ?? 10) >= 7;

      if (passed) {
        setImageUrl(firstUrl);
      } else {
        setLoadingStep("Improving result…");
        const emphasis = buildEmphasis(scores);
        const retryUrl = await generateTryOnImage(avatarUrl, garmentUrls, descriptionRef.current, emphasis);
        const retryScores = await scoreResult(avatarUrl, retryUrl);
        const retryPassed = (retryScores.identity_match ?? 10) >= 7;
        setImageUrl(retryUrl);
        if (!retryPassed) setQualityWarning(true);
      }
    } catch (err) {
      setError(err.message || "Failed to generate image. Please try again.");
    } finally {
      setLoading(false);
      setLoadingStep("");
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
      const snapshot = { snapshot_url: imageUrl, placed_items: placed };
      if (onSnapshotSaved) onSnapshotSaved(snapshot);
      onClose();
    } catch {
      setError("Failed to save snapshot. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#e8b820]" />
            <span className="font-heading font-bold text-white text-lg">
              AI Try-On ({placed.length} item{placed.length !== 1 ? "s" : ""})
            </span>
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
              <p className="text-white/50 text-sm font-body text-center">
                {loadingStep || "Generating your look…"}
                <br />
                <span className="text-white/30 text-xs">This can take up to 60 seconds</span>
              </p>
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
              <img src={imageUrl} alt="AI try-on" className="w-full rounded-xl object-contain max-h-[60vh]" />

              {qualityWarning && (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-300/80 font-body">
                    Result may not be perfect. Tap Regenerate to try again.
                  </p>
                </div>
              )}

              <p className="text-xs text-white/30 text-center font-body">
                AI try-on is experimental — tap Regenerate if the result doesn't look right.
              </p>

              <div className="flex gap-2">
                <Button onClick={generate} variant="outline" className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10">
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                </Button>
                <Button onClick={handleDownload} variant="outline" className="border-white/20 text-white bg-transparent hover:bg-white/10 px-3">
                  <Download className="w-4 h-4" />
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