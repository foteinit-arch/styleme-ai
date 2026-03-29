import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const CATEGORIES = ["all", "top", "bottom", "dress", "outerwear", "shoes", "accessory", "bag"];

export default function ClothingPicker({ clothes, onDrop }) {
  const [cat, setCat]       = useState("all");
  const [search, setSearch] = useState("");

  const filtered = clothes.filter(c =>
    (cat === "all" || c.category === cat) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData("clothing_id",   item.id);
    e.dataTransfer.setData("clothing_json", JSON.stringify(item));
  };

  return (
    <div className="p-3 flex flex-col h-full">
      <p className="text-sm font-semibold text-gray-800 mb-1">Your Clothes</p>
      <p className="text-xs text-gray-400 mb-3">Tap or drag items onto your avatar</p>

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
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
        {filtered.map(item => {
          const img = item.processed_image_url || item.original_image_url;
          return (
            <div
              key={item.id}
              draggable
              onDragStart={e => handleDragStart(e, item)}
              onClick={() => onDrop(item)}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing hover:border-[#e8b820] hover:shadow transition flex flex-col"
              title="Tap or drag to add"
            >
              <div className="h-20 flex items-center justify-center bg-gray-50">
                {img ? (
                  <img src={img} alt={item.name} className="h-full w-full object-contain p-1" />
                ) : <span className="text-3xl">👗</span>}
              </div>
              <p className="text-xs text-gray-600 px-1.5 py-1 truncate font-medium">{item.name}</p>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-400 text-sm">No items found</div>
        )}
      </div>
    </div>
  );
}