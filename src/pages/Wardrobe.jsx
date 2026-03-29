import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter } from "lucide-react";
import ClothingCard from "@/components/wardrobe/ClothingCard";
import AddClothingModal from "@/components/wardrobe/AddClothingModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CATEGORIES = ["all", "top", "bottom", "dress", "outerwear", "shoes", "accessory", "underwear", "bag"];

export default function Wardrobe() {
  const [user, setUser]         = useState(null);
  const [items, setItems]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch]     = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      loadItems(u.email);
    }).catch(() => base44.auth.redirectToLogin(window.location.href));
  }, []);

  const loadItems = async (email) => {
    setLoading(true);
    const all = await base44.entities.ClothingItem.filter({ user_email: email }, "-created_date");
    setItems(all);
    setLoading(false);
  };

  useEffect(() => {
    let result = items;
    if (category !== "all") result = result.filter(i => i.category === category);
    if (search) result = result.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [items, category, search]);

  const handleAdded = (item) => { setItems(prev => [item, ...prev]); setShowAdd(false); };
  const handleDelete = async (id) => {
    await base44.entities.ClothingItem.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-white tracking-tight">My wardrobe</h1>
            <p className="text-white/50 mt-1 font-body">{items.length} items in your closet</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("OutfitBuilder")}>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">
                Try On →
              </Button>
            </Link>
            <Button onClick={() => setShowAdd(true)} className="bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-semibold">
              <Plus className="mr-2 w-4 h-4" /> Add Clothing
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-9 bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-yellow-300" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40 bg-white/10 border-white/10 text-white">
              <Filter className="mr-2 w-4 h-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="bg-white/10 rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">👗</p>
            <p className="text-white/60 text-lg">Your wardrobe is empty</p>
            <p className="text-white/30 text-sm mb-6">Add your first clothing item to get started</p>
            <Button onClick={() => setShowAdd(true)} className="bg-[#d4a017] hover:bg-[#c09010] text-[#373d47] font-semibold">
              <Plus className="mr-2 w-4 h-4" /> Add Clothing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(item => (
              <ClothingCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showAdd && user && (
        <AddClothingModal userEmail={user.email} onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}
    </div>
  );
}