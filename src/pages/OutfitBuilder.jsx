import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Wand2, Save, Sparkles, Image as ImageIcon } from "lucide-react";
import AvatarCanvas from "@/components/builder/AvatarCanvas";
import ClothingPicker from "@/components/builder/ClothingPicker";
import SaveOutfitModal from "@/components/builder/SaveOutfitModal";
import SnapshotsGallery from "@/components/builder/SnapshotsGallery";
import { isDress, defaultPlacement } from "@/components/builder/outfitLayout";
import { measureImage, detectBody, fitItem } from "@/components/builder/autoFit";

export default function OutfitBuilder() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [clothes, setClothes] = useState([]);
  const [picked, setPicked]   = useState([]);
  const [showSave, setShowSave] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [savingSnapshot, setSavingSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingOutfit, setEditingOutfit] = useState(null);
  // AI try-on: a rendered photo of the wearer actually wearing the picked garments.
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState(null);
  const [showRender, setShowRender] = useState(false);
  const [renderError, setRenderError] = useState(null);
  // Try On needs the 18+ photo confirmation ticked on My Avatar.
  const [consentNotice, setConsentNotice] = useState(false);
  // Body landmarks of the avatar photo, used to auto-fit garments with no manual tweaking.
  const [fitCtx, setFitCtx] = useState(null);
  const fitReadyRef = useRef(Promise.resolve(null));
  const pickedRef = useRef([]);
  pickedRef.current = picked;
  // An outfit opened from the wardrobe was saved before the current fit rules, so it
  // gets re-fitted to the body as soon as the avatar's proportions are known.
  const refitOnLoadRef = useRef(false);

  // Suggest outfit
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const OCCASIONS = ['Casual Day', 'Work Meeting', 'Date Night', 'Wedding Guest', 'Weekend Brunch'];

  const handleSuggestOutfit = async (occasion) => {
    setSuggesting(true);
    const itemList = clothes.map(c => `${c.name} (${c.category})`).join(', ');
    const prompt = `I have these clothing items in my wardrobe: ${itemList}. Suggest the best outfit combination for: ${occasion}. Reply ONLY with a JSON array of item names that work together, maximum 4 items, one per category. Example: ["White blouse", "Black trousers", "Black heels"]`;
    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      const jsonMatch = result.match(/\[.*\]/s);
      if (!jsonMatch) throw new Error("No JSON array found");
      const names = JSON.parse(jsonMatch[0]);
      const matched = names.map(name =>
        clothes.find(c => c.name?.toLowerCase() === name?.toLowerCase())
      ).filter(Boolean);
      // Replace the current selection in one go with the suggested look, fitted to the body.
      const ctx = fitCtx || (await fitReadyRef.current);
      const placements = await Promise.all(matched.map((item) => fitItem(item, ctx)));
      setPicked(matched.map((item, i) => ({
        ...item,
        placedId: Date.now() + i,
        ...(placements[i] || defaultPlacement(item.category)),
      })));
      setShowSuggest(false);
    } catch (err) {
      console.error(err);
    }
    setSuggesting(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outfitId = params.get("outfitId");

    base44.auth.me().then(async (u) => {
      setUser(u);
      const [profiles, items] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }),
        base44.entities.ClothingItem.filter({ user_email: u.email }, "-created_date"),
      ]);
      if (profiles.length > 0) setProfile(profiles[0]);
      setClothes(items);

      if (outfitId) {
        const outfits = await base44.entities.Outfit.filter({ id: outfitId });
        if (outfits.length > 0) {
          const loadedOutfit = outfits[0];
          setEditingOutfit(loadedOutfit);
          if (loadedOutfit.items && loadedOutfit.items.length > 0) {
            const reconstructed = loadedOutfit.items.map((itemData, idx) => {
              const clothingItem = items.find(c => c.id === itemData.clothing_item_id);
              if (!clothingItem) return null;
              return {
                ...clothingItem,
                placedId: Date.now() + idx,
                x: itemData.x ?? 50,
                y: itemData.y ?? 50,
                scale: itemData.scale ?? 1,
                stretch: itemData.stretch ?? 1,
                rotation: itemData.rotation ?? 0,
                z_index: itemData.z_index || idx + 1,
              };
            }).filter(Boolean);
            refitOnLoadRef.current = reconstructed.length > 0;
            setPicked(reconstructed);
          }
        }
      }

      setLoading(false);
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  useEffect(() => {
    const handleAvatarUpdate = async (e) => {
      const updatedProfile = e.detail;
      setProfile(updatedProfile);
      if (user?.email) {
        const fresh = await base44.entities.UserProfile.filter({ user_email: user.email });
        if (fresh.length > 0) setProfile(fresh[0]);
      }
    };
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, [user]);

  // Read the avatar's proportions once, so every garment can be placed on the body.
  const avatarUrl = profile?.avatar_generated_url || profile?.avatar_photo_url;
  useEffect(() => {
    if (!avatarUrl) { setFitCtx(null); fitReadyRef.current = Promise.resolve(null); return; }
    let cancelled = false;
    const ready = (async () => {
      const avatar = await measureImage(avatarUrl);
      let body = null;
      try {
        body = await detectBody(avatarUrl);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[OutfitBuilder] body detection failed:", e?.message);
      }
      const ctx = { avatar, body };
      if (!cancelled) setFitCtx(ctx);
      return ctx;
    })();
    fitReadyRef.current = ready;
    return () => { cancelled = true; };
  }, [avatarUrl]);

  useEffect(() => {
    if (!fitCtx || !refitOnLoadRef.current) return;
    refitOnLoadRef.current = false;
    const items = pickedRef.current;
    if (items.length === 0) return;
    Promise.all(items.map(async (p) => {
      const fit = await fitItem(p, fitCtx);
      return fit ? { ...p, ...fit } : p;
    })).then(setPicked);
  }, [fitCtx]);

  // ── Pick / remove ───────────────────────────────────────────────────────────
  // Picking a garment adds it to the look. A dress is a one-piece: picking one
  // clears any existing top/bottom; picking a top/bottom clears any dress.
  const handlePick = async (item) => {
    const ctx = fitCtx || (await fitReadyRef.current);
    const fit = await fitItem(item, ctx);
    setPicked(prev => {
      let next = [...prev];

      if (isDress(item.category)) {
        // Remove any top/bottom/dress — dress replaces them.
        next = next.filter(p => !["top", "bottom", "dress"].includes(p.category));
      } else if (item.category === "top" || item.category === "bottom") {
        // Adding a top/bottom invalidates a dress.
        next = next.filter(p => p.category !== "dress");
        // Only one of each of these categories at a time — replace same category.
        next = next.filter(p => p.category !== item.category);
      } else {
        // shoes / outerwear / underwear / bag / accessory — one per category
        // except accessories/bags which can stack.
        if (["top", "bottom", "dress", "shoes", "outerwear", "underwear"].includes(item.category)) {
          next = next.filter(p => p.category !== item.category);
        }
      }

      return [...next, {
        ...item,
        placedId: Date.now() + Math.random(),
        ...(fit || defaultPlacement(item.category)),
      }];
    });
  };

  const handleRemovePicked = (placedId) => {
    setPicked(prev => prev.filter(p => p.placedId !== placedId));
  };

  const handleUpdatePicked = (placedId, changes) => {
    setPicked(prev => prev.map(p => (p.placedId === placedId ? { ...p, ...changes } : p)));
  };

  const handleClear = (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setPicked([]);
  };

  // Re-fit everything currently on the canvas to the body in one tap.
  const handleRefit = async () => {
    const ctx = fitCtx || (await fitReadyRef.current);
    if (!ctx?.body || picked.length === 0) return;
    const fitted = await Promise.all(picked.map(async (p) => {
      const fit = await fitItem(p, ctx);
      return fit ? { ...p, ...fit } : p;
    }));
    setPicked(fitted);
  };

  // ── AI try-on ─────────────────────────────────────────────────────────────
  // Sends the avatar photo plus the picked garment cutouts to the try-on renderer,
  // which returns a photo of the person actually wearing the look.
  const handleTryOn = async () => {
    if (!avatarUrl || picked.length === 0 || rendering) return;
    if (!profile?.photo_consent) {
      setConsentNotice(true);
      return;
    }
    setConsentNotice(false);
    setRendering(true);
    setRenderError(null);
    try {
      const items = picked
        .map(p => ({
          name: p.name,
          category: p.category,
          image_url: p.processed_image_url || p.original_image_url,
        }))
        .filter(i => i.image_url);
      const res = await base44.functions.invoke("tryOn", { avatar_url: avatarUrl, items });
      if (!res.data?.image_url) throw new Error(res.data?.error || "Try-on failed");
      setRenderUrl(res.data.image_url);
      setShowRender(true);
    } catch (err) {
      setRenderError(err?.response?.data?.error || err?.message || "Try-on failed");
    } finally {
      setRendering(false);
    }
  };

  // ── Snapshots ─────────────────────────────────────────────────────────────
  const handleSaveOutfitFromSnapshot = (snapshot) => {
    setSavingSnapshot(snapshot);
    setShowSave(true);
    const restored = (snapshot.placed_items || []).map((item, idx) => ({
      ...item,
      placedId: item.placedId || Date.now() + idx,
    }));
    setPicked(restored);
  };

  const handleDeleteSnapshot = (idx) => {
    setSnapshots(prev => prev.filter((_, i) => i !== idx));
  };

  const handleOutfitSaved = async () => {
    if (user?.email) {
      const fresh = await base44.entities.UserProfile.filter({ user_email: user.email });
      if (fresh.length > 0) setProfile(fresh[0]);
    }
    setShowSave(false);
    setSavingSnapshot(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <p className="text-white/40 text-lg font-body">Loading your wardrobe...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-4rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-white text-2xl tracking-tight">Outfit builder</h1>
          {editingOutfit && (
            <p className="text-[#e8b820] text-xs font-body mt-0.5">Editing: {editingOutfit.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} onTouchEnd={handleClear} className="text-white/60 border-white/20 bg-transparent hover:bg-white/10">
            <RotateCcw className="w-4 h-4 mr-1" /> Clear
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefit} disabled={picked.length === 0} className="text-[#e8b820] border-[#e8b820]/40 bg-transparent hover:bg-[#e8b820]/10 disabled:opacity-40">
            <Wand2 className="w-4 h-4 mr-1" /> Fit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSuggest(true)} disabled={clothes.length === 0} className="text-purple-300 border-purple-500/40 bg-transparent hover:bg-purple-500/10 disabled:opacity-40">
            <Wand2 className="w-4 h-4 mr-1" /> Suggest Outfit
          </Button>
          <Button onClick={handleTryOn} disabled={picked.length === 0 || rendering || !avatarUrl} className="bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold disabled:opacity-40" size="sm">
            <Sparkles className="w-4 h-4 mr-1" /> Try On
          </Button>
          <Button onClick={() => setShowSave(true)} disabled={picked.length === 0} variant="outline" className="text-white/60 border-white/20 bg-transparent hover:bg-white/10 disabled:opacity-40" size="sm">
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: clothing picker */}
        <div className="md:w-72 border-r border-white/10 bg-[#111] overflow-y-auto no-scrollbar pb-[env(safe-area-inset-bottom)]">
          <ClothingPicker clothes={clothes} onPick={handlePick} pickedIds={picked.map(p => p.id)} />
        </div>

        {/* Center: manual outfit canvas */}
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {rendering ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#e8b820] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/60 text-sm font-body">Dressing you in this look…</p>
              </div>
            ) : showRender && renderUrl ? (
              <div className="relative h-full w-full flex items-center justify-center">
                <img src={renderUrl} alt="AI try-on" className="max-h-full max-w-full object-contain rounded-3xl" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRender(false)}
                  className="absolute top-2 left-2 text-white/80 border-white/20 bg-black/50 hover:bg-black/70 backdrop-blur"
                >
                  <ImageIcon className="w-4 h-4 mr-1" /> Canvas
                </Button>
                <a
                  href={`mailto:hello@virtuallydressed.app?subject=${encodeURIComponent("Report image")}&body=${encodeURIComponent(`Please review this try-on image: ${renderUrl}\n\nAccount: ${user?.email || "unknown"}`)}`}
                  className="absolute bottom-2 right-2 text-[11px] font-body text-white/60 underline underline-offset-2 bg-black/40 hover:bg-black/70 hover:text-white backdrop-blur px-2 py-1 rounded"
                >
                  Report image
                </a>
              </div>
            ) : (
              <AvatarCanvas
                profile={profile}
                picked={picked}
                onUpdate={handleUpdatePicked}
                onRemove={handleRemovePicked}
              />
            )}
          </div>
          {renderError && (
            <p className="text-red-400 text-xs text-center pb-2 font-body">{renderError}</p>
          )}
          {consentNotice && (
            <p className="text-yellow-300 text-xs text-center pb-2 font-body">
              Set up your avatar first.{" "}
              <Link to="/Avatar" className="underline underline-offset-2 hover:text-yellow-200">
                Go to My Avatar
              </Link>
            </p>
          )}
          <SnapshotsGallery snapshots={snapshots} onSaveOutfit={handleSaveOutfitFromSnapshot} onDelete={handleDeleteSnapshot} />
        </div>
      </div>

      {showSuggest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          style={{
            paddingTop: 'calc(1rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
            paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
            paddingRight: 'calc(1rem + env(safe-area-inset-right))',
          }}
          onClick={() => !suggesting && setShowSuggest(false)}
        >
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-white font-heading font-bold text-xl">Suggest Outfit</h2>
            </div>
            <p className="text-white/50 text-sm font-body mb-4">Pick an occasion and AI will suggest the best combination from your wardrobe.</p>
            {suggesting ? (
              <div className="flex items-center justify-center py-6 gap-3">
                <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-white/60 text-sm font-body">Styling your outfit…</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {OCCASIONS.map(occ => (
                  <button key={occ} onClick={() => handleSuggestOutfit(occ)}
                    className="text-left px-4 py-2.5 rounded-lg bg-white/5 hover:bg-purple-500/20 text-white/80 hover:text-white text-sm font-body transition-colors border border-white/5 hover:border-purple-500/40">
                    {occ}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showSave && (
        <SaveOutfitModal
          userEmail={user?.email}
          placed={picked}
          snapshotUrl={savingSnapshot?.snapshot_url || (showRender ? renderUrl : null)}
          editingOutfit={savingSnapshot ? null : editingOutfit}
          onClose={() => {
            setShowSave(false);
            setSavingSnapshot(null);
          }}
          onSaved={handleOutfitSaved}
        />
      )}
    </div>
  );
}