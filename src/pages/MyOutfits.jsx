import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Globe, Lock, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function MyOutfits() {
  const [user, setUser] = useState(null);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const togglePublic = async (outfit) => {
    const updated = await base44.entities.Outfit.update(outfit.id, { is_public: !outfit.is_public });
    setOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, is_public: updated.is_public } : o));
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold uppercase text-4xl md:text-5xl text-yellow-300 tracking-tight">My Outfits</h1>
            <p className="text-white/50 mt-1 font-body">{outfits.length} saved outfits</p>
          </div>
          <Link to={createPageUrl("OutfitBuilder")}>
            <Button className="bg-yellow-300 hover:bg-yellow-400 text-black font-semibold">
              <Plus className="mr-2 w-4 h-4" /> New Outfit
            </Button>
          </Link>
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
              <Button className="bg-yellow-300 hover:bg-yellow-400 text-black font-semibold">
                <Plus className="mr-2 w-4 h-4" /> Create Outfit
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {outfits.map(outfit => (
              <div key={outfit.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-yellow-300/40 transition">
                <div className="h-36 bg-white/5 flex items-center justify-center">
                  {outfit.outfit_snapshot_url ? (
                    <img src={outfit.outfit_snapshot_url} className="h-full object-contain" alt={outfit.name} />
                  ) : (
                    <span className="text-6xl">👗</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-heading font-bold text-white uppercase truncate">{outfit.name}</h3>
                    <button onClick={() => togglePublic(outfit)} className="ml-2 text-white/30 hover:text-yellow-300 transition">
                      {outfit.is_public ? <Globe className="w-4 h-4 text-yellow-300" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>
                  {outfit.occasion && (
                    <Badge className="bg-yellow-300/20 text-yellow-300 border-0 text-xs capitalize mb-2">{outfit.occasion}</Badge>
                  )}
                  <p className="text-xs text-white/30">{format(new Date(outfit.created_date), "MMM d, yyyy")}</p>
                  <div className="flex gap-2 mt-3">
                    <Link to={createPageUrl("OutfitBuilder")} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs border-white/20 text-white hover:bg-white/10 bg-transparent">
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => handleDelete(outfit.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}