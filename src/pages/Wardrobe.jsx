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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wardrobe</h1>
            <p className="text-gray-400 mt-1">{items.length} items in your closet</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("OutfitBuilder")}>
              <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
                Try On →
              </Button>
            </Link>
            <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="mr-2 w-4 h-4" /> Add Clothing
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="pl-9" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
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
              <div key={i} className="bg-white rounded-2xl h-52 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">👗</p>
            <p className="text-gray-500 text-lg">Your wardrobe is empty</p>
            <p className="text-gray-400 text-sm mb-6">Add your first clothing item to get started</p>
            <Button onClick={() => setShowAdd(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
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
