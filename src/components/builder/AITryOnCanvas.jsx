import { useEffect, useRef, useState, useCallback } from "react";
import { X, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import {
  getCompletionState,
  isAround,
  generateLook,
  generateAvatarDescription,
  scoreResult,
  buildEmphasis,
} from "@/components/builder/tryOnEngine";

// Estimated seconds for a single AI generation pass (used for the countdown).
const EST_SECONDS = 45;

// Items whose change should re-trigger an avatar regeneration (worn on body).
const WORN = new Set(["top", "bottom", "dress", "outerwear", "underwear", "shoes"]);

function wornSignature(picked) {
  return picked
    .filter(p => WORN.has(p.category))
    .map(p => p.id || p.placedId)
    .sort()
    .join("|");
}

export default function AITryOnCanvas({ profile, picked, onRemove }) {
  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;

  const [genUrl, setGenUrl]       = useState(null);   // latest AI look (null => show base avatar)
  const [loading, setLoading]     = useState(false);
  const [secondsLeft, setSeconds] = useState(EST_SECONDS);
  const [error, setError]         = useState(null);
  const [warn, setWarn]           = useState(false);

  const descriptionRef = useRef(null);
  const lastSigRef     = useRef("");
  const tickRef        = useRef(null);

  const { complete, hint } = getCompletionState(picked);
  const aroundItems = picked.filter(p => isAround(p.category));

  // Countdown timer while loading.
  useEffect(() => {
    if (loading) {
      setSeconds(EST_SECONDS);
      tickRef.current = setInterval(() => {
        setSeconds(s => (s > 1 ? s - 1 : 1));
      }, 1000);
    } else {
      clearInterval(tickRef.current);
    }
    return () => clearInterval(tickRef.current);
  }, [loading]);

  const runGeneration = useCallback(async () => {
    if (!avatarUrl) return;
    setLoading(true);
    setError(null);
    setWarn(false);
    try {
      if (!descriptionRef.current) {
        descriptionRef.current = await generateAvatarDescription(avatarUrl);
      }
      const firstUrl = await generateLook({
        profile,
        picked,
        avatarDescription: descriptionRef.current,
      });
      const scores = await scoreResult(avatarUrl, firstUrl);
      const passed = (scores.identity_match ?? 10) >= 7 && (scores.garment_visible ?? 10) >= 7;
      if (passed) {
        setGenUrl(firstUrl);
      } else {
        const emphasis = buildEmphasis(scores);
        const retryUrl = await generateLook({
          profile, picked, avatarDescription: descriptionRef.current, extraEmphasis: emphasis,
        });
        const retryScores = await scoreResult(avatarUrl, retryUrl);
        setGenUrl(retryUrl);
        if ((retryScores.identity_match ?? 10) < 7) setWarn(true);
      }
    } catch (err) {
      setError(err.message || "Couldn't generate your look. Tap retry.");
    } finally {
      setLoading(false);
    }
  }, [avatarUrl, profile, picked]);

  // Auto-trigger whenever the set of WORN items changes.
  useEffect(() => {
    const sig = wornSignature(picked);
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    if (!sig) {
      // No worn garments — reset to base avatar.
      setGenUrl(null);
      return;
    }
    runGeneration();
  }, [picked]);

  const displayUrl = genUrl || avatarUrl;

  if (!avatarUrl) {
    return (
      <div style={{ width: "100%", maxWidth: 320, height: 600, borderRadius: 24, border: "2px dashed rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "0 24px" }}>
          Set up your avatar first to start building outfits
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Avatar + around-items stage */}
      <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 320, height: 600, margin: "0 auto", borderRadius: 24, overflow: "hidden", isolation: "isolate", background: "#111" }}>
          <img
            src={displayUrl}
            alt="avatar"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />

          {/* Loading overlay with time estimate */}
          {loading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <div style={{ position: "relative", width: 64, height: 64 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.12)", borderTopColor: "#e8b820", animation: "spin 1s linear infinite" }} />
                <Sparkles style={{ position: "absolute", inset: 0, margin: "auto", width: 22, height: 22, color: "#e8b820" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: 600, margin: 0 }}>Placing your garment…</p>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, margin: "4px 0 0" }}>
                  About {secondsLeft}s remaining
                </p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && !loading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
              <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", margin: 0 }}>{error}</p>
              <button onClick={runGeneration} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "white", fontSize: 13, cursor: "pointer" }}>
                <RefreshCw style={{ width: 14, height: 14 }} /> Retry
              </button>
            </div>
          )}
        </div>

        {/* Around-items: magazine-style, arranged down the right edge */}
        {aroundItems.length > 0 && (
          <div style={{ position: "absolute", top: 8, right: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {aroundItems.map(item => {
              const img = item.processed_image_url || item.original_image_url;
              return (
                <div key={item.placedId} style={{ position: "relative", width: 64, height: 64, borderRadius: 12, background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 14px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
                  {img ? <img src={img} alt={item.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 24 }}>👜</span>}
                  <button
                    onClick={() => onRemove(item.placedId)}
                    title="Remove"
                    style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "white", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}
                  >
                    <X style={{ width: 11, height: 11 }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completion hint */}
      {hint && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(232,184,32,0.12)", border: "1px solid rgba(232,184,32,0.4)", borderRadius: 10, padding: "8px 14px" }}>
          <AlertTriangle style={{ width: 16, height: 16, color: "#e8b820", flexShrink: 0 }} />
          <p style={{ color: "#f3d27a", fontSize: 13, margin: 0 }}>{hint}</p>
        </div>
      )}
      {complete && picked.length > 0 && !loading && !error && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
          Looking good — add shoes or accessories to finish.
        </p>
      )}

      {/* Quality warning */}
      {warn && !loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 10, padding: "8px 14px" }}>
          <AlertTriangle style={{ width: 14, height: 14, color: "#facc15", flexShrink: 0 }} />
          <p style={{ color: "rgba(253,224,71,0.85)", fontSize: 12, margin: 0 }}>
            Result may not be perfect. Remove and re-pick the item to try again.
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
