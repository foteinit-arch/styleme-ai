import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Save, Download, Sparkles } from "lucide-react";

const OCCASIONS = ["casual","formal","wedding","party","sport","work","beach","other"];

export default function SaveOutfitModal({ userEmail, placed, snapshotUrl, editingOutfit, onClose, onSaved }) {
  const [name, setName] = useState(editingOutfit?.name || "");
  const [description, setDescription] = useState(editingOutfit?.description || "");
  const [occasion, setOccasion] = useState(editingOutfit?.occasion || "casual");
  const [isPublic, setIsPublic] = useState(editingOutfit?.is_public || false);
  const [saving, setSaving] = useState(false);
  const [magazineUrl, setMagazineUrl] = useState(null);
  const [generatingMagazine, setGeneratingMagazine] = useState(false);

  const isEditing = !!editingOutfit;

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const items = placed.map(p => ({
        clothing_item_id: p.clothing_item_id || p.id,
        x: p.x,
        y: p.y,
        scale: p.scale,
        rotation: p.rotation,
        z_index: p.z_index,
      }));

      let savedOutfit;
      if (isEditing) {
        // Update existing outfit — keep existing images unless we have new ones
        savedOutfit = await base44.entities.Outfit.update(editingOutfit.id, {
          name,
          description,
          occasion,
          is_public: isPublic,
          items,
          ...(snapshotUrl ? { outfit_snapshot_url: snapshotUrl } : {}),
        });
        setSaving(false);
        onSaved();
        return;
      }

      // Create new outfit
      savedOutfit = await base44.entities.Outfit.create({
        user_email: userEmail,
        name,
        description,
        occasion,
        is_public: isPublic,
        items,
        outfit_snapshot_url: snapshotUrl,
        likes_count: 0,
      });

      setSaving(false);
      onSaved();

      // Generate magazine editorial
      setGeneratingMagazine(true);
      const itemNames = placed.map(p => p.name).filter(Boolean).join(", ");
      const imageUrls = placed.map(p => p.processed_image_url || p.original_image_url).filter(Boolean);
      const prompt = `90s fashion magazine editorial page. Flat lay styling of these clothing items arranged artistically on a white background: ${itemNames}. Style it like a Vogue or Harper's Bazaar editorial spread — items overlapping slightly, styled with attitude, dramatic shadows, magazine typography feeling. High fashion, film grain, editorial lighting.`;
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt,
        existing_image_urls: imageUrls,
      });
      // Save magazine URL to the outfit record
      await base44.entities.Outfit.update(savedOutfit.id, { magazine_url: url });
      setMagazineUrl(url);
      setGeneratingMagazine(false);
    } catch (err) {
      setSaving(false);
      alert("Error saving outfit: " + (err.message || "Unknown error"));
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = magazineUrl;
    a.download = "editorial.png";
    a.target = "_blank";
    a.click();
  };

  if (generatingMagazine || magazineUrl) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
        style={{
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {generatingMagazine ? (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[#e8b820] animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#e8b820]" />
            </div>
            <p className="text-white/70 font-body text-lg tracking-wide">Creating your editorial…</p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div
              className="flex items-center justify-between px-5 py-3 bg-black/80 border-b border-white/10"
              style={{
                paddingTop: 'calc(0.75rem + env(safe-area-inset-top))',
                paddingLeft: 'calc(1.25rem + env(safe-area-inset-left))',
                paddingRight: 'calc(1.25rem + env(safe-area-inset-right))',
              }}
            >
              <span className="text-white font-heading font-bold text-lg tracking-tight">Your Editorial</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleDownload} className="bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold">
                  <Download className="w-4 h-4 mr-1" /> Download
                </Button>
                <Button size="sm" variant="ghost" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div
              className="flex-1 flex items-center justify-center p-4 overflow-auto"
              style={{
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
                paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
                paddingRight: 'calc(1rem + env(safe-area-inset-right))',
              }}
            >
              <img src={magazineUrl} alt="Magazine editorial" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right))',
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? "Edit Outfit" : "Save Outfit"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <div
          className="p-5 space-y-4 overflow-y-auto"
          style={{
            maxHeight: 'calc(85dvh - 4rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
          }}
        >
          <div>
            <Label>Outfit Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer wedding look" className="mt-1" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes about this outfit..." className="mt-1" />
          </div>
          <div>
            <Label>Occasion</Label>
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OCCASIONS.map(o => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm text-gray-800">Share with community</p>
              <p className="text-xs text-gray-400">Others can see and like your outfit</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button onClick={handleSave} disabled={saving || !name} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            <Save className="mr-2 w-4 h-4" /> {saving ? "Saving..." : isEditing ? "Update Outfit" : "Save Outfit"}
          </Button>
        </div>
      </div>
    </div>
  );
}