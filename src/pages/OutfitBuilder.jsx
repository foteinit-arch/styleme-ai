import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Wand2, Save } from "lucide-react";
import AITryOnCanvas from "@/components/builder/AITryOnCanvas";
import ClothingPicker from "@/components/builder/ClothingPicker";
import SaveOutfitModal from "@/components/builder/SaveOutfitModal";
import SnapshotsGallery from "@/components/builder/SnapshotsGallery";
import { isDress } from "@/components/builder/tryOnEngine";

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
      // Replace the current selection in one go so AI generates the full look once.
      setPicked(matched.map((item, i) => ({
        ...item,
        placedId: Date.now() + i,
        z_index: i + 1,
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
                z_index: itemData.z_index || idx + 1,
              };
            }).filter(Boolean);
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

  // ── Pick / remove ───────────────────────────────────────────────────────────
  // Picking a garment adds it to the look. A dress is a one-piece: picking one
  // clears any existing top/bottom; picking a top/bottom clears any dress.
  const handlePick = (item) => {
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
        z_index: next.length + 1,
      }];
    });
  };

  const handleRemovePicked = (placedId) => {
    setPicked(prev => prev.filter(p => p.placedId !== placedId));
  };

  const handleClear = (e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    setPicked([]);
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
          <Button variant="outline" size="sm" onClick={() => setShowSuggest(true)} disabled={clothes.length === 0} className="text-purple-300 border-purple-500/40 bg-transparent hover:bg-purple-500/10 disabled:opacity-40">
            <Wand2 className="w-4 h-4 mr-1" /> Suggest Outfit
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

        {/* Center: AI try-on canvas */}
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <AITryOnCanvas
              profile={profile}
              picked={picked}
              onRemove={handleRemovePicked}
            />
          </div>
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
          snapshotUrl={savingSnapshot?.snapshot_url}
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