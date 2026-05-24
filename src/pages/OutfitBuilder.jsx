import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, Sparkles } from "lucide-react";
import AvatarCanvas from "@/components/builder/AvatarCanvas";
import ClothingPicker from "@/components/builder/ClothingPicker";
import SaveOutfitModal from "@/components/builder/SaveOutfitModal";
import SnapshotsGallery from "@/components/builder/SnapshotsGallery";
import TryOnModal from "@/components/builder/TryOnModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OutfitBuilder() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [clothes, setClothes] = useState([]);
  const [placed, setPlaced]   = useState([]);
  const [showSave, setShowSave] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [savingSnapshot, setSavingSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingOutfitId, setEditingOutfitId] = useState(null);

  // Shoe try-on (AI modal)
  const [showTryOn, setShowTryOn] = useState(false);
  const avatarCanvasRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outfitId = params.get("outfitId");
    if (outfitId) setEditingOutfitId(outfitId);

    base44.auth.me().then(async (u) => {
      setUser(u);
      const [profiles, items] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }),
        base44.entities.ClothingItem.filter({ user_email: u.email }, "-created_date"),
      ]);
      if (profiles.length > 0) setProfile(profiles[0]);
      setClothes(items);

      if (outfitId) {
        const outfit = await base44.entities.Outfit.filter({ id: outfitId });
        if (outfit.length > 0) {
          const loadedOutfit = outfit[0];
          if (profiles.length > 0) {
            const originalProfile = { ...profiles[0], avatar_generated_url: null };
            setProfile(originalProfile);
          }
          if (loadedOutfit.items && loadedOutfit.items.length > 0) {
            const reconstructed = loadedOutfit.items.map((itemData, idx) => {
              const clothingItem = items.find(c => c.id === itemData.clothing_item_id);
              if (!clothingItem) return null;
              return {
                ...clothingItem,
                x: itemData.x,
                y: itemData.y,
                scale: itemData.scale,
                rotation: itemData.rotation,
                placedId: Date.now() + idx,
                z_index: itemData.z_index || idx + 1,
              };
            }).filter(Boolean);
            setPlaced(reconstructed);
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

  const categoryPositions = {
    top:       { x: 160, y: 260, scale: 1.4 },
    bottom:    { x: 160, y: 355, scale: 1.5 },
    dress:     { x: 160, y: 250, scale: 2.2 },
    shoes:     { x: 160, y: 550, scale: 0.6  },
    outerwear: { x: 160, y: 235, scale: 1.5 },
    accessory: { x: 160, y: 75,  scale: 0.7 },
    bag:       { x: 160, y: 410, scale: 0.9 },
  };

  const handleDrop = (item) => {
    const pos = categoryPositions[item.category] || { x: 160, y: 300, scale: 1.0 };
    const measurementRatio = {
      top:       (profile?.bust_cm   || 88)  / 88,
      outerwear: (profile?.bust_cm   || 88)  / 88,
      dress:     (profile?.bust_cm   || 88)  / 88,
      bottom:    (profile?.hips_cm   || 94)  / 94,
      shoes:     (profile?.height_cm || 165) / 165,
      accessory: 1,
      bag:       1,
    }[item.category] ?? 1;

    setPlaced(prev => [...prev, {
      ...item,
      placedId: Date.now() + Math.random(),
      x: pos.x,
      y: pos.y,
      scale: (pos.scale ?? 1.0) * measurementRatio,
      rotation: 0,
      z_index: prev.length + 1,
    }]);
  };

  const handleUpdate = (updatedItem) => {
    setPlaced(prev => prev.map(p => p.placedId === updatedItem.placedId ? updatedItem : p));
  };

  const handleRemovePlaced = (placedId) => {
    setPlaced(prev => prev.filter(p => p.placedId !== placedId));
  };

  const handleSendToBack = (placedId) => {
    setPlaced(prev => {
      const idx = prev.findIndex(p => p.placedId === placedId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  };

  const handleBringToFront = (placedId) => {
    setPlaced(prev => {
      const idx = prev.findIndex(p => p.placedId === placedId);
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.push(item);
      return next;
    });
  };

  const handleClear = () => setPlaced([]);

  const handleTryShoes = () => setShowTryOn(true);

  // ── Snapshots ─────────────────────────────────────────────────────────────
  const handleSnapshotSaved = (snapshot) => {
    setSnapshots(prev => [...prev, snapshot]);
    setProfile(prev => ({ ...prev, avatar_generated_url: snapshot.snapshot_url }));
    setPlaced(prev => prev.filter(p => p.category !== 'shoes'));
  };

  const handleSaveOutfitFromSnapshot = (snapshot) => {
    setSavingSnapshot(snapshot);
    setShowSave(true);
    const restored = (snapshot.placed_items || []).map((item, idx) => ({
      ...item,
      placedId: item.placedId || Date.now() + idx,
    }));
    setPlaced(restored);
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
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="font-heading font-bold text-white text-2xl tracking-tight">Outfit builder</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} className="text-white/60 border-white/20 bg-transparent hover:bg-white/10">
            <RotateCcw className="w-4 h-4 mr-1" /> Clear
          </Button>
          <Button
            onClick={handleTryShoes}
            disabled={!placed.some(p => p.category === 'shoes')}
            className="bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            size="sm"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Try Shoes
          </Button>
          <Button onClick={() => setShowSave(true)} disabled={placed.length === 0} variant="outline" className="text-white/60 border-white/20 bg-transparent hover:bg-white/10 disabled:opacity-40" size="sm">
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: clothing picker */}
        <div className="md:w-72 border-r border-white/10 bg-[#111] overflow-y-auto">
          <ClothingPicker clothes={clothes} onDrop={handleDrop} />
        </div>

        {/* Center: avatar canvas */}
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <AvatarCanvas
              ref={avatarCanvasRef}
              profile={profile}
              placed={placed}
              onUpdate={handleUpdate}
              onRemove={handleRemovePlaced}
              onSendToBack={handleSendToBack}
              onBringToFront={handleBringToFront}
            />
          </div>
          <SnapshotsGallery snapshots={snapshots} onSaveOutfit={handleSaveOutfitFromSnapshot} onDelete={handleDeleteSnapshot} />
        </div>
      </div>

      {showTryOn && (
        <TryOnModal
          profile={profile}
          placed={placed}
          onClose={() => setShowTryOn(false)}
          onSnapshotSaved={(snapshot) => {
            setProfile(prev => ({ ...prev, avatar_generated_url: snapshot.snapshot_url }));
            setPlaced(prev => prev.filter(p => p.category !== 'shoes'));
            setShowTryOn(false);
          }}
        />
      )}

      {showSave && (
        <SaveOutfitModal
          userEmail={user?.email}
          placed={placed}
          snapshotUrl={savingSnapshot?.snapshot_url}
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