import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Plus, Check } from "lucide-react";

export default function PackingListDetail({ list, outfits, onUpdated }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const packedOutfits = outfits.filter(o => (list.outfit_ids || []).includes(o.id));
  const unpacked = outfits.filter(o => !(list.outfit_ids || []).includes(o.id));

  const addOutfit = async (outfitId) => {
    setSaving(true);
    const newIds = [...(list.outfit_ids || []), outfitId];
    const updated = await base44.entities.PackingList.update(list.id, { outfit_ids: newIds });
    onUpdated({ ...list, outfit_ids: newIds });
    setSaving(false);
  };

  const removeOutfit = async (outfitId) => {
    const newIds = (list.outfit_ids || []).filter(id => id !== outfitId);
    await base44.entities.PackingList.update(list.id, { outfit_ids: newIds });
    onUpdated({ ...list, outfit_ids: newIds });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-white text-lg">{list.name}</h3>
        <Button size="sm" onClick={() => setAdding(a => !a)}
          className={adding ? "bg-white/10 text-white border border-white/20 hover:bg-white/20" : "bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold"}>
          {adding ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4 mr-1" /> Add Outfits</>}
        </Button>
      </div>

      {/* Add outfits picker */}
      {adding && (
        <div className="mb-4 border border-white/10 rounded-lg overflow-hidden">
          <p className="text-white/40 text-xs font-body px-3 pt-2 pb-1">Click to add to list</p>
          <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
            {unpacked.length === 0 ? (
              <p className="text-white/30 text-xs font-body px-3 py-3">All outfits already added</p>
            ) : unpacked.map(outfit => (
              <button key={outfit.id} onClick={() => addOutfit(outfit.id)} disabled={saving}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 transition text-left">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                  {outfit.magazine_url || outfit.outfit_snapshot_url ? (
                    <img src={outfit.magazine_url || outfit.outfit_snapshot_url} className="w-full h-full object-cover" alt={outfit.name} />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-lg">👗</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-body truncate">{outfit.name}</p>
                  {outfit.occasion && <p className="text-white/30 text-xs capitalize">{outfit.occasion}</p>}
                </div>
                <Plus className="w-4 h-4 text-white/30 ml-auto flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Packed outfits */}
      {packedOutfits.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-2">🧳</p>
          <p className="text-white/30 text-sm font-body">No outfits in this list yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {packedOutfits.map(outfit => (
            <div key={outfit.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                {outfit.magazine_url || outfit.outfit_snapshot_url ? (
                  <img src={outfit.magazine_url || outfit.outfit_snapshot_url} className="w-full h-full object-cover" alt={outfit.name} />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-lg">👗</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-body truncate">{outfit.name}</p>
                {outfit.occasion && <p className="text-white/30 text-xs capitalize">{outfit.occasion}</p>}
              </div>
              <button onClick={() => removeOutfit(outfit.id)} className="text-white/20 hover:text-red-400 transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}