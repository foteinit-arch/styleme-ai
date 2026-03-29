import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, ArrowLeft } from "lucide-react";
import AvatarCanvas from "@/components/builder/AvatarCanvas";
import ClothingPicker from "@/components/builder/ClothingPicker";
import SaveOutfitModal from "@/components/builder/SaveOutfitModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OutfitBuilder() {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [clothes, setClothes] = useState([]);
  const [placed, setPlaced]   = useState([]);
  const [showSave, setShowSave] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const [profiles, items] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }),
        base44.entities.ClothingItem.filter({ user_email: u.email }, "-created_date"),
      ]);
      if (profiles.length > 0) setProfile(profiles[0]);
      setClothes(items);
      setLoading(false);
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const categoryPositions = {
    top:       { x: 160, y: 260, scale: 1.4 },
    bottom:    { x: 160, y: 355, scale: 1.5 },
    dress:     { x: 160, y: 250, scale: 1.6 },
    shoes:     { x: 160, y: 596, scale: 0.6  },
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

  // DraggableClothingItem calls onUpdate(updatedItem) — full item object
  const handleUpdate = (updatedItem) => {
    setPlaced(prev => prev.map(p => p.placedId === updatedItem.placedId ? updatedItem : p));
  };

  const handleRemovePlaced = (placedId) => {
    setPlaced(prev => prev.filter(p => p.placedId !== placedId));
  };

  // Layer control via DOM order (last in array = rendered on top)
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
      <div className="bg-[#111] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Wardrobe")}>
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="font-heading font-bold uppercase text-yellow-300 text-xl tracking-tight">Outfit Builder</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} className="text-white/60 border-white/20 bg-transparent hover:bg-white/10">
            <RotateCcw className="w-4 h-4 mr-1" /> Clear
          </Button>
          <Button onClick={() => setShowSave(true)} className="bg-yellow-300 hover:bg-yellow-400 text-black font-semibold" size="sm">
            <Save className="w-4 h-4 mr-1" /> Save Outfit
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: clothing picker */}
        <div className="md:w-72 border-r border-white/10 bg-[#111] overflow-y-auto">
          <ClothingPicker clothes={clothes} onDrop={handleDrop} />
        </div>

        {/* Center: avatar canvas */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <AvatarCanvas
            profile={profile}
            placed={placed}
            onUpdate={handleUpdate}
            onRemove={handleRemovePlaced}
            onSendToBack={handleSendToBack}
            onBringToFront={handleBringToFront}
          />
        </div>
      </div>

      {showSave && user && (
        <SaveOutfitModal
          userEmail={user.email}
          placed={placed}
          onClose={() => setShowSave(false)}
          onSaved={() => setShowSave(false)}
        />
      )}
    </div>
  );
}