import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

export default function SnapshotsGallery({ snapshots, onSaveOutfit, onDelete }) {
  if (snapshots.length === 0) return null;

  return (
    <div className="bg-[#111] border-t border-white/10 px-4 py-4">
      <h2 className="text-sm font-heading font-bold text-white mb-3">Saved Snapshots</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {snapshots.map((snap, idx) => (
          <div key={idx} className="flex-shrink-0 relative group">
            <div className="relative h-32 w-24 rounded-lg overflow-hidden border border-white/10 bg-black">
              <img src={snap.snapshot_url} alt={`Snapshot ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  className="h-8 w-8 bg-[#e8b820] hover:bg-[#d4a017] text-black"
                  onClick={() => onSaveOutfit(snap)}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => onDelete(idx)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}