import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Share2, Trash2, RotateCcw, ArrowLeft } from "lucide-react";
import AvatarCanvas from "@/components/builder/AvatarCanvas";
import ClothingPicker from "@/components/builder/ClothingPicker";
import SaveOutfitModal from "@/components/builder/SaveOutfitModal";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function OutfitBuilder() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [clothes, setClothes] = useState([]);
  const [placed, setPlaced] = useState([]); // items placed on avatar
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
    top:       { x: 80, y: 180 },
    bottom:    { x: 80, y: 320 },
    dress:     { x: 80, y: 180 },
    shoes:     { x: 90, y: 480 },
    outerwear: { x: 70, y: 160 },
    accessory: { x: 110, y: 100 },
    bag:       { x: 20, y: 300 },
  };

  const handleDrop = (item) => {
    const pos = categoryPositions[item.category] || { x: 80, y: 200 };
    setPlaced(prev => [...prev, {
      ...item,
      placedId: Date.now() + Math.random(),
      x: pos.x,
      y: pos.y,
      scale: 0.9,
      rotation: 0,
      z_index: prev.length,
    }]);
  };

  const handleUpdate = (placedId, updates) => {
    setPlaced(prev => prev.map(p => p.placedId === placedId ? { ...p, ...updates } : p));
  };

  const handleRemovePlaced = (placedId) => {
    setPlaced(prev => prev.filter(p => p.placedId !== placedId));
  };

  const handleClear = () => setPlaced([]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading your wardrobe...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-rose-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Wardrobe")}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Outfit Builder</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear} className="text-gray-500">
            <RotateCcw className="w-4 h-4 mr-1" /> Clear
          </Button>
          <Button onClick={() => setShowSave(true)} className="bg-rose-500 hover:bg-rose-600 text-white" size="sm">
            <Save className="w-4 h-4 mr-1" /> Save Outfit
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: clothing picker */}
        <div className="md:w-72 border-r border-rose-100 bg-white overflow-y-auto">
          <ClothingPicker clothes={clothes} onDrop={handleDrop} />
        </div>

        {/* Center: avatar canvas */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <AvatarCanvas
            profile={profile}
            placed={placed}
            onUpdate={handleUpdate}
            onRemove={handleRemovePlaced}
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