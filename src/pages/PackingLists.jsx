import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronRight, Luggage, X, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import PackingListDetail from "@/components/packing/PackingListDetail";

export default function PackingLists() {
  const [user, setUser] = useState(null);
  const [lists, setLists] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", destination: "", start_date: "", end_date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const [ls, os] = await Promise.all([
        base44.entities.PackingList.filter({ user_email: u.email }, "-created_date"),
        base44.entities.Outfit.filter({ user_email: u.email }, "-created_date"),
      ]);
      setLists(ls);
      setOutfits(os);
      setLoading(false);
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    setSaving(true);
    const created = await base44.entities.PackingList.create({
      user_email: user.email,
      name: form.name,
      destination: form.destination,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      outfit_ids: [],
    });
    setLists(prev => [created, ...prev]);
    setForm({ name: "", destination: "", start_date: "", end_date: "" });
    setShowCreate(false);
    setSaving(false);
    setSelectedList(created);
  };

  const handleDelete = async (id) => {
    await base44.entities.PackingList.delete(id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (selectedList?.id === id) setSelectedList(null);
  };

  const handleListUpdated = (updated) => {
    setLists(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedList(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/10 border-t-[#e8b820] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white tracking-tight">Packing Lists</h1>
            <p className="text-white/40 font-body text-sm mt-1">Curate outfits for your trips</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-semibold">
            <Plus className="w-4 h-4 mr-1" /> New List
          </Button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#232323] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading font-bold text-white text-xl">New Packing List</h2>
                <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <Input placeholder="List name (e.g. Paris Trip)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30" />
                <Input placeholder="Destination (optional)" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                  className="bg-white/10 border-white/10 text-white placeholder:text-white/30" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-white/40 text-xs font-body mb-1 block">From</label>
                    <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      className="bg-white/10 border-white/10 text-white" />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs font-body mb-1 block">To</label>
                    <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      className="bg-white/10 border-white/10 text-white" />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={saving || !form.name} className="w-full bg-[#e8b820] hover:bg-[#d4a017] text-black font-semibold mt-2">
                  {saving ? "Creating…" : "Create List"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: list of packing lists */}
          <div className="space-y-3">
            {lists.length === 0 ? (
              <div className="text-center py-16">
                <Luggage className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 font-body">No packing lists yet</p>
                <p className="text-white/20 text-sm font-body">Create one to start grouping outfits for a trip</p>
              </div>
            ) : lists.map(list => (
              <div
                key={list.id}
                onClick={() => setSelectedList(list)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${selectedList?.id === list.id ? "border-[#e8b820]/60 bg-[#e8b820]/5" : "border-white/10 bg-white/5 hover:border-white/20"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-white truncate">{list.name}</p>
                    {list.destination && <p className="text-white/50 text-xs font-body mt-0.5">✈️ {list.destination}</p>}
                    {(list.start_date || list.end_date) && (
                      <p className="text-white/30 text-xs font-body mt-0.5">
                        {list.start_date && format(new Date(list.start_date), "MMM d")}
                        {list.start_date && list.end_date && " → "}
                        {list.end_date && format(new Date(list.end_date), "MMM d, yyyy")}
                      </p>
                    )}
                    <p className="text-white/30 text-xs font-body mt-1">{(list.outfit_ids || []).length} outfit{(list.outfit_ids || []).length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <ChevronRight className={`w-4 h-4 transition-colors ${selectedList?.id === list.id ? "text-[#e8b820]" : "text-white/20"}`} />
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }} className="text-white/20 hover:text-red-400 transition p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: detail panel */}
          <div>
            {selectedList ? (
              <PackingListDetail
                list={selectedList}
                outfits={outfits}
                onUpdated={handleListUpdated}
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 flex items-center justify-center h-48">
                <p className="text-white/30 text-sm font-body">Select a list to manage outfits</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}