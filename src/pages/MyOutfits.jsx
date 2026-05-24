import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Globe, Lock, Edit, Share2, Check, Luggage, CheckSquare, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import LookbookExport from "@/components/outfits/LookbookExport";

export default function MyOutfits() {
  const [user, setUser] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedOutfits, setSelectedOutfits] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const all = await base44.entities.Outfit.filter({ user_email: u.email }, "-created_date");
      setOutfits(all);
      setLoading(false);
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const handleDelete = async (id) => {
    await base44.entities.Outfit.delete(id);
    setOutfits(prev => prev.filter(o => o.id !== id));
  };

  const handleShare = async (outfit) => {
    if (!outfit.is_public) {
      await base44.entities.Outfit.update(outfit.id, { is_public: true });
      setOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, is_public: true } : o));
    }
    const link = `${window.location.origin}/Explore?outfitId=${outfit.id}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(outfit.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePublic = async (outfit) => {
    const updated = await base44.entities.Outfit.update(outfit.id, { is_public: !outfit.is_public });
    setOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, is_public: updated.is_public } : o));
  };

  const toggleSelect = (id) => {
    setSelectedOutfits(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedOutfits(new Set(outfits.map(o => o.id)));
  };

  const clearSelection = () => {
    setSelectedOutfits(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedOutfits.size === 0) return;
    setBulkDeleting(true);
    await Promise.all(Array.from(selectedOutfits).map(id => base44.entities.Outfit.delete(id)));
    setOutfits(prev => prev.filter(o => !selectedOutfits.has(o.id)));
    setSelectedOutfits(new Set());
    setBulkDeleting(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white tracking-tight">My outfits</h1>
            <p className="text-white/50 mt-1 font-body">
              {outfits.length} saved outfits
              {selectedOutfits.size > 0 && (
                <span className="ml-2 text-[#e8b820]">{selectedOutfits.size} selected</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {selectedOutfits.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {bulkDeleting ? "Deleting..." : `Delete ${selectedOutfits.size}`}
                </Button>
              </>
            )}
            <LookbookExport outfits={outfits} />
            <Link to={createPageUrl("PackingLists")}>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                <Luggage className="w-4 h-4 mr-1" /> Packing Lists
              </Button>
            </Link>
            <Link to={createPageUrl("OutfitBuilder")}>
              <Button className="bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-semibold">
                <Plus className="mr-2 w-4 h-4" /> New Outfit
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white/10 rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">✨</p>
            <p className="text-white/60 text-lg">No outfits yet</p>
            <p className="text-white/30 text-sm mb-6">Create your first outfit in the builder</p>
            <Link to={createPageUrl("OutfitBuilder")}>
              <Button className="bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-semibold">
                <Plus className="mr-2 w-4 h-4" /> Create Outfit
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {selectedOutfits.size > 0 && selectedOutfits.size < outfits.length && (
              <Button
                variant="ghost"
                onClick={selectAll}
                className="w-full mb-4 text-white/50 hover:text-white hover:bg-white/10"
              >
                Select all ({outfits.length - selectedOutfits.size} more)
              </Button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {outfits.map(outfit => (
                <div key={outfit.id} className={`bg-white/5 border rounded-2xl overflow-hidden transition ${
                  selectedOutfits.has(outfit.id) ? "border-[#e8b820] bg-[#e8b820]/10" : "border-white/10 hover:border-yellow-300/40"
                }`}>
                  <div className="relative">
                    <button
                      onClick={() => toggleSelect(outfit.id)}
                      className="absolute top-3 left-3 z-10 text-white hover:scale-110 transition"
                    >
                      {selectedOutfits.has(outfit.id) ? (
                        <CheckSquare className="w-6 h-6 text-[#e8b820]" />
                      ) : (
                        <Square className="w-6 h-6 text-white/40 hover:text-white" />
                      )}
                    </button>
                    <div className="h-36 bg-white/5 flex items-center justify-center overflow-hidden">
                      {outfit.magazine_url || outfit.outfit_snapshot_url ? (
                        <img src={outfit.magazine_url || outfit.outfit_snapshot_url} className="w-full h-full object-cover" alt={outfit.name} />
                      ) : (
                        <span className="text-6xl">👗</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-heading font-bold text-white uppercase truncate">{outfit.name}</h3>
                      <button onClick={() => togglePublic(outfit)} className="ml-2 text-white/30 hover:text-yellow-300 transition">
                        {outfit.is_public ? <Globe className="w-4 h-4 text-yellow-300" /> : <Lock className="w-4 h-4" />}
                      </button>
                    </div>
                  {outfit.occasion && (
                    <Badge className="bg-[#d4a017] text-[#373d47] font-semibold border-0 text-xs capitalize mb-2">{outfit.occasion}</Badge>
                  )}
                  <p className="text-xs text-white/30">{format(new Date(outfit.created_date), "MMM d, yyyy")}</p>
                  <div className="flex gap-2 mt-3">
                  <Link to={`${createPageUrl("OutfitBuilder")}?outfitId=${outfit.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs border-white/20 text-white hover:bg-white/10 bg-transparent">
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="text-white/40 hover:text-white hover:bg-white/10"
                    onClick={() => handleShare(outfit)}>
                    {copiedId === outfit.id ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                  </Button>
                  {!selectedOutfits.has(outfit.id) && (
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => handleDelete(outfit.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}