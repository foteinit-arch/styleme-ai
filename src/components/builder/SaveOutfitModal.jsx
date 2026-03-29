import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Save } from "lucide-react";

const OCCASIONS = ["casual","formal","wedding","party","sport","work","beach","other"];

export default function SaveOutfitModal({ userEmail, placed, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [occasion, setOccasion] = useState("casual");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    const items = placed.map(p => ({
      clothing_item_id: p.id,
      x: p.x,
      y: p.y,
      scale: p.scale,
      rotation: p.rotation,
      z_index: p.z_index,
    }));
    await base44.entities.Outfit.create({
      user_email: userEmail,
      name,
      description,
      occasion,
      is_public: isPublic,
      items,
      likes_count: 0,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">Save Outfit</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <div className="p-5 space-y-4">
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
            <Save className="mr-2 w-4 h-4" /> {saving ? "Saving..." : "Save Outfit"}
          </Button>
        </div>
      </div>
    </div>
  );
}