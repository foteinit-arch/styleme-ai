import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";

const CATEGORIES = ["all", "top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory", "underwear"];

const CATEGORY_LABELS = {
  all: "All",
  top: "Tops",
  bottom: "Bottoms",
  dress: "Dresses",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bag: "Bags",
  accessory: "Accessories",
  underwear: "Underwear",
};

export default function ClothingPicker({ clothes, onPick, pickedIds = [] }) {
  const [cat, setCat]       = useState("all");
  const [search, setSearch] = useState("");

  const filtered = clothes.filter(c =>
    (cat === "all" || c.category === cat) &&
    (!search || (c.name || "").toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-3 flex flex-col h-full">
      <p className="text-sm font-semibold text-white mb-1">Your Clothes</p>
      <p className="text-xs text-white/60 mb-3">Tap an item to add it to your look</p>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 text-sm" />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${
              cat === c
                ? "bg-[#e8b820] text-black"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
        {filtered.map(item => {
          const img = item.processed_image_url || item.original_image_url;
          const isPicked = pickedIds.includes(item.id);
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onPick(item)}
              className={`relative bg-white border rounded-xl overflow-hidden cursor-pointer hover:shadow transition flex flex-col text-left ${
                isPicked ? "border-[#e8b820] ring-2 ring-[#e8b820]" : "border-gray-100 hover:border-[#e8b820]"
              }`}
              title="Tap to add"
            >
              {isPicked && (
                <div className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-[#e8b820] flex items-center justify-center shadow">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
              <div className="h-20 flex items-center justify-center bg-gray-50">
                {img ? (
                  <img src={img} alt={item.name} className="h-full w-full object-contain p-1" />
                ) : <span className="text-3xl">👗</span>}
              </div>
              <p className="text-xs text-gray-600 px-1.5 py-1 truncate font-medium">{item.name}</p>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-400 text-sm">No items found</div>
        )}
      </div>
    </div>
  );
}
